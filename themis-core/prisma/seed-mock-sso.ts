import { PrismaClient, Prisma } from '@prisma/client';
import { hashPassword } from '../src/modules/mock-sso/infrastructure/hash.util';

const prisma = new PrismaClient();

const PASSWORD = '123123';
const CODE_LENGTH = 9;
const CODE_START = 220999999;
const CODE_END = 223999999; // rango asignado por el equipo, no cruzar
const STUDENT_COUNT = 5000;
const BATCH_SIZE = 500;

const CARRERAS: Prisma.MockSsoUserCreateManyInput['carrera'][] = [
  'INGENIERIA_SISTEMAS',
  'INGENIERIA_INFORMATICA',
  'INGENIERIA_REDES_TELECOMUNICACIONES',
  'INGENIERIA_ROBOTICA',
];

const NOMBRES = [
  'Ana',
  'Bruno',
  'Carla',
  'Diego',
  'Elena',
  'Fabricio',
  'Gabriela',
  'Hugo',
  'Ivana',
  'Javier',
  'Karina',
  'Luis',
  'Mariana',
  'Nicolas',
  'Olga',
  'Pablo',
  'Rocio',
  'Sergio',
  'Tania',
  'Victor',
];

const APELLIDOS = [
  'Aguilar',
  'Blanco',
  'Cardenas',
  'Duran',
  'Escobar',
  'Fernandez',
  'Gutierrez',
  'Herrera',
  'Ibanez',
  'Justiniano',
  'Lima',
  'Mamani',
  'Nogales',
  'Ortiz',
  'Paz',
  'Quispe',
  'Rojas',
  'Suarez',
  'Terrazas',
  'Vargas',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildNombreCompleto(): string {
  return `${pick(NOMBRES)} ${pick(APELLIDOS)} ${pick(APELLIDOS)}`;
}

function codigoInstitucional(sequence: number): string {
  const value = CODE_START + sequence;
  if (value > CODE_END) {
    throw new Error(
      `codigoInstitucional ${value} se sale del rango asignado (${CODE_START}-${CODE_END})`,
    );
  }

  const codigo = String(value);
  if (codigo.length !== CODE_LENGTH) {
    throw new Error(
      `codigoInstitucional generado con longitud invalida: ${codigo}`,
    );
  }
  return codigo;
}

interface SeedRow {
  codigoInstitucional: string;
  passwordHash: string;
  nombreCompleto: string;
  facultad: 'FICCT';
  carrera: (typeof CARRERAS)[number];
  tipoUsuario: 'ESTUDIANTE' | 'DOCENTE' | 'ADMINISTRATIVO';
  estadoAcademico: 'ACTIVO' | 'INACTIVO';
}

function buildStudents(passwordHash: string): SeedRow[] {
  const rows: SeedRow[] = [];

  for (let i = 0; i < STUDENT_COUNT; i += 1) {
    // Las primeras 3 filas son casos fijos y documentados (README del modulo):
    // uno habilitado, uno no-habilitado por estado. El caso "no habilitado
    // por tipo" lo cubre buildStaff().
    let estadoAcademico: SeedRow['estadoAcademico'];
    if (i === 0) {
      estadoAcademico = 'ACTIVO';
    } else if (i === 1) {
      estadoAcademico = 'INACTIVO';
    } else {
      estadoAcademico = Math.random() < 0.85 ? 'ACTIVO' : 'INACTIVO';
    }

    rows.push({
      codigoInstitucional: codigoInstitucional(i),
      passwordHash,
      nombreCompleto: buildNombreCompleto(),
      facultad: 'FICCT',
      carrera: pick(CARRERAS),
      tipoUsuario: 'ESTUDIANTE',
      estadoAcademico,
    });
  }

  return rows;
}

function buildStaff(passwordHash: string): SeedRow[] {
  const rows: SeedRow[] = [];
  const staffTipos: SeedRow['tipoUsuario'][] = [
    'DOCENTE',
    'DOCENTE',
    'DOCENTE',
    'ADMINISTRATIVO',
    'ADMINISTRATIVO',
  ];

  staffTipos.forEach((tipoUsuario, index) => {
    rows.push({
      codigoInstitucional: codigoInstitucional(STUDENT_COUNT + index),
      passwordHash,
      nombreCompleto: buildNombreCompleto(),
      facultad: 'FICCT',
      carrera: pick(CARRERAS),
      tipoUsuario,
      estadoAcademico: 'ACTIVO',
    });
  });

  return rows;
}

async function insertInBatches(rows: SeedRow[]): Promise<number> {
  let inserted = 0;

  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const batch = rows.slice(start, start + BATCH_SIZE);
    const result = await prisma.mockSsoUser.createMany({
      data: batch,
      skipDuplicates: true,
    });
    inserted += result.count;
    process.stdout.write(
      `\rSembrando... ${Math.min(start + BATCH_SIZE, rows.length)}/${rows.length}`,
    );
  }

  process.stdout.write('\n');
  return inserted;
}

async function main(): Promise<void> {
  const passwordHash = hashPassword(PASSWORD);

  const students = buildStudents(passwordHash);
  const staff = buildStaff(passwordHash);

  console.log(
    `Generando ${students.length} estudiantes + ${staff.length} staff (docentes/administrativos)...`,
  );
  console.log(`Password unica para todos: "${PASSWORD}"`);

  const insertedStudents = await insertInBatches(students);
  const insertedStaff = await insertInBatches(staff);

  console.log(
    `Insertados: ${insertedStudents} estudiantes nuevos, ${insertedStaff} staff nuevos (los ya existentes se omiten por codigoInstitucional unico).`,
  );
  console.log('Casos fijos garantizados para pruebas manuales:');
  console.log(
    `  - ${codigoInstitucional(0)} / "${PASSWORD}" -> habilitado (ESTUDIANTE, ACTIVO, FICCT)`,
  );
  console.log(
    `  - ${codigoInstitucional(1)} / "${PASSWORD}" -> no habilitado (ESTUDIANTE, INACTIVO)`,
  );
  console.log(
    `  - ${codigoInstitucional(STUDENT_COUNT)} / "${PASSWORD}" -> no habilitado (DOCENTE, ACTIVO)`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
