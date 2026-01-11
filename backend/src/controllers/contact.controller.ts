import { Request, Response } from 'express';
import { ContactMessage } from '../models/ContactMessage';

export const createContactMessage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, email, phone, subject, message } = req.body;

    const created = await ContactMessage.create({
      name,
      email,
      phone,
      subject,
      message
    });

    res.status(201).json({
      success: true,
      message: 'Message received',
      id: created._id
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit message'
    });
  }
};
