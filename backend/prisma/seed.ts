import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { v7 as uuidv7 } from 'uuid';
import { faker } from '@faker-js/faker';

// In Prisma 7, you need to pass an adapter for direct database connections
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('🌱 Start seeding...');

    await prisma.user.deleteMany();

    const users = Array.from({ length: 10 }).map(() => ({
        id: uuidv7(),
        email: faker.internet.email().toLowerCase(),
        name: faker.person.fullName(),
    }));

    for (const user of users) {
        const u = await prisma.user.create({
            data: user,
        });
        console.log(`Created user: ${u.email}`);
    }

    console.log('✅ Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });