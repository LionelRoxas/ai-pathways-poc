import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// This will show you all available properties
console.log(Object.keys(prisma));