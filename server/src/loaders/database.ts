import { Db, MongoClient } from 'mongodb';
import config from '../config';

let db: Db;

async function initializeClient(): Promise<Db> {
  const client = await MongoClient.connect(config.databaseURL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    ignoreUndefined: true,
  });

  db = client.db(config.dbName);
  
  await db.collection('customers').createIndex({ email: 1 }, { unique: true });
  await db.collection('orders').createIndex({ customerId: 1 });
  await db.collection('campaigns').createIndex({ createdAt: -1 });
  await db.collection('communicationLog').createIndex({ campaignId: 1 });
  await db.collection('communicationLog').createIndex({ customerId: 1 });
  return db;
}

export default async (): Promise<Db> => {
  if (!db) {
    db = await initializeClient();
  }

  return db;
};
