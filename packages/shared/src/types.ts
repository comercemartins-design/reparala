/**
 * Shared TypeScript types for Repara Lá
 */

export enum Role {
  CLIENT = 'CLIENT',
  TECHNICIAN = 'TECHNICIAN',
  ADMIN = 'ADMIN',
}

export enum OrderStatus {
  OPEN = 'OPEN',
  DISPATCHED = 'DISPATCHED',
  ACCEPTED = 'ACCEPTED',
  EN_ROUTE = 'EN_ROUTE',
  IN_PROGRESS = 'IN_PROGRESS',
  AWAITING_APPROVAL = 'AWAITING_APPROVAL',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
}

export interface User {
  id: string;
  supabaseId: string;
  role: Role;
  name: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  clientId: string;
  technicianId?: string;
  problemCode: string;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}
