import express from 'express';

import config from './config';
import Loaders from './loaders';
import Logger from './loaders/logger';
import { closeRedisConnection } from './loaders/redis';

async function startServer() {
  const app = express();

  await Loaders({ expressApp: app });

  app
    .listen(config.port, () => {
      Logger.info(`
      ################################################
      🛡️  Server listening on port: ${config.port} 🛡️
      ################################################
    `);
    })
    .on('error', err => {
      Logger.error(err);
      process.exit(1);
    });
    const routes = app._router.stack
  .filter(r => r.route)
  .map(r => ({
    path: r.route.path,
    methods: Object.keys(r.route.methods).map(method => method.toUpperCase())
  }));

console.log(routes);

}

startServer();

process.on('SIGINT', async () => {
  try {
    // await closeConnection();
    await closeRedisConnection();
    console.log('Server shutdown gracefully');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});