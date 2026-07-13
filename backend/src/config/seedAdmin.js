import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { findAdminByEmail, createAdmin } from '../models/adminUser.js';
import { pool } from './db.js';

dotenv.config();

// Usage: node src/config/seedAdmin.js <email> <password> <name>
async function run() {
    const [email, password, name] = process.argv.slice(2);
    if (!email || !password || !name) {
        console.error('Usage: node src/config/seedAdmin.js <email> <password> "<name>"');
        process.exit(1);
    }

    const existing = await findAdminByEmail(email);
    if (existing) {
        console.log(`Admin ${email} already exists.`);
        await pool.end();
        return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const admin = await createAdmin({ email, passwordHash, name });
    console.log(`Created admin: ${admin.email}`);
    await pool.end();
}

run().catch((err) => {
    console.error('Failed to seed admin:', err);
    process.exit(1);
});
