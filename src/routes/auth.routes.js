import express from "express";
import { signUp, signIn, signOut } from "#controllers/auth.controller.js";

const router = express.Router();

// Define your authentication routes here
router.post('/sign-up', signUp);
router.post('/sign-in', signIn);
router.post('/sign-out', signOut);

export default router;