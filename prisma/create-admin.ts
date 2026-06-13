import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  const name = String(process.env.ADMIN_NAME || "Administrador").trim();
  const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || "");

  if (!email || !email.includes("@")) {
    throw new Error("Defina ADMIN_EMAIL com um e-mail valido.");
  }

  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD deve ter pelo menos 8 caracteres.");
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { email },
    create: {
      name,
      email,
      passwordHash,
      role: "ADMIN",
      active: true,
    },
    update: {
      name,
      passwordHash,
      role: "ADMIN",
      active: true,
    },
  });

  await prisma.authSession.deleteMany({ where: { userId: user.id } });
  console.log(`Administrador configurado: ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
