/**
 * Shared validation schemas using Zod
 */

import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
});

export const OrderSchema = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid(),
  technicianId: z.string().uuid().optional(),
  status: z.enum(['OPEN', 'DISPATCHED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED']),
});

export type User = z.infer<typeof UserSchema>;
export type Order = z.infer<typeof OrderSchema>;
