import { z } from 'zod';

// Validation schema for user registration
export const signUpSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters long').max(255).trim(),
    email: z.email().max(255).trim().toLowerCase(),
    password: z.string().min(6, 'Password must be at least 6 characters long').max(128),
    role: z.enum(['user', 'admin']).default('user'),
});

// Validation schema for user login
export const signInSchema = z.object({
    email: z.email().max(255).trim().toLowerCase(),
    password: z.string().min(1, 'Password must be at least 1 characters long'),
});