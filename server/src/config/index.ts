import dotenv from 'dotenv';
import { url } from 'inspector';
dotenv.config();

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

export default {
  /**
   * Port the app should run on
   */
  port: parseInt(process.env.PORT) || 7200,

  /**
   * Database the app should connect to
   */
  databaseURL: process.env.MONGO_URI,
  dbName: process.env.DB_NAME || 'crm-xeno',

  /**
   * Redis connection URL
   */
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    username: process.env.REDIS_USERNAME!,
    password: process.env.REDIS_PASSWORD!,
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
  },
  /**
   * The secret sauce to validate JWT
   */
  jwtSecret: process.env.JWT_SECRET,

  /**
   * Used by Winston logger
   */
  logs: {
    level: process.env.LOG_LEVEL || 'silly',
  },

  /**
   * API configs
   */
  api: {
    prefix: '/api',
  },

  /**
   *
   **/
  AWS: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    bucketName: process.env.AWS_BUCKET_NAME,
  },
};
