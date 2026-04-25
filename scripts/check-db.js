const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    select: { id: true, email: true, username: true }
  });
  console.log(JSON.stringify({ ok: true, foundUser: Boolean(user), user }, null, 2));
}

main()
  .catch((error) => {
    console.error('DB_CHECK_ERROR');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
