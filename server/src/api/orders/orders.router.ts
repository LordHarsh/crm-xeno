// routes/orderRoutes.js
import { Router, Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import database from '../../loaders/database';
import { publishToOrderStream } from '../../lib/redis/publishers';
import authenticateToken from '../../shared/middlewares/authenticate';
import { orderSchema } from './orders.schema';


export default (): Router => {
    const router = Router();
    // Get all orders (with pagination and filtering)
    router.get('/', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
        try {
            const db = await database();
            const {
                page = 1,
                limit = 10,
                customerId,
                status,
                sortBy = 'orderDate',
                order = -1
            } = req.query;

            const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

            // Build filter
            const filter: { [key: string]: any } = {};
            if (customerId) filter.customerId = customerId;
            if (status) filter.status = status;

            const orders = await db.collection('orders')
                .find(filter)
                .sort({ [sortBy as string]: parseInt(order as string) })
                .skip(skip)
                .limit(parseInt(limit as string))
                .toArray();

            const total = await db.collection('orders').countDocuments(filter);

            res.status(200).json({
                data: orders,
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
    });

    // Get order by ID
    router.get('/:id', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
        try {
            const db = await database();
            const order = await db.collection('orders').findOne({
                _id: new ObjectId(req.params.id)
            });

            if (!order) {
                return res.status(404).json({ error: 'Order not found' });
            }

            res.status(200).json(order);
        } catch (error) {
            next(error);
        }
    });

    // Create new order
    router.post('/', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Validate request body
            const { error, value } = orderSchema.validate(req.body);

            if (error) {
                return res.status(400).json({ error: error.details[0].message });
            }

            // Check if customer exists
            const db = await database();
            const customer = await db.collection('customers').findOne({
                _id: new ObjectId(value.customerId)
            });

            if (!customer) {
                return res.status(404).json({ error: 'Customer not found' });
            }

            // Calculate order amount if not provided
            if (!value.amount) {
                value.amount = value.items.reduce((total, item) => {
                    return total + (item.price * item.quantity);
                }, 0);
            }

            // Publish to stream
            await publishToOrderStream(value);

            res.status(202).json({
                message: 'Order creation request accepted',
                data: value
            });
        } catch (error) {
            next(error);
        }
    });

    // Update order
    router.put('/:id', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { error, value } = orderSchema.validate(req.body);

            if (error) {
                return res.status(400).json({ error: error.details[0].message });
            }

            // Add ID to the data
            value._id = req.params.id;

            // Publish update to stream
            await publishToOrderStream(value, 'update');

            res.status(202).json({
                message: 'Order update request accepted',
                data: value
            });
        } catch (error) {
            next(error);
        }
    });

    // Delete order
    router.delete('/:id', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Check if order exists
            const db = await database();
            const order = await db.collection('orders').findOne({
                _id: new ObjectId(req.params.id)
            });

            if (!order) {
                return res.status(404).json({ error: 'Order not found' });
            }

            // Publish delete to stream
            await publishToOrderStream({ _id: req.params.id }, 'delete');

            res.status(202).json({
                message: 'Order deletion request accepted'
            });
        } catch (error) {
            next(error);
        }
    });
    return router;
};
