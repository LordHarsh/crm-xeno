import database from './database';
import express from './express';
import Logger from './logger';
import Express from 'express';
import { connectRedis } from './redis';
import { startAllConsumers } from '../lib/redis/consumers';
import seed from '../seed';

export default async ({ expressApp }: { expressApp: Express.Application }): Promise<void> => {
  await database();
  Logger.info(`✌️ Connection to database successful`);

  // Seed the database with initial data
  await seed();
  Logger.info(`✌️ Database seeded`);

  await express({ app: expressApp });
  Logger.info('✌️ Express loaded');

  await connectRedis();
  Logger.info('✌️ Redis loaded');

  await startAllConsumers();
  Logger.info('✌️ All consumers started');

  Logger.info('✅ All modules loaded!');
};
