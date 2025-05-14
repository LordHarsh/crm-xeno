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

  logger.info(`Starting order consumer ${consumerName}`);

  while (true) {
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
        continue;
      }

      for (const message of messages[0].messages) {
        const { payload } = message.message;
        const { operation, data } = JSON.parse(payload);

        try {
          if (operation === 'create') {
            // Add timestamps
            data.createdAt = new Date();
            data.updatedAt = new Date();

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

          // Acknowledge message
          await client.xAck(ORDER_STREAM, ORDER_GROUP, message.id);

        } catch (error) {
          logger.error(`Error processing order message ${message.id}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error in order consumer:', error);
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