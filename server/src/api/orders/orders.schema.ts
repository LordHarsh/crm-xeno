import Joi from 'joi';

// Validation schema
export const orderItemSchema = Joi.object({
    productId: Joi.string().required(),
    name: Joi.string().required(),
    quantity: Joi.number().min(1).required(),
    price: Joi.number().min(0).required()
});

export const orderSchema = Joi.object({
    customerId: Joi.string().required(),
    customerName: Joi.string().required(),
    orderDate: Joi.date().default(() => new Date()),
    amount: Joi.number().min(0).required(),
    items: Joi.array().items(orderItemSchema).min(1).required(),
    status: Joi.string().valid('pending', 'completed', 'cancelled').default('completed'),
    user: Joi.any().optional()
});