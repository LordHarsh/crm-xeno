import { NextFunction, Request, Response } from 'express';
import database from '../../loaders/database';
import { verifyToken } from '../jwt';

// Export a middleware factory function
export default function authenticateToken() {
  // Return the middleware function
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers['authorization'];
      
      if (!authHeader) {
        throw { statusCode: 401, message: 'Authorization header missing' };
      }
      
      const token = authHeader.split(' ')[1];
      
      if (!token) {
        throw { statusCode: 401, message: 'Authorization token missing' };
      }

      const { email } = verifyToken(token);
      
      // Check if user exists in database
      const db = await database();
      const user = await db.collection('users').findOne({
        email,
      });
      
      if (!user) {
        throw { statusCode: 404, message: 'User not found' };
      }
      
      // Attach user to request
      req.body.user = {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role
      };
      res.locals.user = user;
      
      next();
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Authentication failed',
      });
    }
  };
}