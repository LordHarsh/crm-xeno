import { Request, Response, NextFunction, Router } from 'express';
import database from '../../loaders/database';
import { publishToCommunicationStream } from '../../lib/redis/publishers';
import { ObjectId } from 'mongodb';

export default (): Router => {
    const router = Router();

    router.post('/delivery-receipt', async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { messageId, status, errorReason } = req.body;

            if (!messageId || !status) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            // Find the message in the communication log
            const db = await database();
            const message = await db.collection('communicationLog').findOne({
                _id: new ObjectId(messageId)
            });

            if (!message) {
                return res.status(404).json({ error: 'Message not found' });
            }

            // Publish status update to Redis stream
            await publishToCommunicationStream({
                _id: messageId,
                status,
                errorReason
            }, 'status_update');

            // Return success
            res.status(200).json({ message: 'Delivery receipt processed' });
        } catch (error) {
            next(error);
        }
    });

    // Get delivery stats by campaign ID
    router.get('/stats/:campaignId', async (req: Request, res: Response, next: NextFunction) => {
        try {
            const db = await database();
            const stats = await db.collection('communicationLog').aggregate([
                { $match: { campaignId: req.params.campaignId } },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]).toArray();

            const statsSummary = {
                SENT: 0,
                FAILED: 0,
                PENDING: 0,
                total: 0
            };

            stats.forEach(stat => {
                statsSummary[stat._id] = stat.count;
                statsSummary.total += stat.count;
            });

            res.status(200).json(statsSummary);
        } catch (error) {
            next(error);
        }
    });

    return router;
};