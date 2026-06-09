import { PrismaClient } from '@prisma/client'

// Eén gedeelde PrismaClient. In dev voorkomt de globale cache dat hot-reload
// telkens nieuwe connecties opent.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
