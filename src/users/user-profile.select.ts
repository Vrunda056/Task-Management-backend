import { Prisma } from '../generated/prisma/client.js';

export const userProfileSelect = {
  id: true,
  name: true,
  email: true,
  position: true,
  sheetUrl: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;
