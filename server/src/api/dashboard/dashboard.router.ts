
import { Router, Request, Response, NextFunction } from 'express';
import database from '../../loaders/database';
import authenticateToken from '../../shared/middlewares/authenticate';

export default (): Router => {
    const app = Router();

    app.get('/stats', authenticateToken(), async (req: Request, res: Response, next: NextFunction) => {
        try {
            const db = await database();

            // Get customer count
            const totalCustomers = await db.collection('customers').countDocuments();

            // Get campaign count
            const totalCampaigns = await db.collection('campaigns').countDocuments();

            // Get order count
            const totalOrders = await db.collection('orders').countDocuments();

            // Get total revenue
            const revenueResult = await db.collection('orders').aggregate([
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]).toArray();

            const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

            res.status(200).json({
                totalCustomers,
                totalCampaigns,
                totalOrders,
                totalRevenue
            });
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            res.status(500).json({ error: 'Failed to fetch dashboard stats' });
        }
    });
    return app;
};