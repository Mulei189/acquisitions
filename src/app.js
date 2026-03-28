import express from 'express';
import logger from '#config/logger.js';
import helmet from "helmet";
import morgan from 'morgan';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from '#routes/auth.routes.js';
import  securityMiddleware  from '#middlewares/security.middleware.js';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(morgan('combined', {
    stream: {
        write: (message) => logger.info(message.trim()),
    },
}));

app.use(securityMiddleware); // Apply security middleware globally

app.get('/', (req, res) => {
    logger.info('Hello from the Acquisitions API!');
    res.status(200).json({ message: 'Welcome to the Acquisitions API' });
});

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.get('/api', (req, res) => {
    res.status(200).json({ message: 'API is working' });
});

app.use('/api/auth', authRoutes);

export default app;