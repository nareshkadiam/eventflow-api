import { z } from 'zod';

export const guestBookingSchema = z.object({
  seats: z.array(z.string()).min(1).max(20),
  guestName: z.string().min(1).max(100),
  guestEmail: z.string().max(200).optional(),
});

export const registeredBookingSchema = z.object({
  seats: z.array(z.object({
    seatType: z.enum(['exec', 'pod']),
    quantity: z.number().int().min(1).max(20),
  })).max(2)
});
