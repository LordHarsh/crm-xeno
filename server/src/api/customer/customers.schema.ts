import z from 'zod';

export const customerSchema = z.object({
  _id: z.string().optional(),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(10).max(15),
  totalSpend: z.number().min(0),
  lastPurchaseDate: z.preprocess(
    // Convert string to Date if it's not already a Date object
    (val) => {
      if (val instanceof Date) return val;
      if (typeof val === 'string' || typeof val === 'number') return new Date(val);
      return null;
    },
    z.date().optional()
  ),
  visits: z.number().min(0).optional(),
  tags: z.array(z.string()).optional()
});