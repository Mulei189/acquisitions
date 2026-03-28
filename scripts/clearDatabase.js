import 'dotenv/config';
import logger from '#config/logger.js';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function clearDatabase() {
    try {
        console.log('🗑️  Starting database cleanup...');
        
        // Drop all tables
        await sql`DROP TABLE IF EXISTS users CASCADE`;
        
        console.log('✅ All tables dropped successfully');
        console.log('💡 Run "npm run db:generate" to recreate schema from models');
        console.log('💡 Run "npm run db:migrate" to apply migrations');
        
    } catch (error) {
        logger.error('Error clearing database', error);
        throw new Error('Error occurred while clearing database');
        process.exit(1);
    }
}

clearDatabase();
