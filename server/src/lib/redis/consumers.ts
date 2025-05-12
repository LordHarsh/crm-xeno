import { getRedisClient } from '../../loaders/redis';

// Stream names
const CUSTOMER_STREAM = 'customer-events';
const ORDER_STREAM = 'order-events';
const COMMUNICATION_STREAM = 'communication-events';

async function publishToCustomerStream(customerData, operation = 'create') {
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

async function publishToOrderStream(orderData, operation = 'create') {
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

async function publishToCommunicationStream(communicationData, operation = 'create') {
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

module.exports = {
  CUSTOMER_STREAM,
  ORDER_STREAM,
  COMMUNICATION_STREAM,
  publishToCustomerStream,
  publishToOrderStream,
  publishToCommunicationStream
};