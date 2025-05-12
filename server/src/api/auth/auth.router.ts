import { Router } from 'express';
import { createUser, googleLogin, verifyUser, loginUser } from './auth.controller';
import { validateRequest } from '../../shared/middlewares/validator';
import { createUserSchema, loginUserSchema } from './auth.schema';

export default (): Router => {
  const app = Router();
  app.post('/signup', validateRequest('body', createUserSchema), createUser);
  app.post('/login', validateRequest('body', loginUserSchema), loginUser);
  app.post('/google', googleLogin);
  app.post('/verify', verifyUser);

  // app.put('/update-password', validateRequest('body', updatePasswordSchema), authenticateToken(), updatePassword);
  return app;
};
