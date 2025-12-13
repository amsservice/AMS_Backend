import 'dotenv/config';
import { envSchema } from './env.schema';

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables');
  console.error(parsedEnv.error.format());
  process.exit(1); // stop app immediately
}

export const ENV = {
  PORT: parsedEnv.data.PORT,
  MONGO_URI: parsedEnv.data.MONGO_URI
//   JWT_SECRET: parsedEnv.data.JWT_SECRET
};
