import { Plano } from '@prisma/client';

export const PLAN_KITNET_LIMITS: Record<Plano, number> = {
  FREE: 3,
  PRO: 50,
};
