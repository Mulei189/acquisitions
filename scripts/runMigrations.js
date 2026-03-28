import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '#config/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sql = neon(process.env.DATABASE_URL);

async function runMigrations() {
    try {
        console.log('📝 Running migrations...');
        
        const migrationsDir = path.join(__dirname, '../drizzle');
        const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
        
        if (files.length === 0) {
            console.log('✅ No migrations to run');
            return;
        }
        
        for (const file of files) {
            const filePath = path.join(migrationsDir, file);
            const sqlContent = fs.readFileSync(filePath, 'utf-8');
            
            console.log(`⏳ Running ${file}...`);
            await sql.query(sqlContent);
            console.log(`   ✅ ${file} completed`);
        }
        
        console.log('\n✅ All migrations completed successfully');
        
    } catch (error) {
        logger.error('❌ Migration error:', error.message);
        throw new Error(`Migration failed: ${error.message}`);
        process.exit(1);
    }
}

runMigrations();
