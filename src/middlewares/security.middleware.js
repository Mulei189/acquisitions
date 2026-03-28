import aj from "#config/arcjet.js";
import { slidingWindow } from "@arcjet/node";
import logger from "#config/logger.js";

// Middleware to protect routes with Arcjet
export const securityMiddleware = async (req, res, next) => {
    try {
        const role = req.user?.role || 'guest'; // Default to 'guest' if no user or role is found

        let limit;
        let message;

        switch (role) {
            case 'admin':
                limit = 20; // Higher limit for admins
                message = 'Admin rate limit exceeded. Please try again later.';
                break;
            
            case 'user':
                limit = 10; // Standard limit for regular users
                message = 'Rate limit exceeded. Please try again later.';
                break;
            case 'guest':
                limit = 5; // Stricter limit for unauthenticated users
                message = 'Rate limit exceeded for guests. Please sign in to increase your limits.';
                break;
        }

        const client = aj.withRule(slidingWindow({
            mode: "LIVE",
            interval: '1m', // 1 minute
            max: limit, // Dynamic limit based on role,
            name:`${role}-rate-limit`, // Name the rule for better logging
        }));

        const decision = await client.protect(req);

        if(decision.isDenied() && decision.reason.isBot()){
            logger.warn(`Blocked bot request: ${req.method} ${req.originalUrl} - Reason: ${decision.reason.toString()}`, {
                ip: req.ip,
                userAgent: req.get('user-agent'),
                path: req.path,
            });

            return res.status(403).json({
                error: 'Forbidden',
                message: 'Automated requests are not allowed'
            });
        }
        if(decision.isDenied() && decision.reason.isShield()){
            logger.warn(`Blocked malicious request: ${req.method} ${req.originalUrl} - Reason: ${decision.reason.toString()}`, {
                ip: req.ip,
                userAgent: req.get('user-agent'),
                path: req.path,
                method: req.method,
            });

            return res.status(403).json({
                error: 'Forbidden',
                message: 'Your request was blocked by our security rules'
            });
        }
        if(decision.isDenied() && decision.reason.isRateLimit()){
            logger.warn(`Blocked rate limited request: ${req.method} ${req.originalUrl} - Reason: ${decision.reason.toString()}`, {
                ip: req.ip,
                userAgent: req.get('user-agent'),
                path: req.path,
                method: req.method,
            });

            return res.status(429).json({
                error: 'Forbidden',
                message: 'Too many requests'
            });
        }

        next();
    } catch (error) {
        console.error('Arcjet middleware error:', error);
        return res.status(500).json({
            error: 'Internal Server Error',
            message: 'Something went wrong with the security middleware'
        });
    }
}

export default securityMiddleware;