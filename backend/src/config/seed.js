import { readdirSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { pool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedsDir = path.join(__dirname, '..', '..', '..', 'database', 'seeds');

async function run() {
    const files = readdirSync(seedsDir).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
        const sql = readFileSync(path.join(seedsDir, file), 'utf8');
        console.log(`Running seed: ${file}`);
        await pool.query(sql);
    }
    console.log('Seeding complete.');
    await pool.end();
}

run().catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
});
