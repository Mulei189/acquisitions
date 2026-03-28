import express from "express";
import { signUp, signIn } from "#controllers/auth.controller.js";

const router = express.Router();

// Define your authentication routes here
router.post('/sign-up', signUp);
router.post('/sign-in', signIn);
router.post('/sign-out', (req, res) => {
    // Handle user logout logic
    res.status(200).json({ message: 'User logged out successfully' });
});

export default router;