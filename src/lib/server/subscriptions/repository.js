import 'server-only';

import {
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
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
          'REMOVE subscription_checkout_lock, subscription_checkout_lock_expires_at',
        ConditionExpression: 'subscription_checkout_lock = :lock',
        ExpressionAttributeValues: { ':lock': { S: lockId } },
      })
    );
  } catch (error) {
    if (error?.name !== 'ConditionalCheckFailedException') throw error;
  }
}

export async function saveSubscriptionProjection(shopId, projection) {
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

  if (projection.currentPeriodEnd) {
    updateExpression += ', subscription_current_period_end = :periodEnd';
    values[':periodEnd'] = { N: String(projection.currentPeriodEnd) };
  } else {
    updateExpression += ' REMOVE subscription_current_period_end';
  }

  updateExpression +=
    ', subscription_checkout_lock, subscription_checkout_lock_expires_at, subscription_checkout_session_id';

  await getDynamo().send(
    new UpdateItemCommand({
      TableName: SHOPS_TABLE,
      Key: { shop_id: { S: String(shopId) } },
      UpdateExpression: updateExpression,
      ConditionExpression:
        'attribute_exists(shop_id) AND (attribute_not_exists(StripeCustomerID) OR StripeCustomerID = :customer) AND (attribute_not_exists(subscription_created_at) OR subscription_id = :subscription OR subscription_created_at <= :subscriptionCreated)',
      ExpressionAttributeValues: values,
    })
  );
}

export async function acquireWebhookEvent(event) {
  const now = Math.floor(Date.now() / 1000);
  try {
    await getDynamo().send(
      new PutItemCommand({
        TableName: WEBHOOK_EVENTS_TABLE,
        Item: {
          event_id: { S: event.id },
          event_type: { S: event.type },
          stripe_created_at: { N: String(event.created || now) },
          received_at: { N: String(now) },
          expires_at: { N: String(now + 90 * 24 * 60 * 60) },
          processing_status: { S: 'processing' },
        },
        ConditionExpression: 'attribute_not_exists(event_id)',
      })
    );
    return true;
  } catch (error) {
    if (error?.name === 'ConditionalCheckFailedException') return false;
    throw error;
  }
}

export async function completeWebhookEvent(eventId) {
  await getDynamo().send(
    new UpdateItemCommand({
      TableName: WEBHOOK_EVENTS_TABLE,
      Key: { event_id: { S: eventId } },
      UpdateExpression: 'SET processing_status = :complete, completed_at = :completed',
      ExpressionAttributeValues: {
        ':complete': { S: 'complete' },
        ':completed': { N: String(Math.floor(Date.now() / 1000)) },
      },
    })
  );
}

export async function releaseWebhookEvent(eventId) {
  await getDynamo().send(
    new DeleteItemCommand({
      TableName: WEBHOOK_EVENTS_TABLE,
      Key: { event_id: { S: eventId } },
    })
  );
}
