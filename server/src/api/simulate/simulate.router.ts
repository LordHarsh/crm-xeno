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
    return router;
}