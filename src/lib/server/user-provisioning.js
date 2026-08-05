import 'server-only';

import { GetItemCommand, TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { v4 as uuidv4 } from 'uuid';

import { getDynamo } from './aws';
import { USERS_TABLE } from './env';

const SHOPS_TABLE = 'Shops';

const toUserId = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export async function lookupUser(userId) {
  if (!userId) return null;

  const normalizedUserId = toUserId(userId);
  let response = await getDynamo().send(
    new GetItemCommand({
      TableName: USERS_TABLE,
      Key: { user_id: { S: normalizedUserId } },
    })
  );

  // Tolerate rows created before user IDs were normalized.
  if (!response.Item && userId !== normalizedUserId) {
    response = await getDynamo().send(
      new GetItemCommand({
        TableName: USERS_TABLE,
        Key: { user_id: { S: userId } },
      })
    );
  }

  return response.Item ? unmarshall(response.Item) : null;
}

/**
 * Ensure a Cognito identity has the app-level owner and shop records required
 * by every authenticated page. The transaction makes first-login provisioning
 * atomic, while the follow-up lookup makes concurrent requests idempotent.
 */
export async function ensureUserProvisioned(userId) {
  const normalizedUserId = toUserId(userId);
  if (!normalizedUserId) {
    throw new Error('A user ID is required to provision the account');
  }

  const existingUser = await lookupUser(normalizedUserId);
  if (existingUser) return existingUser;

  const shopId = uuidv4();
  const user = {
    user_id: normalizedUserId,
    shop_id: shopId,
    role: 'Owner',
  };

  try {
    await getDynamo().send(
      new TransactWriteItemsCommand({
        TransactItems: [
          {
            Put: {
              TableName: USERS_TABLE,
              Item: {
                user_id: { S: user.user_id },
                shop_id: { S: user.shop_id },
                role: { S: user.role },
              },
              ConditionExpression: 'attribute_not_exists(user_id)',
            },
          },
          {
            Put: {
              TableName: SHOPS_TABLE,
              Item: {
                shop_id: { S: user.shop_id },
                NumberOfUsers: { N: '1' },
                SubscriptionStatus: { S: 'NO' },
              },
              ConditionExpression: 'attribute_not_exists(shop_id)',
            },
          },
        ],
      })
    );
    return user;
  } catch (error) {
    // Two first requests can race. If another request completed provisioning,
    // use its records instead of surfacing a transaction cancellation.
    const racedUser = await lookupUser(normalizedUserId);
    if (racedUser) return racedUser;
    throw error;
  }
}
