import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/modules/auth/infrastructure/password.util';

const prisma = new PrismaClient();

const PASSWORD = '123123';

interface SeedAccount {
  email: string;
  nombreCompleto: string;
  role: 'ADMIN' | 'AUTORIDAD_REGISTRO' | 'AUDITOR' | 'SUPERUSUARIO';
}

const ACCOUNTS: SeedAccount[] = [
  {
    email: 'admin@themis.dev',
    nombreCompleto: 'Administrador Themis',
    role: 'ADMIN',
  },
  {
    email: 'autoridad@themis.dev',
    nombreCompleto: 'Autoridad de Registro Themis',
    role: 'AUTORIDAD_REGISTRO',
  },
  {
    email: 'auditor@themis.dev',
    nombreCompleto: 'Auditor Externo Themis',
    role: 'AUDITOR',
  },
  {
    email: 'superusuario@themis.dev',
    nombreCompleto: 'Superusuario Themis',
    role: 'SUPERUSUARIO',
  },
];

async function main(): Promise<void> {
  const passwordHash = await hashPassword(PASSWORD);

  for (const account of ACCOUNTS) {
    const existing = await prisma.platformUser.findUnique({
      where: { email: account.email },
    });

    if (existing) {
      console.log(`Ya existe: ${account.email} (${account.role})`);
      continue;
    }

    await prisma.platformUser.create({
      data: {
        email: account.email,
        passwordHash,
        nombreCompleto: account.nombreCompleto,
        role: account.role,
      },
    });

    console.log(`Creado: ${account.email} (${account.role})`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
