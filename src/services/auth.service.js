import logger from "#config/logger.js";
import bcrypt from 'bcrypt';
import {db} from "#config/database.js"; 
import { users } from "#models/user.model.js";
import { eq } from "drizzle-orm";
import { id } from "zod/locales";

// Hashing logic
export const hashPassword = async (password) => {
    try {
        return await bcrypt.hash(password, 10);
    } catch (error) {
        logger.error('Error hashing password', error);
        throw new Error('Error occurred while hashing password');
    }
}

// Create user logic
export const createUser = async (name, email, password, role='user') => {
    try {
        // Check if user with the same email already exists
        const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);

        if(existingUser.length > 0) {
            throw new Error('User with this email already exists');
        }

        // Hash the password before storing it in the database
        const hashedPassword = await hashPassword(password);
        const [newUser] = await db.
            insert(users).
            values({ name, email, password: hashedPassword, role }).
            returning({id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt });
        
        logger.info(`User created successfully: ${email}`);
        return newUser;

    } catch (error) {
        logger.error('Error creating user', error.message || error);
        throw new Error(`Failed to create user: ${error.message || 'Unknown error'}`);
    }
}

// Sign in logic
export const LoginUser = async(email, password) => {
    try {
        // Check if user exists
        const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
        
        if(user.length === 0){
            logger.warn(`Login attempt with non-existent email: ${email}`);
            throw new Error('Invalid email or password');
        }

        // Compare password
        const isPasswordValid = await bcrypt.compare(password, user[0].password);
        
        if(!isPasswordValid){
            logger.warn(`Invalid password attempt for email: ${email}`);
            throw new Error('Invalid email or password');
        }
        
        logger.info(`User logged in successfully: ${email}`);
        
        // Return user data without password
        return {
            id: user[0].id,
            name: user[0].name,
            email: user[0].email,
            role: user[0].role,
            createdAt: user[0].createdAt
        };

    } catch (error) {
        logger.error('Error logging in user', error);
        throw new Error(`Failed to log in user: ${error.message || 'Unknown error'}`);  
    }
}