import { getRedisClient } from '../../loaders/redis';


// Stream names
export const CUSTOMER_STREAM = 'customer-events';
export const ORDER_STREAM = 'order-events';
export const COMMUNICATION_STREAM = 'communication-events';

export async function publishToCustomerStream(customerData, operation = 'create') {
  const client = getRedisClient();

  const message = {
    operation,
    timestamp: Date.now(),
    data: customerData
  };

  const messageId = await client.xAdd(
    CUSTOMER_STREAM,
    '*', // Auto-generate ID
    { payload: JSON.stringify(message) }
  );

  console.log(`Published to customer stream: ${messageId}`);
  return messageId;
}

export async function publishToOrderStream(orderData, operation = 'create') {
  const client = getRedisClient();

  const message = {
    operation,
    timestamp: Date.now(),
    data: orderData
  };

  const messageId = await client.xAdd(
    ORDER_STREAM,
    '*',
    { payload: JSON.stringify(message) }
  );

  console.log(`Published to order stream: ${messageId}`);
  return messageId;
}

export async function publishToCommunicationStream(communicationData, operation = 'create') {
  const client = getRedisClient();

  const message = {
    operation,
    timestamp: Date.now(),
    data: communicationData
  };

  const messageId = await client.xAdd(
    COMMUNICATION_STREAM,
    '*',
    { payload: JSON.stringify(message) }
  );

  console.log(`Published to communication stream: ${messageId}`);
  return messageId;
}
