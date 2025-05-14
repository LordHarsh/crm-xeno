// redis/connection.js
import { createClient } from "redis";
import config from "../config";

let client;

export async function connectRedis() {
  if (client) return client;
  try {
    client = createClient({
      username: config.redis.username,
      password: config.redis.password,
      socket: {
        host: config.redis.url,
        port: config.redis.port,
      }
    });

    client.on('error', (err) => console.error('Redis Client Error', err));
    await client.connect();

    return client;
  } catch (error) {
    console.error('Redis connection error:', error);
    throw error;
  }
}

export function getRedisClient() {
  if (!client || !client.isOpen) {
    throw new Error('Redis client not initialized or connection closed. Call connectRedis first.');
  }
  return client;
}

export async function closeRedisConnection() {
  if (client) {
    await client.quit();
    console.log('Redis connection closed');
  }
}