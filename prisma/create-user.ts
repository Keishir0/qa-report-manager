import { PrismaClient, UserRole } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  const name = String(process.env.USER_NAME || "").trim();
  const email = String(process.env.USER_EMAIL || "").trim().toLowerCase();
  const password = String(process.env.USER_PASSWORD || "");
  const role = String(process.env.USER_ROLE || "QA").toUpperCase();

  if (!name) throw new Error("Defina USER_NAME.");
  if (!email || !email.includes("@")) {
    throw new Error("Defina USER_EMAIL com um e-mail valido.");
  }
  if (password.length < 8) {
    throw new Error("USER_PASSWORD deve ter pelo menos 8 caracteres.");
  }
  if (!Object.values(UserRole).includes(role as UserRole)) {
    throw new Error("USER_ROLE deve ser ADMIN, QA ou VIEWER.");
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { email },
    create: {
      name,
      email,
      passwordHash,
      role: role as UserRole,
      active: true,
    },
    update: {
      name,
      passwordHash,
      role: role as UserRole,
      active: true,
    },
  });

  await prisma.authSession.deleteMany({ where: { userId: user.id } });
  console.log(`Usuario configurado: ${user.email} (${user.role})`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
