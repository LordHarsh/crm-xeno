import redis from 'redis';
import config from '../config';

let client;

async function connectRedis() {
  if (client) return client;
  
  try {
    client = redis.createClient({
      url: config.redisURL
    });
    
    client.on('error', (err) => console.error('Redis Client Error', err));
    await client.connect();
    console.log('Connected to Redis');
    
    return client;
  } catch (error) {
    console.error('Redis connection error:', error);
    throw error;
  }
}

function getRedisClient() {
  if (!client || !client.isOpen) {
    throw new Error('Redis client not initialized or connection closed. Call connectRedis first.');
  }
  return client;
}

async function closeRedisConnection() {
  if (client) {
    await client.quit();
    console.log('Redis connection closed');
  }
}

module.exports = { connectRedis, getRedisClient, closeRedisConnection };