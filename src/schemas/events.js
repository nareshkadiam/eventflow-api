import { z } from 'zod';

export const createEventSchema = z.object({
  name: z.string().min(1).max(200),
  place: z.string().min(1).max(200),
  date: z.string().datetime({ offset: true }),
  coordinator: z.string().min(1).max(100).optional(),
  description: z.string().max(2000).optional(),
  execSeatsTotal: z.number().int().min(0),
  normalSeatsTotal: z.number().int().min(0),
  podsTotal: z.number().int().min(0),
});

export const updateEventSchema = createEventSchema.partial();