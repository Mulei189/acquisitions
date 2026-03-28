import { formatValidationErrors } from "#utils/format.js";
import { signUpSchema, signInSchema } from "#validations/auth.validation.js";
import logger from "#config/logger.js";
import { createUser, LoginUser } from "#services/auth.service.js";
import {jwttoken} from "#utils/jwt.js";
import {cookies} from "#utils/cookies.js";

// Sign up controller
export const signUp = async (req, res, next) => {
    try {
        // Validate input
        const validationResult = signUpSchema.safeParse(req.body);

        if(!validationResult.success){
            return res.status(400).json({
                error: 'Validation failed',
                details: formatValidationErrors(validationResult.error),
            })
        }

        // Extract validated data
        const {name, email, password, role} = validationResult.data;

        // AUTH SERVICE CALL(src/services/auth.service.js)
        const newUser = await createUser(name, email, password, role);

        // Generate JWT token and set it in cookies
        const token = jwttoken.sign({ userId: newUser.id, email: newUser.email, role: newUser.role });
        cookies.setCookie(res, 'token', token);

        // Log successful registration
        logger.info(`User registered successfully: ${email}`);
        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                createdAt: newUser.createdAt,
            },
            token,
        })
        
    } catch (error) {
        logger.error('Sign up error', error);

        if(error.message === 'User with this email already exists') {
            return res.status(409).json({ error: 'Email already exists' });
        }

        // Handle other errors
        next(error);
    }
}

// Sign in controller
export const signIn = async (req, res, next) => {
    try {
        // Validate input using signInSchema (email & password only)
        const validationResult = signInSchema.safeParse(req.body);

        if(!validationResult.success){
            return res.status(400).json({
                error: 'Validation failed',
                details: formatValidationErrors(validationResult.error),
            })
        }
        
        // Extract validated data
        const {email, password} = validationResult.data;
        
        // AUTH SERVICE CALL - Verify credentials and get user
        const user = await LoginUser(email, password);

        // Generate JWT token and set it in cookies
        const token = jwttoken.sign({ userId: user.id, email: user.email, role: user.role });
        cookies.setCookie(res, 'token', token);

        // Log successful login
        logger.info(`User logged in successfully: ${email}`);
        
        // Return user info and token
        res.status(200).json({
            message: 'User logged in successfully',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt,
            },
            token,
        });
    } catch (error) {
        logger.error('Sign in error', error);

        if(error.message === 'Invalid email or password') {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        next(error);
    }
}