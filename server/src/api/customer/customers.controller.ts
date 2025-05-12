import { Request, Response, NextFunction } from "express";
import database from "../../loaders/database";
import { ObjectId } from "mongodb";
import { publishToCustomerStream } from "../../lib/redis/publishers";
import { customerSchema } from "./customers.schema";

export const getCustomers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const db = await database();
        const { page = 1, limit = 10, sortBy = 'createdAt', order = -1 } = req.query;

        const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

        const customers = await db.collection('customers')
            .find()
            .sort({ [sortBy as string]: parseInt(order as string) })
            .skip(skip)
            .limit(parseInt(limit as string))
            .toArray();

        const total = await db.collection('customers').countDocuments();

        res.status(200).json({
            data: customers,
            pagination: {
                total,
                page: parseInt(page as string),
                limit: parseInt(limit as string),
                pages: Math.ceil(total / parseInt(limit as string))
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getCustomerById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = await database();
        const customer = await db.collection('customers').findOne({
            _id: new ObjectId(req.params.id)
        });

        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        res.status(200).json(customer);
    } catch (error) {
        console.error('Error fetching customer:', error);
        res.status(500).json({ error: 'Failed to fetch customer' });
    }
};



export const createCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Validate request body
        const result = customerSchema.safeParse(req.body);

        if (!result.success) {
            throw {
                statusCode: 400, message: 'Invalid request body',
            };
        }

        const db = await database();
        const existingCustomer = await db.collection('customers').findOne({
            email: result.data.email
        });

        if (existingCustomer) {
            throw { statusCode: 409, message: 'Customer with this email already exists' };
        }

        // Publish to stream instead of direct DB insert
        await publishToCustomerStream(result.data);

        res.status(202).json({
            message: 'Customer creation request accepted',
            data: result.data
        });
    } catch (error) {
        next(error);
    }
}

export const updateCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await customerSchema.safeParse(req.body);

        if (!result.success) {
            throw { statusCode: 400, message: result.error.errors[0].message };
        }

        // Add ID to the data
        result.data._id = req.params.id;

        // Publish update to stream
        await publishToCustomerStream(result.data, 'update');

        res.status(202).json({
            data: result.data,
            message: 'Customer update request accepted',
        });
    } catch (error) {
        next(error);
    }
};

export const deleteCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Check if customer exists
        const db = await database();
        const customer = await db.collection('customers').findOne({
            _id: new ObjectId(req.params.id)
        });

        if (!customer) {
            throw {
                statusCode: 404,
                message: 'Customer not found',
            };
        }

        // Publish delete to stream
        await publishToCustomerStream({ _id: req.params.id }, 'delete');

        res.status(202).json({
            message: 'Customer deletion request accepted'
        });
    } catch (error) {
        next(error);
    }
};
