import { Request, Response, NextFunction, Router } from 'express';
import Joi from 'joi';
import authenticateToken from '../../shared/middlewares/authenticate';
import database from '../../loaders/database';
import { ObjectId } from 'mongodb';
import { processSegmentRules } from '../../services/segmentService';
import { startCampaignDelivery } from '../../services/campaignService';

// Validation schema
const campaignSchema = Joi.object({
    name: Joi.string().required(),
    segmentRules: Joi.object().required(),
    messageTemplate: Joi.string().required(),
    aiTags: Joi.array().items(Joi.string()).default([])
});


export default (): Router => {
    const router = Router();
    // app.put('/update-password', validateRequest('body', updatePasswordSchema), authenticateToken(), updatePassword);

    router.get('/', authenticateToken(), async (req: Request, res: Response, next: NextFunction) => {
        try {
            const db = await database();
            const { page = 1, limit = 10 } = req.query;

            const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

            const campaigns = await db.collection('campaigns')
                .find()
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit as string))
                .toArray();

            const total = await db.collection('campaigns').countDocuments();

            // Get delivery stats for each campaign
            const campaignsWithStats = await Promise.all(campaigns.map(async (campaign) => {
                const stats = await db.collection('communicationLog').aggregate([
                    { $match: { campaignId: campaign._id.toString() } },
                    {
                        $group: {
                            _id: '$status',
                            count: { $sum: 1 }
                        }
                    }
                ]).toArray();

                const statsSummary = {
                    sent: 0,
                    failed: 0,
                    pending: 0,
                    total: 0
                };

                stats.forEach(stat => {
                    statsSummary[stat._id.toLowerCase()] = stat.count;
                    statsSummary.total += stat.count;
                });

                return {
                    ...campaign,
                    stats: statsSummary
                };
            }));

            res.status(200).json({
                data: campaignsWithStats,
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

    // Get campaign by ID with delivery stats
    router.get('/:id', authenticateToken(), async (req: Request, res: Response, next: NextFunction) => {
        try {
            const db = await database();
            const campaign = await db.collection('campaigns').findOne({
                _id: new ObjectId(req.params.id)
            });

            if (!campaign) {
                return res.status(404).json({ error: 'Campaign not found' });
            }

            // Get delivery stats
            const stats = await db.collection('communicationLog').aggregate([
                { $match: { campaignId: campaign._id.toString() } },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]).toArray();

            const statsSummary = {
                sent: 0,
                failed: 0,
                pending: 0,
                total: 0
            };

            stats.forEach(stat => {
                statsSummary[stat._id.toLowerCase()] = stat.count;
                statsSummary.total += stat.count;
            });

            // Get sample recipients
            const recipients = await db.collection('communicationLog')
                .find({ campaignId: campaign._id.toString() })
                .limit(10)
                .toArray();

            res.status(200).json({
                ...campaign,
                stats: statsSummary,
                recipients
            });
        } catch (error) {
            next(error);
        }
    });

    // Preview audience size for segment rules
    router.post('/preview-audience', authenticateToken(), async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { segmentRules } = req.body;

            if (!segmentRules) {
                return res.status(400).json({ error: 'Segment rules are required' });
            }

            const audience = await processSegmentRules(segmentRules);

            res.status(200).json({
                audienceSize: audience.length,
                sampleAudience: audience.slice(0, 5)
            });
        } catch (error) {
            console.error('Error previewing audience:', error);
            res.status(500).json({ error: 'Failed to preview audience' });
        }
    });

    // Create campaign and start delivery
    router.post('/', authenticateToken(), async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { error, value } = campaignSchema.validate(req.body);

            if (error) {
                return res.status(400).json({ error: error.details[0].message });
            }

            // Get audience size
            const audience = await processSegmentRules(value.segmentRules);

            // Create campaign in database
            const db = await database();
            const campaign = {
                ...value,
                audienceSize: audience.length,
                createdBy: req.body.user.id,
                status: 'active',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await db.collection('campaigns').insertOne(campaign);

            // Start campaign delivery process
            await startCampaignDelivery(result.insertedId.toString(), audience, value.messageTemplate);

            res.status(201).json({
                message: 'Campaign created and delivery started',
                campaignId: result.insertedId,
                audienceSize: audience.length
            });
        } catch (error) {
            next(error);
        }
    });
    return router;
};
