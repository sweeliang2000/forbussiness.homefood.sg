import 'server-only';

import { GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

import { getDynamo } from '../aws';

const SHOPS_TABLE = process.env.SHOPS_TABLE || 'Shops';
const WEBHOOK_EVENTS_TABLE =
  process.env.STRIPE_WEBHOOK_EVENTS_TABLE || 'StripeWebhookEvents';

export async function getShop(shopId) {
  const { Item } = await getDynamo().send(
    new GetItemCommand({
      TableName: SHOPS_TABLE,
      Key: { shop_id: { S: String(shopId) } },
      ConsistentRead: true,
    })
  );
  return Item ? unmarshall(Item) : null;
}

export async function hasProEntitlement(shopId) {
  const shop = await getShop(shopId);
  return (
    Boolean(shop?.subscription_entitled) &&
    ['active', 'trialing'].includes(shop?.subscription_status)
  );
}

export async function saveStripeCustomer(shopId, customerId) {
  await getDynamo().send(
    new UpdateItemCommand({
      TableName: SHOPS_TABLE,
      Key: { shop_id: { S: String(shopId) } },
      UpdateExpression: 'SET StripeCustomerID = if_not_exists(StripeCustomerID, :customer)',
      ConditionExpression:
        'attribute_exists(shop_id) AND (attribute_not_exists(StripeCustomerID) OR StripeCustomerID = :customer)',
      ExpressionAttributeValues: { ':customer': { S: String(customerId) } },
    })
  );
}

export async function acquireCheckoutLock(shopId, lockId, expiresAt) {
  try {
    await getDynamo().send(
      new UpdateItemCommand({
        TableName: SHOPS_TABLE,
        Key: { shop_id: { S: String(shopId) } },
        UpdateExpression:
          'SET subscription_checkout_lock = :lock, subscription_checkout_lock_expires_at = :expires',
        ConditionExpression:
          'attribute_exists(shop_id) AND (attribute_not_exists(subscription_checkout_lock_expires_at) OR subscription_checkout_lock_expires_at < :now)',
        ExpressionAttributeValues: {
          ':lock': { S: lockId },
          ':expires': { N: String(expiresAt) },
          ':now': { N: String(Math.floor(Date.now() / 1000)) },
        },
      })
    );
    return true;
  } catch (error) {
    if (error?.name === 'ConditionalCheckFailedException') return false;
    throw error;
  }
}

export async function attachCheckoutSession(shopId, lockId, sessionId) {
  await getDynamo().send(
    new UpdateItemCommand({
      TableName: SHOPS_TABLE,
      Key: { shop_id: { S: String(shopId) } },
      UpdateExpression: 'SET subscription_checkout_session_id = :session',
      ConditionExpression: 'subscription_checkout_lock = :lock',
      ExpressionAttributeValues: {
        ':lock': { S: lockId },
        ':session': { S: String(sessionId) },
      },
    })
  );
}

export async function releaseCheckoutLock(shopId, lockId) {
  try {
    await getDynamo().send(
      new UpdateItemCommand({
        TableName: SHOPS_TABLE,
        Key: { shop_id: { S: String(shopId) } },
        UpdateExpression:
          'REMOVE subscription_checkout_lock, subscription_checkout_lock_expires_at, subscription_checkout_session_id',
        ConditionExpression: 'subscription_checkout_lock = :lock',
        ExpressionAttributeValues: { ':lock': { S: lockId } },
      })
    );
  } catch (error) {
    if (error?.name !== 'ConditionalCheckFailedException') throw error;
  }
}

/**
 * Releases only the lock that belongs to a particular Checkout Session. This
 * condition prevents a delayed expiration webhook from clearing a newer
 * checkout that the merchant has already started.
 */
export async function releaseCheckoutSession(shopId, sessionId) {
  try {
    await getDynamo().send(
      new UpdateItemCommand({
        TableName: SHOPS_TABLE,
        Key: { shop_id: { S: String(shopId) } },
        UpdateExpression:
          'REMOVE subscription_checkout_lock, subscription_checkout_lock_expires_at, subscription_checkout_session_id',
        ConditionExpression: 'subscription_checkout_session_id = :session',
        ExpressionAttributeValues: { ':session': { S: String(sessionId) } },
      })
    );
  } catch (error) {
    if (error?.name !== 'ConditionalCheckFailedException') throw error;
  }
}

/**
 * Writes the subscription projection onto the shop row.
 *
 * Returns `{ written: true }`, or `{ written: false, shop }` when the guard
 * conditions rejected the write — a condition failure is not necessarily an
 * error (a concurrent handler may simply have written newer state), so the
 * caller gets the current row and decides. Throwing here made every rejection
 * look like a transient fault and retry until Stripe gave up.
 *
 * @param {object}  options
 * @param {boolean} options.adoptCustomer  allow the write to reassign
 *   StripeCustomerID. Only for a stored customer proven gone from Stripe;
 *   otherwise the guard is what stops one shop's row being overwritten by a
 *   subscription that belongs to another customer.
 */
export async function saveSubscriptionProjection(shopId, projection, { adoptCustomer = false } = {}) {
  const values = {
    ':customer': { S: projection.customerId },
    ':subscription': { S: projection.subscriptionId },
    ':subscriptionCreated': { N: String(projection.subscriptionCreatedAt) },
    ':plan': { S: projection.planKey },
    ':lookup': { S: projection.lookupKey },
    ':status': { S: projection.status },
    ':entitled': { BOOL: projection.entitled },
    ':cancelAtEnd': { BOOL: projection.cancelAtPeriodEnd },
    ':updated': { N: String(projection.updatedAt) },
  };

  let updateExpression =
    'SET StripeCustomerID = :customer, subscription_id = :subscription, subscription_created_at = :subscriptionCreated, subscription_plan_key = :plan, lookup_key = :lookup, SubscriptionStatus = :status, StripeCustomerSubscriptionStatus = :status, subscription_status = :status, subscription_entitled = :entitled, subscription_cancel_at_period_end = :cancelAtEnd, subscription_updated_at = :updated';

  const attributesToRemove = [
    'subscription_checkout_lock',
    'subscription_checkout_lock_expires_at',
    'subscription_checkout_session_id',
  ];

  if (projection.currentPeriodEnd) {
    updateExpression += ', subscription_current_period_end = :periodEnd';
    values[':periodEnd'] = { N: String(projection.currentPeriodEnd) };
  } else {
    attributesToRemove.unshift('subscription_current_period_end');
  }

  updateExpression += ` REMOVE ${attributesToRemove.join(', ')}`;

  const guards = ['attribute_exists(shop_id)'];
  if (!adoptCustomer) {
    guards.push('(attribute_not_exists(StripeCustomerID) OR StripeCustomerID = :customer)');
  }
  guards.push(
    '(attribute_not_exists(subscription_created_at) OR subscription_id = :subscription OR subscription_created_at <= :subscriptionCreated)'
  );
  // Stripe delivers events in parallel, so two handlers can each retrieve the
  // subscription and race to write. Without this the one that read older state
  // can land last and leave a stale status persisted.
  guards.push(
    '(attribute_not_exists(subscription_updated_at) OR subscription_updated_at <= :updated)'
  );

  try {
    await getDynamo().send(
      new UpdateItemCommand({
        TableName: SHOPS_TABLE,
        Key: { shop_id: { S: String(shopId) } },
        UpdateExpression: updateExpression,
        ConditionExpression: guards.join(' AND '),
        ExpressionAttributeValues: values,
      })
    );
    return { written: true, shop: null };
  } catch (error) {
    if (error?.name !== 'ConditionalCheckFailedException') throw error;
    return { written: false, shop: await getShop(shopId) };
  }
}

export const WEBHOOK_STATUS = Object.freeze({
  PROCESSING: 'processing',
  COMPLETE: 'complete',
  FAILED_TRANSIENT: 'failed_transient',
  FAILED_PERMANENT: 'failed_permanent',
});

const WEBHOOK_LEDGER_TTL_SECONDS = 90 * 24 * 60 * 60;

// Long enough to cover the slowest legitimate handler (a Stripe retrieve plus
// a DynamoDB write), short enough that Stripe's next retry can reclaim a row
// abandoned by a crash rather than being answered as a duplicate.
const WEBHOOK_LEASE_SECONDS = 5 * 60;

// Errors are stored for humans to read; a runaway stack would otherwise push
// the item toward DynamoDB's 400KB limit and fail the write that records it.
const MAX_LEDGER_ERROR_CHARS = 1000;

/**
 * Claims an event for processing, as a lease rather than a permanent tombstone.
 *
 * The row is claimable when it is new, when a previous attempt failed
 * transiently, or when a previous attempt's lease has expired. That last case
 * is what makes a crash recoverable: the old implementation wrote the row
 * before doing the work and only removed it in a `catch`, so any failure that
 * skipped the `catch` — a crash, a timeout, a container recycle, or the
 * swallowed error on the cleanup path itself — left a row that answered every
 * subsequent Stripe retry as a duplicate and dropped the event for good.
 */
export async function acquireWebhookEvent(event, { leaseSeconds = WEBHOOK_LEASE_SECONDS } = {}) {
  const now = Math.floor(Date.now() / 1000);
  try {
    const { Attributes } = await getDynamo().send(
      new UpdateItemCommand({
        TableName: WEBHOOK_EVENTS_TABLE,
        Key: { event_id: { S: event.id } },
        UpdateExpression:
          'SET event_type = :type, stripe_created_at = :stripeCreated, livemode = :livemode, ' +
          'first_received_at = if_not_exists(first_received_at, :now), received_at = :now, ' +
          'expires_at = :expires, processing_status = :processing, lease_expires_at = :lease ' +
          'ADD #attempts :one',
        // attribute_not_exists(lease_expires_at) also reclaims rows written by
        // the previous implementation, which never recorded a lease.
        ConditionExpression:
          'attribute_not_exists(event_id) OR processing_status = :transient OR ' +
          '(processing_status = :processing AND ' +
          '(attribute_not_exists(lease_expires_at) OR lease_expires_at < :now))',
        ExpressionAttributeNames: { '#attempts': 'attempts' },
        ExpressionAttributeValues: {
          ':type': { S: event.type },
          ':stripeCreated': { N: String(event.created || now) },
          ':livemode': { BOOL: Boolean(event.livemode) },
          ':now': { N: String(now) },
          ':expires': { N: String(now + WEBHOOK_LEDGER_TTL_SECONDS) },
          ':processing': { S: WEBHOOK_STATUS.PROCESSING },
          ':transient': { S: WEBHOOK_STATUS.FAILED_TRANSIENT },
          ':lease': { N: String(now + leaseSeconds) },
          ':one': { N: '1' },
        },
        ReturnValues: 'ALL_NEW',
      })
    );
    return { acquired: true, attempts: Number(Attributes?.attempts?.N || 1) };
  } catch (error) {
    if (error?.name === 'ConditionalCheckFailedException') {
      return { acquired: false, attempts: 0 };
    }
    throw error;
  }
}

export async function completeWebhookEvent(eventId, { shopId = null } = {}) {
  const values = {
    ':complete': { S: WEBHOOK_STATUS.COMPLETE },
    ':completed': { N: String(Math.floor(Date.now() / 1000)) },
  };
  let updateExpression = 'SET processing_status = :complete, completed_at = :completed';

  if (shopId) {
    updateExpression += ', shop_id = :shopId';
    values[':shopId'] = { S: String(shopId) };
  }

  // Clearing the lease and any earlier error keeps a row that eventually
  // succeeded from reading as a live failure.
  updateExpression += ' REMOVE lease_expires_at, last_error, last_error_at';

  await getDynamo().send(
    new UpdateItemCommand({
      TableName: WEBHOOK_EVENTS_TABLE,
      Key: { event_id: { S: eventId } },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: values,
    })
  );
}

/**
 * Records why an event failed, replacing the delete that used to erase all
 * trace of it. `permanent` decides whether a later delivery may reclaim the
 * row: a transient failure should be retried, a permanent one needs a human.
 */
export async function failWebhookEvent(eventId, { permanent = false, message = '', shopId = null } = {}) {
  const values = {
    ':status': {
      S: permanent ? WEBHOOK_STATUS.FAILED_PERMANENT : WEBHOOK_STATUS.FAILED_TRANSIENT,
    },
    ':error': { S: String(message || 'Unknown error').slice(0, MAX_LEDGER_ERROR_CHARS) },
    ':failedAt': { N: String(Math.floor(Date.now() / 1000)) },
  };
  let updateExpression =
    'SET processing_status = :status, last_error = :error, last_error_at = :failedAt';

  if (shopId) {
    updateExpression += ', shop_id = :shopId';
    values[':shopId'] = { S: String(shopId) };
  }

  // Dropping the lease lets a transient failure be reclaimed immediately
  // rather than waiting it out.
  updateExpression += ' REMOVE lease_expires_at';

  await getDynamo().send(
    new UpdateItemCommand({
      TableName: WEBHOOK_EVENTS_TABLE,
      Key: { event_id: { S: eventId } },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: values,
    })
  );
}
