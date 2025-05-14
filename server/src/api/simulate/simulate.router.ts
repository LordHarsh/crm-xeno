import { Router, Request, Response, NextFunction } from "express";
import authenticateToken from "../../shared/middlewares/authenticate";
import { generateText, generateStructuredData } from "../../services/geminiService";
import database from "../../loaders/database";
import { ObjectId } from "mongodb";
import logger from "../../loaders/logger";
import { customerSchema } from "../../api/customer/customers.schema"; // Import the validation schema
import { orderSchema } from "../../api/orders/orders.schema"; // Import the validation schema
import { publishToCustomerStream, publishToOrderStream } from "../../lib/redis/publishers";

export default (): Router => {
    const router = Router();
    router.get('/generate-customers', authenticateToken(), async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { count = 30 } = req.query;
            logger.info(`Generating ${count} customers`);
            const numCustomers = Math.min(parseInt(count as string), 30); // Limit to 30 at a time

            const prompt = `Generate exactly ${numCustomers} realistic Indian customer profiles for an e-commerce CRM system. 
    Each customer should have:
    - A name (customer names)
    - Email address (based on their name, make sure it's very unique)
    - Phone number (Indian format starting with +91)
    - Total spending amount (between ₹1,000 and ₹50,000)
    - Last purchase date (within the last 6 months)
    - Number of visits (between 1 and 20)
    - Tags (1-3 tags like "new", "regular", "premium", "inactive", "high-value", etc.)
    - For reference, todays date is ${new Date().toISOString().split('T')[0]}.
    - lastPurchaseDate date format is YYYY-MM-DD. And the date should be in the last 6 months.
    
    Return the data as a JSON array of customer objects like this:
    {
      "customers": [
        {
          "name": "Customer Name",
          "email": "email@example.com",
          "phone": "+91XXXXXXXXXX",
          "totalSpend": 5000,
          "lastPurchaseDate": "2025-03-15",
          "visits": 5,
          "tags": ["tag1", "tag2"]
        },
        ...
      ]
    }`;

            const result = await generateStructuredData(prompt);

            if (!result.customers || !Array.isArray(result.customers)) {
                throw new Error('Invalid response format from AI');
            }

            if (result.customers.length > numCustomers) {
                result.customers = result.customers.slice(0, numCustomers);
            }

            // Add simple numeric IDs for frontend reference and parse dates
            const customersWithIds = result.customers.map((customer, index) => ({
                ...customer,
                tempId: `cust_${index + 1}`, // Simple ID like cust_1, cust_2, etc.
                lastPurchaseDate: new Date(customer.lastPurchaseDate)
            }));

            // Direct validation and publishing to Redis
            const db = await database();
            const validatedCustomers = [];
            const customerMapping = {};

            // Process each customer
            for (const customer of customersWithIds) {
                try {
                    // Validate customer data
                    const { tempId, ...customerData } = customer;
                    const validationResult = customerSchema.safeParse(customerData);

                    if (!validationResult.success) {
                        logger.warn(`Invalid customer data for ${tempId}`, validationResult.error);
                        continue;
                    }

                    // Check for duplicate email
                    const existingCustomer = await db.collection('customers').findOne({
                        email: customerData.email
                    });

                    if (existingCustomer) {
                        logger.warn(`Customer with email ${customerData.email} already exists`);
                        continue;
                    }

                    // Generate a new ObjectId for this customer
                    const customerId = new ObjectId();

                    // Add ObjectId to data for reference
                    const customerWithId = {
                        ...validationResult.data,
                        _id: customerId
                    };

                    // Publish to Redis stream
                    await publishToCustomerStream(customerWithId);

                    // Track successfully published customers
                    validatedCustomers.push({
                        ...customerWithId,
                        tempId
                    });

                    // Map temp ID to real ID for orders
                    customerMapping[tempId] = customerId.toString();

                } catch (error) {
                    logger.error('Error processing customer:', error);
                }
            }

            res.status(202).json({
                message: `Successfully processed ${validatedCustomers.length} customers`,
                customers: validatedCustomers,
                customerMapping
            });
        } catch (error) {
            next(error);
        }
    });

    // Generate orders with AI based on existing customers
    router.get('/generate-orders', authenticateToken(), async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { customerMap, count = 40 } = req.query;
            const numOrders = Math.min(parseInt(count as string), 100); // Limit to 100 at a time

            // Parse the customer map from JSON string
            const customerMapping = customerMap ? JSON.parse(customerMap as string) : {};

            // If no customer mapping provided, return an error
            if (Object.keys(customerMapping).length === 0) {
                return res.status(400).json({ error: 'Customer mapping is required' });
            }

            // Create a list of customers with simple IDs for the LLM
            const simplifiedCustomers = Object.keys(customerMapping).map(tempId => ({
                id: tempId,
                // We don't need to fetch actual customer details for generating orders
                name: tempId.replace('cust_', 'Customer ')
            }));

            // Create a list of product options
            const products = [
                { id: 'p1', name: 'Premium Headphones', price: 4999 },
                { id: 'p2', name: 'Smartphone Case', price: 999 },
                { id: 'p3', name: 'Wireless Charger', price: 1499 },
                { id: 'p4', name: 'Bluetooth Speaker', price: 2999 },
                { id: 'p5', name: 'Fitness Tracker', price: 3499 },
                { id: 'p6', name: 'USB-C Cable (3-pack)', price: 599 },
                { id: 'p7', name: 'Portable Power Bank', price: 1299 },
                { id: 'p8', name: 'Wireless Earbuds', price: 5999 },
                { id: 'p9', name: 'Smart Watch', price: 7999 },
                { id: 'p10', name: 'Laptop Backpack', price: 1899 }
            ];

            const prompt = `Generate ${numOrders} realistic e-commerce orders.
    
    Available Customers:
    ${simplifiedCustomers.map(c => `- ${c.name} (ID: ${c.id})`).join('\n')}
    
    Product options:
    ${products.map(p => `- ${p.name} (ID: ${p.id}, Price: ₹${p.price})`).join('\n')}
    
    For each order:
    - Select a customer ID from the list above (use the exact ID format like cust_1, cust_2, etc.)
    - Include 1-5 items from the product list above with quantities
    - For reference, todays date is ${new Date().toISOString().split('T')[0]}.
    - Include an order date within the last 6 months (format: YYYY-MM-DD)
    - Include a status ("completed", "pending", "cancelled")
    
    Return the data as a JSON array of order objects like this:
    {
      "orders": [
        {
          "customerId": "cust_1",
          "orderDate": "2025-03-15",
          "items": [
            { "productId": "p1", "name": "Premium Headphones", "quantity": 2, "price": 4999 },
            { "productId": "p3", "name": "Wireless Charger", "quantity": 1, "price": 1499 }
          ],
          "status": "completed"
        },
        ...
      ]
    }`;

            const result = await generateStructuredData(prompt);

            if (!result.orders || !Array.isArray(result.orders)) {
                throw new Error('Invalid response format from AI');
            }

            // Direct validation and publishing to Redis
            const db = await database();
            const validatedOrders = [];

            // Process each order
            for (const order of result.orders) {
                try {
                    // Calculate total order amount
                    const amount = order.items.reduce((total, item) => {
                        return total + (item.price * item.quantity);
                    }, 0);

                    // Replace temporary customerId with actual MongoDB ID
                    const actualCustomerId = customerMapping[order.customerId];

                    if (!actualCustomerId) {
                        logger.warn(`Invalid customer reference: ${order.customerId}`);
                        continue;
                    }

                    // Prepare order data with proper customer ID and dates
                    const orderData = {
                        customerId: actualCustomerId,
                        orderDate: new Date(order.orderDate),
                        items: order.items,
                        amount,
                        status: order.status
                    };

                    // Validate order data
                    const { error, value } = orderSchema.validate(orderData);
                    if (error) {
                        logger.warn(`Invalid order data`, error.details[0].message);
                        continue;
                    }

                    // Generate a new ObjectId for this order
                    const orderId = new ObjectId();

                    // Add ObjectId to data
                    const orderWithId = {
                        ...value,
                        _id: orderId
                    };

                    // Publish to Redis stream
                    await publishToOrderStream(orderWithId);

                    // Track successfully published orders
                    validatedOrders.push({
                        ...orderWithId,
                        tempCustomerId: order.customerId
                    });

                } catch (error) {
                    logger.error('Error processing order:', error);
                }
            }

            res.status(202).json({
                message: `Successfully processed ${validatedOrders.length} orders`,
                orders: validatedOrders
            });
        } catch (error) {
            next(error);
        }
    });

    router.post('/simulate-responses', authenticateToken(), async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { campaignId } = req.body;

            if (!campaignId) {
                return res.status(400).json({ error: 'Campaign ID is required' });
            }

            const db = await database();

            // Get campaign details
            const campaign = await db.collection('campaigns').findOne({
                _id: new ObjectId(campaignId)
            });

            if (!campaign) {
                return res.status(404).json({ error: 'Campaign not found' });
            }

            // Get communication logs for this campaign
            const logs = await db.collection('communicationLog')
                .find({ campaignId: campaignId })
                .toArray();

            if (logs.length === 0) {
                return res.status(400).json({ error: 'No communication logs found for this campaign' });
            }

            // Count delivery statuses
            const sentCount = logs.filter(log => log.status === 'SENT').length;
            const failedCount = logs.filter(log => log.status === 'FAILED').length;
            const pendingCount = logs.filter(log => log.status === 'PENDING').length;

            // Prepare to generate engagement data for SENT messages
            const sentLogs = logs.filter(log => log.status === 'SENT');

            // Create a new engagement_metrics collection if it doesn't exist
            if (!(await db.listCollections({ name: 'engagement_metrics' }).toArray()).length) {
                await db.createCollection('engagement_metrics');
                await db.collection('engagement_metrics').createIndex({ communicationId: 1 }, { unique: true });
                await db.collection('engagement_metrics').createIndex({ campaignId: 1 });
            }

            // Generate realistic engagement metrics based on message content and customer data
            const customerIds = [...new Set(sentLogs.map(log => log.customerId))];
            const customers = await db.collection('customers')
                .find({ _id: { $in: customerIds.map(id => new ObjectId(id)) } })
                .toArray();

            const customerMap = {};
            customers.forEach(customer => {
                customerMap[customer._id.toString()] = customer;
            });

            // Ask AI to generate realistic engagement patterns
            const prompt = `Generate realistic engagement metrics for a marketing campaign.
    
    Campaign details:
    - Name: "${campaign.name}"
    - Message: "${campaign.messageTemplate}"
    - Total messages sent: ${sentCount}
    
    Customer segments include:
    ${Object.keys(customerMap).length > 0
                    ? Object.values(customerMap).slice(0, 5).map((c: any) =>
                        `- ${c.name}: Total spend ₹${c.totalSpend}, visits: ${c.visits}, tags: [${c.tags.join(', ')}]`
                    ).join('\n')
                    : '- Generic customers'
                }
    
    Please generate engagement metrics showing how customers engaged with this campaign over 72 hours:
    
    1. Open rates: Percentage of recipients who opened/viewed the message
    2. Click rates: Percentage of openers who clicked on a link/offer
    3. Conversion rates: Percentage of clickers who completed a purchase
    4. Response times: Distribution of when customers engaged (immediately, hours later, etc.)
    
    Return the data in this JSON format:
    {
      "summary": {
        "openRate": 0.75, // 75% opened
        "clickRate": 0.35, // 35% of openers clicked
        "conversionRate": 0.15, // 15% of clickers converted
        "averageTimeToOpen": "4.5 hours",
        "topPerformingSegment": "high-value",
        "estimatedRevenue": 25000,
        "roi": 5.2
      },
      "timeDistribution": {
        "immediate": 0.25, // 25% engaged immediately
        "within1Hour": 0.30,
        "within24Hours": 0.35,
        "within72Hours": 0.10
      },
      "segmentPerformance": {
        "high-value": { "openRate": 0.85, "clickRate": 0.45, "conversionRate": 0.25 },
        "new-customer": { "openRate": 0.65, "clickRate": 0.25, "conversionRate": 0.10 },
        "inactive": { "openRate": 0.55, "clickRate": 0.15, "conversionRate": 0.05 }
      },
      "deviceDistribution": {
        "mobile": 0.65,
        "desktop": 0.30,
        "tablet": 0.05
      }
    }`;

            const metricsResult = await generateStructuredData(prompt);

            // Create individual engagement records for each sent message
            const engagementRecords = [];
            const now = new Date();

            for (const log of sentLogs) {
                const customer = customerMap[log.customerId] || { tags: [] };
                const customerSegment = customer.tags[0] || 'regular';

                // Get metrics for this customer's segment, or use average
                const segmentMetrics =
                    metricsResult.segmentPerformance && metricsResult.segmentPerformance[customerSegment]
                        ? metricsResult.segmentPerformance[customerSegment]
                        : {
                            openRate: metricsResult.summary.openRate,
                            clickRate: metricsResult.summary.clickRate,
                            conversionRate: metricsResult.summary.conversionRate
                        };

                // Determine if this message was opened (based on segment open rate)
                const wasOpened = Math.random() < segmentMetrics.openRate;

                // If opened, determine other engagement metrics
                let wasClicked = false;
                let wasConverted = false;
                let openTime = null;
                let clickTime = null;
                let conversionTime = null;
                let device = null;

                if (wasOpened) {
                    // Determine time to open
                    let timeDelay = 0;
                    const timeRandom = Math.random();
                    if (timeRandom < metricsResult.timeDistribution.immediate) {
                        timeDelay = Math.random() * 60 * 1000; // 0-1 minute
                    } else if (timeRandom < metricsResult.timeDistribution.immediate + metricsResult.timeDistribution.within1Hour) {
                        timeDelay = (Math.random() * 59 + 1) * 60 * 1000; // 1-60 minutes
                    } else if (timeRandom < metricsResult.timeDistribution.immediate + metricsResult.timeDistribution.within1Hour + metricsResult.timeDistribution.within24Hours) {
                        timeDelay = (Math.random() * 23 + 1) * 60 * 60 * 1000; // 1-24 hours
                    } else {
                        timeDelay = (Math.random() * 48 + 24) * 60 * 60 * 1000; // 24-72 hours
                    }

                    // Calculate open time
                    openTime = new Date(now.getTime() - timeDelay);

                    // Determine device
                    const deviceRandom = Math.random();
                    if (deviceRandom < metricsResult.deviceDistribution.mobile) {
                        device = 'mobile';
                    } else if (deviceRandom < metricsResult.deviceDistribution.mobile + metricsResult.deviceDistribution.desktop) {
                        device = 'desktop';
                    } else {
                        device = 'tablet';
                    }

                    // Determine if clicked
                    wasClicked = Math.random() < segmentMetrics.clickRate;

                    if (wasClicked) {
                        // Click happens some time after opening
                        clickTime = new Date(openTime.getTime() + Math.random() * 10 * 60 * 1000); // 0-10 minutes after opening

                        // Determine if converted
                        wasConverted = Math.random() < segmentMetrics.conversionRate;

                        if (wasConverted) {
                            // Conversion happens some time after clicking
                            conversionTime = new Date(clickTime.getTime() + Math.random() * 30 * 60 * 1000); // 0-30 minutes after clicking
                        }
                    }
                }

                // Create engagement record
                const engagement = {
                    communicationId: log._id.toString(),
                    campaignId: log.campaignId,
                    customerId: log.customerId,
                    opened: wasOpened,
                    clicked: wasClicked,
                    converted: wasConverted,
                    openedAt: openTime,
                    clickedAt: clickTime,
                    convertedAt: conversionTime,
                    device: device,
                    createdAt: new Date()
                };

                engagementRecords.push(engagement);
            }

            // Save engagement records to database
            if (engagementRecords.length > 0) {
                await db.collection('engagement_metrics').insertMany(engagementRecords);
            }

            // Update campaign with summary metrics
            await db.collection('campaigns').updateOne(
                { _id: new ObjectId(campaignId) },
                {
                    $set: {
                        metrics: metricsResult,
                        hasEngagementData: true,
                        updatedAt: new Date()
                    }
                }
            );

            res.status(200).json({
                message: 'Campaign response simulation completed',
                campaignId,
                sentCount,
                simulatedEngagements: engagementRecords.length,
                metrics: metricsResult
            });
        } catch (error) {
            next(error);
        }
    });

    // Get detailed metrics for a campaign
    router.get('/campaign-metrics/:campaignId', authenticateToken(), async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { campaignId } = req.params;

            if (!campaignId) {
                return res.status(400).json({ error: 'Campaign ID is required' });
            }

            const db = await database();

            // Get campaign details with metrics
            const campaign = await db.collection('campaigns').findOne({
                _id: new ObjectId(campaignId)
            });

            if (!campaign) {
                return res.status(404).json({ error: 'Campaign not found' });
            }

            // Get delivery stats
            const deliveryStats = await db.collection('communicationLog').aggregate([
                { $match: { campaignId: campaignId } },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]).toArray();

            const sent = deliveryStats.find(stat => stat._id === 'SENT')?.count || 0;
            const failed = deliveryStats.find(stat => stat._id === 'FAILED')?.count || 0;
            const pending = deliveryStats.find(stat => stat._id === 'PENDING')?.count || 0;
            const total = sent + failed + pending;

            // Get engagement metrics
            const engagementMetrics = await db.collection('engagement_metrics')
                .find({ campaignId: campaignId })
                .toArray();

            // Calculate engagement stats
            const opened = engagementMetrics.filter(m => m.opened).length;
            const clicked = engagementMetrics.filter(m => m.clicked).length;
            const converted = engagementMetrics.filter(m => m.converted).length;

            // Get device breakdown
            const deviceCounts = {};
            engagementMetrics.forEach(metric => {
                if (metric.device) {
                    deviceCounts[metric.device] = (deviceCounts[metric.device] || 0) + 1;
                }
            });

            // Get timeline data
            let timeline = [];
            if (engagementMetrics.length > 0) {
                // Create hourly buckets for 72 hours
                const timeData = {};
                const earliestTime = Math.min(...engagementMetrics.filter(m => m.openedAt).map(m => m.openedAt.getTime()));

                for (let i = 0; i < 72; i++) {
                    const hourTime = new Date(earliestTime + i * 60 * 60 * 1000);
                    const hourKey = hourTime.toISOString().substring(0, 13); // YYYY-MM-DDTHH format

                    timeData[hourKey] = {
                        hour: i,
                        opens: 0,
                        clicks: 0,
                        conversions: 0
                    };
                }

                // Populate data
                engagementMetrics.forEach(metric => {
                    if (metric.openedAt) {
                        const hourKey = metric.openedAt.toISOString().substring(0, 13);
                        if (timeData[hourKey]) {
                            timeData[hourKey].opens++;
                        }
                    }

                    if (metric.clickedAt) {
                        const hourKey = metric.clickedAt.toISOString().substring(0, 13);
                        if (timeData[hourKey]) {
                            timeData[hourKey].clicks++;
                        }
                    }

                    if (metric.convertedAt) {
                        const hourKey = metric.convertedAt.toISOString().substring(0, 13);
                        if (timeData[hourKey]) {
                            timeData[hourKey].conversions++;
                        }
                    }
                });

                // Convert to array for charts
                timeline = Object.values(timeData);
            }

            // Combine all data
            const metrics = {
                delivery: {
                    sent,
                    failed,
                    pending,
                    total,
                    deliveryRate: total > 0 ? sent / total : 0
                },
                engagement: {
                    opened,
                    clicked,
                    converted,
                    openRate: sent > 0 ? opened / sent : 0,
                    clickRate: opened > 0 ? clicked / opened : 0,
                    conversionRate: clicked > 0 ? converted / clicked : 0,
                    overallConversionRate: sent > 0 ? converted / sent : 0
                },
                devices: deviceCounts,
                timeline,
                aiGenerated: campaign.metrics || null
            };

            res.status(200).json(metrics);
        } catch (error) {
            next(error);
        }
    });

    // Simulate an A/B test campaign
    router.post('/ab-test', authenticateToken(), async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { campaignName, segmentRules, variantA, variantB } = req.body;

            if (!campaignName || !segmentRules || !variantA || !variantB) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const db = await database();

            // Create the A/B test campaign
            const abTestCampaign = {
                name: campaignName,
                segmentRules,
                isAbTest: true,
                variants: [
                    { name: 'Variant A', messageTemplate: variantA },
                    { name: 'Variant B', messageTemplate: variantB }
                ],
                status: 'active',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await db.collection('campaigns').insertOne(abTestCampaign);
            const campaignId = result.insertedId.toString();

            // Get audience based on segment rules
            const audienceSize = await getAudienceSize(segmentRules);

            // Simulate 50/50 split for variants
            const variantASplit = Math.floor(audienceSize * 0.5);
            const variantBSplit = audienceSize - variantASplit;

            // Use AI to predict variant performance
            const prompt = `You are a marketing expert analyzing an A/B test for a campaign with these variants:

    Variant A: "${variantA}"
    Variant B: "${variantB}"
    
    Target audience size: ${audienceSize} customers
    
    Based on the message templates, predict which variant will perform better and why.
    Also, generate realistic performance metrics for both variants, including:
    - Open rates
    - Click rates
    - Conversion rates
    - Overall engagement
    
    Format your response as a structured JSON object:
    {
      "prediction": {
        "winner": "Variant A or B",
        "rationale": "Explanation of why this variant will perform better",
        "marginOfVictory": "Estimated percentage difference in performance"
      },
      "metrics": {
        "variantA": {
          "openRate": 0.75,
          "clickRate": 0.35,
          "conversionRate": 0.15,
          "engagementScore": 7.5
        },
        "variantB": {
          "openRate": 0.70,
          "clickRate": 0.30,
          "conversionRate": 0.12,
          "engagementScore": 6.8
        }
      },
      "insightsAndRecommendations": [
        "Insight 1: ...",
        "Insight 2: ...",
        "Recommendation 1: ...",
        "Recommendation 2: ..."
      ]
    }`;

            const abTestResult = await generateStructuredData(prompt);

            // Update campaign with A/B test results
            await db.collection('campaigns').updateOne(
                { _id: new ObjectId(campaignId) },
                {
                    $set: {
                        abTestResults: abTestResult,
                        hasSimulatedResults: true,
                        updatedAt: new Date()
                    }
                }
            );

            res.status(200).json({
                message: 'A/B test campaign created and simulated',
                campaignId,
                audienceSize,
                variantASplit,
                variantBSplit,
                abTestResults: abTestResult
            });
        } catch (error) {
            next(error);
        }
    });

    // Helper function to get audience size
    async function getAudienceSize(segmentRules) {
        // This is a simplified version - in a real implementation,
        // this would use your existing audience calculation logic
        const db = await database();
        const query = buildMongoQuery(segmentRules);
        const count = await db.collection('customers').countDocuments(query);
        return count;
    }

    // Function to build MongoDB query from segment rules
    function buildMongoQuery(rules) {
        // Simplified implementation - use your actual rule conversion logic here
        // This should match what you already have in your segmentService

        // Handle empty rules
        if (!rules || Object.keys(rules).length === 0) {
            return {};
        }

        // Handle top-level operator (AND/OR)
        if (rules.operator) {
            const mongoOperator = rules.operator === 'AND' ? '$and' : '$or';
            return {
                [mongoOperator]: rules.conditions.map(condition => buildMongoQuery(condition))
            };
        }

        // Handle leaf condition
        if (rules.field && rules.condition && rules.value !== undefined) {
            return processLeafCondition(rules.field, rules.condition, rules.value);
        }

        // If structure doesn't match expected format, return empty query
        return {};
    }

    // Process individual condition
    function processLeafCondition(field, condition, value) {
        // Simplified implementation - use your actual condition processing logic
        switch (field) {
            case 'totalSpend':
                switch (condition) {
                    case '>': return { totalSpend: { $gt: parseFloat(value) } };
                    case '>=': return { totalSpend: { $gte: parseFloat(value) } };
                    case '<': return { totalSpend: { $lt: parseFloat(value) } };
                    case '<=': return { totalSpend: { $lte: parseFloat(value) } };
                    case '=': return { totalSpend: parseFloat(value) };
                    default: return {};
                }

            case 'visits':
                switch (condition) {
                    case '>': return { visits: { $gt: parseInt(value) } };
                    case '>=': return { visits: { $gte: parseInt(value) } };
                    case '<': return { visits: { $lt: parseInt(value) } };
                    case '<=': return { visits: { $lte: parseInt(value) } };
                    case '=': return { visits: parseInt(value) };
                    default: return {};
                }

            // Add other fields as needed

            default:
                return {};
        }
    }

    return router;
}