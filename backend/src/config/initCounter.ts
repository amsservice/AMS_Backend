import { Counter } from '../models/Counter';

export async function initCounters() {
  await Counter.updateOne(
    { name: 'schoolCode' },
    { $setOnInsert: { seq: 1000 } }, // first generated = 1001
    { upsert: true }
  );

  console.log('✅ School code counter initialized');
}
