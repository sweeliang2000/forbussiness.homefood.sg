import 'server-only';

import { GetItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

import { getDynamo } from './aws';
import { COOKIE_NAMES } from './cookies';
import { AppError, createValidationError, createDatabaseError } from './errors';

/**
 * Release-state resolution, ported from Authentication.js:7322-7461
 * (`checkReleaseStatus`).
 *
 * A shop's release state isn't stored in one place — it's derived by probing
 * four DynamoDB tables in priority order:
 *
 *   review_customer_release            -> "pending"
 *   Rejected_Customer_Review           -> "reject"
 *   Scheduled_Accepted_Customer_Review -> "approved_scheduled"
 *   ReleaseHistory (latest row)        -> from its review_status
 *   nothing anywhere                   -> "no records"
 *
 * Twelve handlers read the result off `req`, so this keeps mutating `req` rather
 * than returning a value — that's what makes the ported controllers work
 * unchanged.
 */
export async function applyReleaseStatus(req) {
  const cookie = req.cookies[COOKIE_NAMES.USER_DATA_HTTP];
  if (!cookie) {
    throw createValidationError('Missing userDataHTTP cookie');
  }

  let userData;
  try {
    userData = JSON.parse(cookie);
  } catch {
    throw createValidationError('Invalid cookie data');
  }

  const shop_id = userData.shop_id;
  req.shop_id = shop_id;

  try {
    const { Item } = await getDynamo().send(
      new GetItemCommand({
        TableName: 'review_customer_release',
        Key: { shop_id: { S: shop_id } },
      })
    );

    if (!Item) {
      const { Item: rejectedItem } = await getDynamo().send(
        new GetItemCommand({
          TableName: 'Rejected_Customer_Review',
          Key: { shop_id: { S: shop_id } },
        })
      );

      if (rejectedItem) {
        const rejectionData = unmarshall(rejectedItem);
        req.releaseStatus = 'reject';
        req.rejected_at = rejectionData.rejected_at || null;
        req.sentdatetime = rejectionData.sentdatetime || null;
        req.reason = rejectionData.reason || null;
        return;
      }

      const { Item: scheduledItem } = await getDynamo().send(
        new GetItemCommand({
          TableName: 'Scheduled_Accepted_Customer_Review',
          Key: { shop_id: { S: shop_id } },
        })
      );

      if (scheduledItem) {
        const scheduledData = unmarshall(scheduledItem);
        req.releaseStatus = 'approved_scheduled';
        req.sentdatetime = scheduledData.sentdatetime || null;
        return;
      }
    }

    if (Item) {
      const releaseData = unmarshall(Item);
      req.releaseStatus = 'pending';
      req.sentdatetime = releaseData.sentdatetime || null;
      return;
    }

    // Nothing in flight — fall back to the most recent history row.
    const trimmedShopId = shop_id.trim();
    const historyParams = {
      TableName: 'ReleaseHistory',
      KeyConditionExpression: 'shop_id = :shopId',
      ExpressionAttributeValues: { ':shopId': { S: trimmedShopId } },
      ScanIndexForward: false, // newest first, by the `datetime` sort key
      Limit: 1,
    };

    let historyResult = await getDynamo().send(new QueryCommand(historyParams));

    // Some historical rows were written with trailing newlines in the key.
    if (!historyResult.Items?.length) {
      historyParams.ExpressionAttributeValues[':shopId'] = { S: `${trimmedShopId}\n\n\n` };
      historyResult = await getDynamo().send(new QueryCommand(historyParams));
    }

    if (!historyResult.Items?.length) {
      req.releaseStatus = 'no records';
      return;
    }

    const historyData = unmarshall(historyResult.Items[0]);
    const reviewStatus = historyData.review_status || null;

    if (reviewStatus === 'rejected' || reviewStatus === 'reject') {
      req.releaseStatus = 'reject';
      req.rejected_at = historyData.rejected_at || null;
      req.sentdatetime = historyData.sentdatetime || historyData.datetime || null;
      req.reason = historyData.reason || null;
    } else if (reviewStatus === 'pending') {
      req.releaseStatus = 'pending';
      req.sentdatetime = historyData.sentdatetime || historyData.datetime || null;
    } else if (reviewStatus === 'cancelled') {
      req.releaseStatus = 'scheduled_released_cancelled';
      req.sentdatetime = historyData.datetime || historyData.sentdatetime || null;
    } else {
      // Any other review_status (including null) means it went live.
      req.releaseStatus = 'Released';
      req.sentdatetime = historyData.datetime || historyData.sentdatetime || null;
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('Error checking release status:', error);
    throw createDatabaseError('check release status', error, 'applyReleaseStatus');
  }
}
