#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');

const cwd = process.cwd();
const envLocalPath = path.join(cwd, '.env.local');
const envPath = path.join(cwd, '.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const identifier = process.argv[2];

if (!identifier) {
  console.error('Usage: npm run make-admin -- <email|username|itNumber>');
  process.exit(1);
}

const prisma = new PrismaClient();

(async () => {
  try {
    const userRecord = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: identifier, mode: 'insensitive' } },
          { username: identifier },
          { itNumber: identifier.toUpperCase() }
        ]
      }
    });

    if (!userRecord) {
      console.error(`No user found for: ${identifier}`);
      process.exit(1);
    }

    const user = await prisma.user.update({
      where: { id: userRecord.id },
      data: { role: 'admin' }
    });

    console.log(`Admin role granted: ${user.email} (username: ${user.username}, itNumber: ${user.itNumber})`);
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    console.error(`Failed to set admin role for ${identifier}`);
    console.error(message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
