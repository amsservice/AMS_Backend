import 'dotenv/config';
import { envSchema } from './env.schema';

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables');

  const formatted = parsedEnv.error.format();
  type EnvKeys = keyof typeof formatted;

  (Object.keys(formatted) as EnvKeys[]).forEach((key) => {
    if (key === '_errors') return;
    const fieldErrors = (formatted[key] as any)?._errors;

    if (fieldErrors?.length) {
      console.error(`${key}:`, fieldErrors);
    }
  });

  if (formatted._errors.length) {
    console.error('General:', formatted._errors);
  }

  process.exit(1);
}

export const ENV = {
  PORT: parsedEnv.data.PORT,
  MONGO_URI: parsedEnv.data.MONGO_URI,
  // Updated Exports
  JWT_ACCESS_SECRET: parsedEnv.data.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: parsedEnv.data.JWT_REFRESH_SECRET,
  NODE_ENV: parsedEnv.data.NODE_ENV,
  FRONTEND_URL: parsedEnv.data.FRONTEND_URL,
};