/**
 * PORTED from the Express backend: commonFunctions.js
 *
 * Converted CommonJS -> ESM. Handler bodies are otherwise unchanged: they still
 * take (req, res) and still read req.cookies / req.body / req.files, which the
 * express-adapter shim supplies. Do not "modernise" them in place — the value of
 * this file is that it is diffable against the original.
 */

import {
  UpdateItemCommand,
  PutItemCommand,
  GetItemCommand,
} from '@aws-sdk/client-dynamodb';

import { getDynamo } from '../aws';

const client = { send: (command) => getDynamo().send(command) };

async function updateItem(tableName, key, customerID, lookup_key, subscriptionId, newField = "SubscriptionStatus", newValue = "NO") {
  try {
    const params = {
      TableName: tableName,
      Key: {
        shop_id: { S: key }, // Primary key (shop_id)
      },
      UpdateExpression: `SET StripeCustomerID = :customerID, lookup_key = :lookupKey, subscription_id = :subscriptionId, ${newField} = :newValue`,
      ExpressionAttributeValues: {
        ':customerID': { S: customerID }, // Updated to match naming convention
        ':lookupKey': { S: lookup_key },  // Corrected key name
        ':subscriptionId': { S: subscriptionId }, // Adding subscriptionId to the update
        ':newValue': { S: newValue },
      },
    };

    const command = new UpdateItemCommand(params);
    const data = await client.send(command);
    console.log("Update successful:", data);
    return data;
  } catch (error) {
    console.error("Error updating item:", error);
    throw error;
  }
}




  async function getStripeID(shop_id) {
    try {
      const params = {
        TableName: "Shops",
        Key: {
          shop_id: { S: shop_id }
        },
        ProjectionExpression: "StripeCustomerID"  // Use exact casing
      };
  
      const command = new GetItemCommand(params);
      const data = await client.send(command);
  
      if (!data.Item || !data.Item.StripeCustomerID) {
        console.log("Customer ID not found in item.");
        return null;
      }
  
      console.log("Successfully retrieved StripeCustomerID:", data.Item.StripeCustomerID.S);
      return data.Item.StripeCustomerID.S;
    } catch (error) {
      console.error("Error retrieving StripeCustomerID:", error);
      return null;
    }
  }


  async function putInvoiceItem(shop_id, invoice) {
    try {
      const firstLineItem = invoice?.lines?.data?.[0] || {};
      const periodStart = firstLineItem?.period?.start ?? 0;
      const periodEnd = firstLineItem?.period?.end ?? 0;
      const description = firstLineItem?.description ?? "N/A";
  
      const params = {
        TableName: "Stripe-Invoices",
        Item: {
          shop_id: { S: shop_id ?? "N/A" },
          invoice_id: { S: invoice.id ?? "N/A" },
          customer_id: { S: invoice.customer ?? "N/A" },
          subscription_id: { S: invoice.subscription ?? "N/A" },
          payment_intent: { S: invoice.payment_intent ?? "N/A" },
          status: { S: invoice.status ?? "N/A" },
          amount_paid: { N: (invoice.amount_paid ?? 0).toString() },
          currency: { S: invoice.currency ?? "usd" },
          created_at: { N: (invoice.created ?? 0).toString() },
          period_start: { N: periodStart.toString() },
          period_end: { N: periodEnd.toString() },
          description: { S: description },
          hosted_invoice_url: { S: invoice.hosted_invoice_url ?? "N/A" }
        }
      };
  
      const command = new PutItemCommand(params);
      const data = await client.send(command);
      console.log("Invoice saved successfully:", data);
    } catch (error) {
      console.error("Error saving invoice:", error);
    }
  }
  async function updateCustomerSubscriptionStatus(shop_id, status) {
    const params = {
      TableName: "Shops",
      Key: {
        shop_id: { S: shop_id },
      },
      UpdateExpression: "SET StripeCustomerSubscriptionStatus = :status",
      ExpressionAttributeValues: {
        ":status": { S: status },
      },
    };
  
    try {
      const command = new UpdateItemCommand(params);
      const data = await client.send(command);
      console.log(`Successfully updated subscription status for shop ${shop_id} to "${status}".`);
      return data;
    } catch (error) {
      console.error(`Failed to update subscription status for shop ${shop_id}:`, error);
      throw error;
    }
  }

  async function getPaymentFailedEmailSent(invoiceId) {
    if (!invoiceId) return false;
    try {
      const { Item } = await client.send(new GetItemCommand({
        TableName: 'payment_failed_emails_sent',
        Key: { invoice_id: { S: String(invoiceId) } },
      }));
      return !!Item;
    } catch (err) {
      if (err.name === 'ResourceNotFoundException' || err.message?.includes('Requested resource not found')) {
        console.error('getPaymentFailedEmailSent: DynamoDB table "payment_failed_emails_sent" does not exist. Create it with partition key invoice_id (String).');
      } else {
        console.error('getPaymentFailedEmailSent:', err.message);
      }
      return false;
    }
  }

  async function setPaymentFailedEmailSent(invoiceId) {
    if (!invoiceId) return;
    try {
      await client.send(new PutItemCommand({
        TableName: 'payment_failed_emails_sent',
        Item: {
          invoice_id: { S: String(invoiceId) },
          sent_at: { N: String(Date.now()) },
        },
      }));
    } catch (err) {
      if (err.name === 'ResourceNotFoundException' || err.message?.includes('Requested resource not found')) {
        console.error('setPaymentFailedEmailSent: DynamoDB table "payment_failed_emails_sent" does not exist. Create it with partition key invoice_id (String).');
      } else {
        console.error('setPaymentFailedEmailSent:', err.message);
      }
    }
  }

  async function setShopUpgradePaymentStatus(shop_id, status) {
    if (!shop_id) return;
    try {
      await client.send(new UpdateItemCommand({
        TableName: 'Shops',
        Key: { shop_id: { S: String(shop_id) } },
        UpdateExpression: 'SET LastUpgradePaymentStatus = :s',
        ExpressionAttributeValues: { ':s': { S: String(status) } },
      }));
    } catch (err) {
      console.error('setShopUpgradePaymentStatus:', err?.message || err);
    }
  }

  async function getShopUpgradePaymentStatus(shop_id) {
    if (!shop_id) return null;
    try {
      const { Item } = await client.send(new GetItemCommand({
        TableName: 'Shops',
        Key: { shop_id: { S: String(shop_id) } },
        ProjectionExpression: 'LastUpgradePaymentStatus',
      }));
      return Item?.LastUpgradePaymentStatus?.S ?? null;
    } catch (err) {
      console.error('getShopUpgradePaymentStatus:', err?.message || err);
      return null;
    }
  }

export { updateItem, getStripeID, putInvoiceItem, updateCustomerSubscriptionStatus, getPaymentFailedEmailSent, setPaymentFailedEmailSent, setShopUpgradePaymentStatus, getShopUpgradePaymentStatus };

