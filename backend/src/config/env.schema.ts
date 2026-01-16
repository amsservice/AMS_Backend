import {z} from 'zod';


export const envSchema = z.object({
  PORT: z
    .string()
    .optional()
    .default('4000'),

  MONGO_URI: z
    .string()
    .min(1, 'MONGO_URI is required'),

  JWT_SECRET: z
    .string()
    .min(10, 'JWT_SECRET must be at least 10 characters'),

  NODE_ENV: z
    .string()
    .optional()
    .default('development'),

  FRONTEND_URL: z
    .string()
    .optional(),
});
export default envSchema;