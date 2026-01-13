import { Schema, model, Document } from 'mongoose';

export interface ContactMessageDoc extends Document {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  createdAt: Date;
  updatedAt: Date;
}

const ContactMessageSchema = new Schema<ContactMessageDoc>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 120
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 20
    },
    subject: {
      type: String,
      trim: true,
      maxlength: 120
    },
    message: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 2000
    }
  },
  { timestamps: true }
);

export const ContactMessage = model<ContactMessageDoc>(
  'ContactMessage',
  ContactMessageSchema
);
