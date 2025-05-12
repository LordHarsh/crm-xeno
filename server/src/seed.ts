import config from './config';
import { MongoClient } from 'mongodb';
import { ObjectId } from 'mongodb';
import logger from './loaders/logger';

export default async function seed() {
  let client;

  try {
    client = new MongoClient(config.databaseURL);
    await client.connect();

    const db = client.db(config.dbName);

    logger.info('Connected to MongoDB, seeding data...');

    // Sample customers
    const customers = [
      {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+91-9876543210',
        totalSpend: 15000,
        lastPurchaseDate: new Date('2025-04-15'),
        visits: 8,
        tags: ['loyal', 'high-value'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+91-9876543211',
        totalSpend: 8500,
        lastPurchaseDate: new Date('2025-05-01'),
        visits: 5,
        tags: ['new-customer'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Rajesh Kumar',
        email: 'rajesh@example.com',
        phone: '+91-9876543212',
        totalSpend: 25000,
        lastPurchaseDate: new Date('2025-02-20'),
        visits: 12,
        tags: ['loyal', 'premium'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Priya Sharma',
        email: 'priya@example.com',
        phone: '+91-9876543213',
        totalSpend: 5000,
        lastPurchaseDate: new Date('2025-01-10'),
        visits: 3,
        tags: ['inactive'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Michael Johnson',
        email: 'michael@example.com',
        phone: '+91-9876543214',
        totalSpend: 18200,
        lastPurchaseDate: new Date('2025-04-28'),
        visits: 7,
        tags: ['high-value'],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Insert customers
    const existingCustomers = await db.collection('customers').find({}).toArray();
    if (existingCustomers.length > 0) {
      logger.info('Customers already exist, skipping insertion.');
      return;
    }
    const result = await db.collection('customers').insertMany(customers);
    logger.info(`Inserted ${result.insertedCount} customers`);

    // Create indexes
    await db.collection('customers').createIndex({ email: 1 }, { unique: true });
    await db.collection('orders').createIndex({ customerId: 1 });
    await db.collection('campaigns').createIndex({ createdAt: -1 });
    await db.collection('communicationLog').createIndex({ campaignId: 1 });
    await db.collection('communicationLog').createIndex({ customerId: 1 });

    logger.info('Database seeding completed successfully');
  } catch (error) {
    logger.error('Error seeding database:', error);
  }
}
