// redis/consumers.js
import { ObjectId } from 'mongodb';
import { getRedisClient } from '../../loaders/redis';
import database from '../../loaders/database';
import { CUSTOMER_STREAM, ORDER_STREAM, COMMUNICATION_STREAM } from './publishers';
import logger from '../../loaders/logger';

// Consumer group names
const CUSTOMER_GROUP = 'customer-processors';
const ORDER_GROUP = 'order-processors';
const COMMUNICATION_GROUP = 'communication-processors';

// Consumer names (useful for multiple instances)
const consumerName = `consumer-${process.pid}`;

async function setupConsumerGroups() {
  const client = getRedisClient();

  // Create consumer groups if they don't exist
  try {
    await client.xGroupCreate(CUSTOMER_STREAM, CUSTOMER_GROUP, '0', { MKSTREAM: true });
    logger.info(`Created consumer group ${CUSTOMER_GROUP}`);
  } catch (error) {
    if (error.message.includes('BUSYGROUP')) {
      logger.info(`Consumer group ${CUSTOMER_GROUP} already exists`);
    } else {
      throw error;
    }
  }
  try {
    await client.xGroupCreate(ORDER_STREAM, ORDER_GROUP, '0', { MKSTREAM: true });
    logger.info(`Created consumer group ${ORDER_GROUP}`);
  } catch (error) {
    if (error.message.includes('BUSYGROUP')) {
      logger.info(`Consumer group ${ORDER_GROUP} already exists`);
    } else {
      throw error;
    }
  }
  try {
    await client.xGroupCreate(COMMUNICATION_STREAM, COMMUNICATION_GROUP, '0', { MKSTREAM: true });
    logger.info(`Created consumer group ${COMMUNICATION_GROUP}`);
  } catch (error) {
    if (error.message.includes('BUSYGROUP')) {
      logger.info(`Consumer group ${COMMUNICATION_GROUP} already exists`);
    } else {
      throw error;
    }
  }
}

async function startCustomerConsumer() {
  const client = getRedisClient();
  const db = await database();
  const customersCollection = db.collection('customers');

  logger.info(`Starting customer consumer ${consumerName}`);

  while (true) {
    try {
      // Read from stream, waiting for new messages
      const messages = await client.xReadGroup(
        CUSTOMER_GROUP,
        consumerName,
        [
          {
            key: CUSTOMER_STREAM,
            id: '>'
          }
        ],
        {
          COUNT: 10,
          BLOCK: 2000
        }
      );

      if (!messages || messages.length === 0) {
        continue; // No messages, continue loop
      }

      for (const message of messages[0].messages) {
        const { payload } = message.message;
        const { operation, data } = JSON.parse(payload);

        // Process customer data
        try {
          if (operation === 'create') {
            // Add createdAt and updatedAt
            data.createdAt = new Date();
            data.updatedAt = new Date();
            data._id = data._id ? new ObjectId(data._id): new ObjectId();

            await customersCollection.insertOne(data);
          } else if (operation === 'update') {
            const { _id, ...updateData } = data;
            updateData.updatedAt = new Date();

            await customersCollection.updateOne(
              { _id: new ObjectId(_id) },
              { $set: updateData }
            );
          } else if (operation === 'delete') {
            await customersCollection.deleteOne({ _id: new ObjectId(data._id) });
          }

          // Acknowledge message as processed
          await client.xAck(CUSTOMER_STREAM, CUSTOMER_GROUP, message.id);

        } catch (error) {
          logger.error(`Error processing customer message ${message.id}:`, error);
          // Could implement a dead-letter mechanism here
        }
      }
    } catch (error) {
      logger.error('Error in customer consumer:', error);
      // Sleep before retry to avoid CPU spinning on error
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

async function startOrderConsumer() {
  const client = getRedisClient();
  const db = await database();
  const ordersCollection = db.collection('orders');
  const customersCollection = db.collection('customers');
  
  // Track message attempts to prevent infinite retries
  const messageAttempts = new Map();
  const MAX_ATTEMPTS = 10;

  logger.info(`Starting order consumer ${consumerName}`);

  // Process a single message (used by both new and pending paths)
  async function processMessage(message) {
    const { payload } = message.message;
    const { operation, data } = JSON.parse(payload);
    
    try {
      if (operation === 'create') {
        // Verify customer exists
        const customerExists = await customersCollection.findOne({ 
          _id: new ObjectId(data.customerId) 
        });
        
        if (!customerExists) {
          const attempts = messageAttempts.get(message.id) || 0;
          messageAttempts.set(message.id, attempts + 1);
          
          // Log with attempt count for better visibility
          logger.warn(`Customer with ID ${data.customerId} does not exist. Retry attempt ${attempts + 1}/${MAX_ATTEMPTS}.`);
          
          // If max attempts reached, acknowledge and log failure
          if (attempts + 1 >= MAX_ATTEMPTS) {
            logger.error(`Giving up on order for customer ${data.customerId} after ${MAX_ATTEMPTS} attempts`);
            await client.xAck(ORDER_STREAM, ORDER_GROUP, message.id);
            return true; // We're done with this message (even though it failed)
          }
          
          return false; // Don't acknowledge, will retry later
        }
        
        // Add timestamps
        data.createdAt = new Date();
        data.updatedAt = new Date();
        data._id = data._id ? new ObjectId(data._id) : new ObjectId();

        // Insert order
        const result = await ordersCollection.insertOne(data);

        // Update customer's totalSpend and lastPurchaseDate
        await customersCollection.updateOne(
          { _id: new ObjectId(data.customerId) },
          {
            $inc: { totalSpend: data.amount },
            $set: { lastPurchaseDate: data.orderDate, updatedAt: new Date() }
          }
        );
      } else if (operation === 'update') {
        const { _id, ...updateData } = data;
        updateData.updatedAt = new Date();

        await ordersCollection.updateOne(
          { _id: new ObjectId(_id) },
          { $set: updateData }
        );
      } else if (operation === 'delete') {
        await ordersCollection.deleteOne({ _id: new ObjectId(data._id) });
      }

      // Acknowledge successful processing
      await client.xAck(ORDER_STREAM, ORDER_GROUP, message.id);
      
      // Remove from tracking map if it was there
      messageAttempts.delete(message.id);
      
      return true; // Signal success
    } catch (error) {
      logger.error(`Error processing order message ${message.id}:`, error);
      return false; // Signal failure
    }
  }

  // Process new messages
  async function processNewMessages() {
    try {
      const messages = await client.xReadGroup(
        ORDER_GROUP,
        consumerName,
        [
          {
            key: ORDER_STREAM,
            id: '>'
          }
        ],
        {
          COUNT: 10,
          BLOCK: 2000
        }
      );

      if (!messages || messages.length === 0) {
        return;
      }

      for (const message of messages[0].messages) {
        await processMessage(message);
      }
    } catch (error) {
      logger.error('Error processing new messages:', error);
    }
  }

  // Process pending messages (our retry mechanism) - FIXED VERSION
  async function processPendingMessages() {
    try {
      // First get count of pending messages
      const pendingInfo = await client.xPendingRange(
        ORDER_STREAM,
        ORDER_GROUP,
        '-',  // Start ID
        '+',  // End ID
        10,   // Count
        {
          CONSUMER: consumerName
        }
      );
      
      if (!pendingInfo || pendingInfo.length === 0) {
        return;
      }
      
      // Process each pending message
      for (const entry of pendingInfo) {
        // Handle different client response formats
        // Adjust these based on your client's actual response structure
        let messageId, deliveryTime;
        
        if (Array.isArray(entry)) {
          // Format may be [id, consumer, ms, deliveries]
          messageId = entry[0];
          deliveryTime = parseInt(entry[2]);
        } else if (typeof entry === 'object') {
          // Format may be {id, consumer, time, deliveries}
          messageId = entry.id;
          deliveryTime = parseInt(entry.time);
        } else {
          logger.warn(`Unknown pending entry format: ${typeof entry}`);
          continue;
        }
        
        if (!messageId) {
          logger.warn('Could not extract message ID from pending entry');
          continue;
        }
        
        // Calculate backoff time based on attempt count
        const attempts = messageAttempts.get(messageId) || 0;
        const backoffMs = Math.min(100 * Math.pow(2, attempts), 30000); // Exponential backoff capped at 30s
        
        // Skip messages that haven't waited long enough
        const currentTime = Date.now();
        if (deliveryTime && currentTime - deliveryTime < backoffMs) {
          continue;
        }
        
        logger.info(`Retrying pending message ${messageId} after backoff`);
        
        // Claim the message
        const claimed = await client.xClaim(
          ORDER_STREAM,
          ORDER_GROUP,
          consumerName,
          0, // Min idle time
          [messageId] // Message IDs to claim - must be an array
        );
        
        if (claimed && claimed.length > 0) {
          await processMessage(claimed[0]);
        }
      }
    } catch (error) {
      logger.error('Error processing pending messages:', error);
      // Log more details to help debug
      logger.error(`Error type: ${error.constructor.name}, Message: ${error.message}`);
      if (error.stack) logger.error(`Stack: ${error.stack}`);
    }
  }

  // Main processing loop
  while (true) {
    try {
      // Process new messages
      await processNewMessages();
      
      // Process pending messages (retries)
      await processPendingMessages();
      
      // Small pause to prevent tight looping
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      logger.error('Error in order consumer main loop:', error);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

async function startCommunicationConsumer() {
  const client = getRedisClient();
  const db = await database();
  const communicationLogCollection = db.collection('communicationLog');

  logger.info(`Starting communication consumer ${consumerName}`);

  // Track batch for bulk operations
  let batch = [];
  let lastProcessTime = Date.now();
  const BATCH_SIZE = 50;
  const MAX_BATCH_TIME_MS = 5000; // 5 seconds

  const processBatch = async () => {
    if (batch.length === 0) return;

    try {
      // Bulk update operation
      const bulkOps = batch.map(item => {
        return {
          updateOne: {
            filter: { _id: new ObjectId(item._id) },
            update: { $set: item.update }
          }
        };
      });

      await communicationLogCollection.bulkWrite(bulkOps);
      logger.info(`Processed batch of ${batch.length} communication log updates`);

      // Clear batch after successful processing
      batch = [];
      lastProcessTime = Date.now();
    } catch (error) {
      logger.error('Error processing communication batch:', error);
    }
  };

  while (true) {
    try {
      const messages = await client.xReadGroup(
        COMMUNICATION_GROUP,
        consumerName,
        [
          {
            key: COMMUNICATION_STREAM,
            id: '>'
          }
        ],
        {
          COUNT: 10,
          BLOCK: 2000
        }
      );

      if (!messages || messages.length === 0) {
        // No new messages, check if we should process batch due to time
        const currentTime = Date.now();
        if (batch.length > 0 && currentTime - lastProcessTime >= MAX_BATCH_TIME_MS) {
          await processBatch();
        }
        continue;
      }

      for (const message of messages[0].messages) {
        const { payload } = message.message;
        const { operation, data } = JSON.parse(payload);

        try {
          if (operation === 'status_update') {
            // Add to batch for bulk processing
            batch.push({
              _id: data._id,
              update: {
                status: data.status,
                deliveredAt: data.status === 'SENT' ? new Date() : null,
                errorReason: data.status === 'FAILED' ? data.errorReason : null,
                updatedAt: new Date()
              }
            });

            // Check if batch is full
            if (batch.length >= BATCH_SIZE) {
              await processBatch();
            }
          } else if (operation === 'create') {
            // Direct insert for new records
            data.createdAt = new Date();
            data.updatedAt = new Date();
            await communicationLogCollection.insertOne(data);
          }

          // Acknowledge message
          await client.xAck(COMMUNICATION_STREAM, COMMUNICATION_GROUP, message.id);

        } catch (error) {
          logger.error(`Error processing communication message ${message.id}:`, error);
        }
      }

      // Check if we should process batch due to time
      const currentTime = Date.now();
      if (batch.length > 0 && currentTime - lastProcessTime >= MAX_BATCH_TIME_MS) {
        await processBatch();
      }

    } catch (error) {
      logger.error('Error in communication consumer:', error);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// Function to start all consumers
export async function startAllConsumers() {
  await setupConsumerGroups();

  // Start consumers in parallel
  startCustomerConsumer().catch(logger.error);
  startOrderConsumer().catch(logger.error);
  startCommunicationConsumer().catch(logger.error);

  logger.info('All consumers started');
}