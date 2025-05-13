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
  app.use('/customers', customersRouter());
  app.use('/orders', ordersRouter());
  app.use('/campaigns', campaignRouter());
  app.use('/communication', communicationRouter());
  app.get("/", (req, res) => {
    res.send("Welcome to the Mini CRM API");
  });

  return app;
};
