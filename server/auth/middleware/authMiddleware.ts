import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { JWTService } from '../services/jwtService';

// Extend Express Request interface to carry decoded user parameters
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

/**
 * Access Token session guard middleware
 */
export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token is required for authentication' });
  }

  const decoded = JWTService.verifyAccessToken(token);
  if (!decoded) {
    return res.status(403).json({ error: 'Invalid or expired access token' });
  }

  req.user = decoded;
  next();
};

/**
 * Centered Request Validation Result Handler
 */
export const validateFields = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
};

/**
 * Validation rules for user registration
 */
export const registrationRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 50 })
    .withMessage('Name cannot exceed 50 characters'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
];

/**
 * Validation rules for verification and login
 */
export const loginRules = [
  body('email').trim().isEmail().withMessage('Please provide a valid email address'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const otpRules = [
  body('email').trim().isEmail().withMessage('Please provide a valid email address'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be exactly 6 digits')
    .isNumeric()
    .withMessage('OTP must be numeric'),
];

export const resetPasswordRules = [
  body('email').trim().isEmail().withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
];

/**
 * General rate limit for security, e.g. login attempts
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  validate: { trustProxy: false },
  message: {
    error: 'Too many authentication attempts. Please try again after 15 minutes.'
  }
});
