import { Router } from 'express';
import userRouter from './user/user.router';
import authRouter from './auth/auth.router';
import customersRouter from './customer/customers.router';
import ordersRouter from './orders/orders.router';
import campaignRouter from './campaign/campaign.router';
import communicationRouter from './communication/communication.router';

export default (): Router => {
  const app = Router();
  app.use('/auth', authRouter());
  app.use('/api/customers', customersRouter());
  app.use('/api/orders', ordersRouter());
  app.use('/api/campaigns', campaignRouter());
  app.use('/api/communication', communicationRouter());

  return app;
};
