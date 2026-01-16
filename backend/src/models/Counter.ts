import { Schema, model, Document } from 'mongoose';

export interface CounterDoc extends Document {
  name: string;
  seq: number;
}

const CounterSchema = new Schema<CounterDoc>(
  {
    name: {
      type: String,
      required: true,
      unique: true
    },
    seq: {
      type: Number,
      required: true
    }
  },
  { timestamps: true }
);

export const Counter = model<CounterDoc>('Counter', CounterSchema);
