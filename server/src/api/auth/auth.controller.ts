import { NextFunction, Request, Response } from 'express';
import { handleLoginUser, handleUpdatePassword } from './auth.service';
import { handleCreateUser } from './auth.service';
import { CONSTANTS } from '../../shared/constants';
import { OAuth2Client } from 'google-auth-library';
import database from '../../loaders/database';
import generateToken, { verifyToken } from '../../shared/jwt';
import { ObjectId } from 'mongodb';
import config from '../../config';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await handleCreateUser(req.body.name, req.body.email, req.body.password);
    res.status(CONSTANTS.USER_CREATED_SUCCESSFULLY.code).send({
      success: CONSTANTS.USER_CREATED_SUCCESSFULLY.success,
      message: CONSTANTS.USER_CREATED_SUCCESSFULLY.message.msg,
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const loginUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userObj = { email: req.body.email, password: req.body.password };
    const user = await handleLoginUser(userObj.email, userObj.password);
    res.status(CONSTANTS.USER_LOGGED_IN_SUCCESSFULLY.code).json({
      success: CONSTANTS.USER_LOGGED_IN_SUCCESSFULLY.message.success,
      message: CONSTANTS.USER_LOGGED_IN_SUCCESSFULLY.message.description,
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const email = res.locals.user.email;
    const { oldPassword, newPassword } = req.body;
    const new_token = await handleUpdatePassword(email, oldPassword, newPassword);
    res.status(CONSTANTS.UPDATED_PASSWORD_SUCCESSFULLY.code).json({
      success: CONSTANTS.UPDATED_PASSWORD_SUCCESSFULLY.message.success,
      message: CONSTANTS.UPDATED_PASSWORD_SUCCESSFULLY.message.description,
      jwt: new_token,
    });
  } catch (error) {
    next(error);
  }
};



export const googleLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token } = req.body;

    if (!token) {
      throw {
        statusCode: 400,
        message: 'Token is required',
      };
    }

    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: config.google.clientId,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload;

    // Find or create user
    const db = await database();
    let user = await db.collection('users').findOne({ googleId });

    if (!user) {
      // Create new user
      const result = await db.collection('users').insertOne({
        googleId,
        email,
        name,
        role: 'user', // Default role
        createdAt: new Date(),
        updatedAt: new Date()
      });

      user = {
        _id: result.insertedId,
        googleId,
        email,
        name,
        role: 'user'
      };
    }

    // Generate JWT token
    const jwtToken = generateToken(
      user.email,
      user.role
    );
    res.status(200).json({
      token: jwtToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
}

export const verifyUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token } = req.body;

    if (!token) {
      throw {
        statusCode: 400,
        message: 'Token is required',
      };
    }

    const { email } = verifyToken(token);

    // Check if user still exists in database
    const db = await database();
    const user = await db.collection('users').findOne({
      email,
    });

    if (!user) {
      throw {
        statusCode: 401,
        message: 'User not found',
      };
    }

    res.status(200).json({
      valid: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};