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
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
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
    prefix: '/api/v1',
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
