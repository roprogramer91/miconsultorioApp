const { PrismaClient } = require('@prisma/client');

// Pool limitado a 3 conexiones para no agotar el límite de Railway (plan free ~5 max)
const dbUrl = (process.env.DATABASE_URL || '') + 
    ((process.env.DATABASE_URL || '').includes('?') ? '&' : '?') + 
    'connection_limit=3&pool_timeout=20';

const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

module.exports = prisma;

