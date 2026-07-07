import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import {
  authenticateToken,
  registrationRules,
  loginRules,
  otpRules,
  resetPasswordRules,
  validateFields,
  authLimiter,
} from '../middleware/authMiddleware';

const router = Router();

// 1. User Registration
router.post('/register', registrationRules, validateFields, AuthController.register);

// 2. Email Verification OTP
router.post('/verify-otp', otpRules, validateFields, AuthController.verifyOtp);

// 3. User Login (with 5-failure brute force protection & general route rate limiting)
router.post('/login', authLimiter, loginRules, validateFields, AuthController.login);

// 4. Logout
router.post('/logout', AuthController.logout);

// 5. Resend OTP Code
router.post('/resend-otp', AuthController.resendOtp);

// 6. Forgot Password (requests OTP reset code)
router.post('/forgot-password', AuthController.forgotPassword);

// 7. Verify Password Reset OTP code
router.post('/verify-reset-otp', otpRules, validateFields, AuthController.verifyResetOtp);

// 8. Reset Password (updates password securely)
router.post('/reset-password', resetPasswordRules, validateFields, AuthController.resetPassword);

// 9. Session Token Refreshment
router.post('/refresh-token', AuthController.refreshToken);

// 10. Fetch User Profile
router.get('/profile', authenticateToken as any, AuthController.profile);

// 11. Backward compatibility for legacy UI endpoint GET /api/auth/user
router.get('/user', authenticateToken as any, AuthController.profile);

export default router;
