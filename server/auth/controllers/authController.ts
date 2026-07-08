import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { dbStore } from '../../db';
import { JWTService } from '../services/jwtService';
import { OTPService } from '../services/otpService';
import { EmailService } from '../services/emailService';

export class AuthController {
  /**
   * POST /api/auth/register
   * Registers a new user and sends an email verification OTP
   */
  static async register(req: Request, res: Response) {
    try {
      const { name, email, password, mobile } = req.body;
      const lowerEmail = email.toLowerCase().trim();

      const existingUser = dbStore.findUserByEmail(lowerEmail);
      if (existingUser) {
        if (existingUser.isVerified) {
          return res.status(400).json({ error: 'An account with this email already exists.' });
        }
        
        // If user exists but is unverified, we can update details and send a new OTP
        const otp = OTPService.generateOTP();
        const otpHash = OTPService.hashOTP(otp);
        const now = Date.now();

        dbStore.updateUser(existingUser.id, {
          name,
          passwordHash: bcrypt.hashSync(password, 12),
          mobile: mobile || '',
          otpHash,
          otpType: 'verify',
          otpExpiresAt: now + 5 * 60 * 1000, // 5 minutes
          otpLastRequestedAt: now,
          otpRequestsTimestamps: [...(existingUser.otpRequestsTimestamps || []), now],
        });

        await EmailService.sendVerificationOTP(lowerEmail, name, otp);

        return res.status(200).json({
          message: 'Account is already registered but unverified. A fresh verification OTP has been sent to your email.',
          email: lowerEmail,
        });
      }

      // Create new unverified user
      const otp = OTPService.generateOTP();
      const otpHash = OTPService.hashOTP(otp);
      const now = Date.now();

      const userId = Math.random().toString(36).substring(2, 11);
      const newUser = {
        id: userId,
        name,
        email: lowerEmail,
        passwordHash: bcrypt.hashSync(password, 12),
        mobile: mobile || '',
        isVerified: false,
        otpHash,
        otpType: 'verify',
        otpExpiresAt: now + 5 * 60 * 1000,
        otpLastRequestedAt: now,
        otpRequestsTimestamps: [now],
        loginFailuresCount: 0,
        createdAt: new Date().toISOString(),
      };

      dbStore.saveUser(newUser);

      await EmailService.sendVerificationOTP(lowerEmail, name, otp);

      return res.status(201).json({
        message: 'Account registered successfully. Please verify your email with the OTP sent to your inbox.',
        email: lowerEmail,
      });
    } catch (err: any) {
      console.error("========== REGISTER ERROR ==========");
      console.error(err);
      console.error(err?.stack);

      return res.status(500).json({
        success: false,
        message: err?.message || 'Internal server error occurred during registration.',
        error: err?.message,
        stack: process.env.NODE_ENV === "development" || true
          ? err?.stack
          : undefined
      });
    }
  }

  /**
   * POST /api/auth/verify-otp
   * Verifies the account registration OTP code
   */
  static async verifyOtp(req: Request, res: Response) {
    try {
      const { email, otp } = req.body;
      const lowerEmail = email.toLowerCase().trim();

      const user = dbStore.findUserByEmail(lowerEmail);
      if (!user) {
        return res.status(404).json({ error: 'User account not found.' });
      }

      if (user.isVerified) {
        const accessToken = JWTService.generateAccessToken({ id: user.id, email: user.email });
        const refreshToken = JWTService.generateRefreshToken({ id: user.id, email: user.email });
        const refreshTokenHash = JWTService.hashToken(refreshToken);

        dbStore.updateUser(user.id, { refreshTokenHash });

        res.cookie('refreshToken', refreshToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        return res.status(200).json({
          message: 'Account is already verified. Logged in successfully.',
          token: accessToken,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            mobile: user.mobile,
          },
        });
      }

      if (!user.otpHash || !user.otpExpiresAt || user.otpType !== 'verify') {
        return res.status(400).json({ error: 'No active verification OTP session exists.' });
      }

      if (Date.now() > user.otpExpiresAt) {
        return res.status(400).json({ error: 'The verification OTP has expired. Please request a new one.' });
      }

      const isValid = OTPService.verifyOTP(otp, user.otpHash);
      if (!isValid) {
        return res.status(400).json({ error: 'Invalid verification OTP code. Please check your email.' });
      }

      // Activate user account
      dbStore.updateUser(user.id, {
        isVerified: true,
        otpHash: null,
        otpType: null,
        otpExpiresAt: null,
      });

      // Send Welcome Email asynchronously
      EmailService.sendWelcomeEmail(lowerEmail, user.name).catch((err) =>
        console.error('Failed to send welcome email:', err)
      );

      // Generate credentials
      const accessToken = JWTService.generateAccessToken({ id: user.id, email: user.email });
      const refreshToken = JWTService.generateRefreshToken({ id: user.id, email: user.email });
      const refreshTokenHash = JWTService.hashToken(refreshToken);

      dbStore.updateUser(user.id, { refreshTokenHash });

      // Save HTTP-Only cookie with SameSite=None for iframe support
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return res.status(200).json({
        message: 'Account successfully verified! Welcome to WeatherSphere AI.',
        token: accessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
        },
      });
    } catch (err) {
      console.error('Verify OTP Controller Error:', err);
      return res.status(500).json({ error: 'An error occurred during verification.' });
    }
  }

  /**
   * POST /api/auth/login
   * Authenticates user, verifies passwords, handles lockouts & refresh sessions
   */
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const lowerEmail = email.toLowerCase().trim();

      const user = dbStore.findUserByEmail(lowerEmail);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email address or password.' });
      }

      // Brute-force lockout prevention check
      const now = Date.now();
      if (user.loginLockedUntil && user.loginLockedUntil > now) {
        const waitMinutes = Math.ceil((user.loginLockedUntil - now) / (60 * 1000));
        return res.status(423).json({
          error: `This account is temporarily locked due to multiple login failures. Please try again in ${waitMinutes} minutes.`,
        });
      }

      // Compare password
      const isMatch = user.passwordHash && bcrypt.compareSync(password, user.passwordHash);
      if (!isMatch) {
        const currentFailures = (user.loginFailuresCount || 0) + 1;
        const updates: any = { loginFailuresCount: currentFailures };

        if (currentFailures >= 5) {
          updates.loginLockedUntil = now + 15 * 60 * 1000; // 15-minute lock
          updates.loginFailuresCount = 0; // Reset counter for next cycle
          dbStore.updateUser(user.id, updates);
          return res.status(423).json({
            error: 'This account has been locked for 15 minutes due to 5 failed login attempts.',
          });
        }

        dbStore.updateUser(user.id, updates);
        const remaining = 5 - currentFailures;
        return res.status(401).json({
          error: `Invalid email address or password. ${remaining} attempts remaining before account lockout.`,
        });
      }

      // Check verification state
      if (!user.isVerified) {
        return res.status(403).json({
          error: 'Your email is not verified yet. Please request a new verification OTP and activate your account.',
          unverified: true,
        });
      }

      // Reset login failures on successful login
      dbStore.updateUser(user.id, {
        loginFailuresCount: 0,
        loginLockedUntil: null,
      });

      // Generate Access and Refresh JWT Tokens
      const accessToken = JWTService.generateAccessToken({ id: user.id, email: user.email });
      const refreshToken = JWTService.generateRefreshToken({ id: user.id, email: user.email });
      const refreshTokenHash = JWTService.hashToken(refreshToken);

      dbStore.updateUser(user.id, { refreshTokenHash });

      // Save Refresh Token in HttpOnly cookie with SameSite=None for iframe support
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return res.status(200).json({
        message: 'Login successful. Welcome back!',
        token: accessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
        },
      });
    } catch (err) {
      console.error('Login Controller Error:', err);
      return res.status(500).json({ error: 'Internal server error occurred during login.' });
    }
  }

  /**
   * POST /api/auth/logout
   * Logs out user and invalidates current session tokens
   */
  static async logout(req: Request, res: Response) {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (refreshToken) {
        const decoded = JWTService.verifyRefreshToken(refreshToken);
        if (decoded) {
          const user = dbStore.findUserById(decoded.id);
          if (user) {
            dbStore.updateUser(user.id, { refreshTokenHash: null });
          }
        }
      }

      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
      });

      return res.status(200).json({ message: 'Logout successful. Sessions cleared successfully.' });
    } catch (err) {
      console.error('Logout Controller Error:', err);
      return res.status(500).json({ error: 'An error occurred during logout.' });
    }
  }

  /**
   * POST /api/auth/resend-otp
   * Requests a fresh verification email OTP with strict cooldown guards
   */
  static async resendOtp(req: Request, res: Response) {
    try {
      const { email } = req.body;
      const lowerEmail = email.toLowerCase().trim();

      const user = dbStore.findUserByEmail(lowerEmail);
      if (!user) {
        return res.status(404).json({ error: 'User account not found.' });
      }

      if (user.isVerified) {
        return res.status(200).json({ message: 'This account is already verified.' });
      }

      // Check OTP limiters
      const limitCheck = OTPService.checkRateLimit(user);
      if (!limitCheck.allowed) {
        return res.status(429).json({
          error: limitCheck.reason,
          cooldown: limitCheck.cooldownRemaining,
        });
      }

      const otp = OTPService.generateOTP();
      const otpHash = OTPService.hashOTP(otp);
      const now = Date.now();

      dbStore.updateUser(user.id, {
        otpHash,
        otpType: 'verify',
        otpExpiresAt: now + 5 * 60 * 1000,
        otpLastRequestedAt: now,
        otpRequestsTimestamps: [...(user.otpRequestsTimestamps || []), now],
      });

      await EmailService.sendVerificationOTP(lowerEmail, user.name, otp);

      return res.status(200).json({
        message: 'A fresh verification OTP has been sent to your email inbox.',
        email: lowerEmail,
      });
    } catch (err) {
      console.error('Resend OTP Error:', err);
      return res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
    }
  }

  /**
   * POST /api/auth/forgot-password
   * Dispatches reset credentials OTP to the registered account
   */
  static async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;
      const lowerEmail = email.toLowerCase().trim();

      const user = dbStore.findUserByEmail(lowerEmail);
      if (!user) {
        // Obfuscate result for security to prevent user enumeration
        return res.status(200).json({
          message: 'If the provided email is registered, we have dispatched a password reset OTP.',
        });
      }

      // Check rate limiters
      const limitCheck = OTPService.checkRateLimit(user);
      if (!limitCheck.allowed) {
        return res.status(429).json({
          error: limitCheck.reason,
          cooldown: limitCheck.cooldownRemaining,
        });
      }

      const otp = OTPService.generateOTP();
      const otpHash = OTPService.hashOTP(otp);
      const now = Date.now();

      dbStore.updateUser(user.id, {
        otpHash,
        otpType: 'reset',
        otpExpiresAt: now + 5 * 60 * 1000,
        otpLastRequestedAt: now,
        otpRequestsTimestamps: [...(user.otpRequestsTimestamps || []), now],
        isResetAuthorized: false, // reset any stale resets
      });

      await EmailService.sendPasswordResetOTP(lowerEmail, user.name, otp);

      return res.status(200).json({
        message: 'A password reset authorization code has been dispatched to your email.',
        email: lowerEmail,
      });
    } catch (err) {
      console.error('Forgot Password Error:', err);
      return res.status(500).json({ error: 'Failed to initiate forgot-password workflow.' });
    }
  }

  /**
   * POST /api/auth/verify-reset-otp
   * Validates the forgot-password verification OTP code
   */
  static async verifyResetOtp(req: Request, res: Response) {
    try {
      const { email, otp } = req.body;
      const lowerEmail = email.toLowerCase().trim();

      const user = dbStore.findUserByEmail(lowerEmail);
      if (!user) {
        return res.status(404).json({ error: 'User account not found.' });
      }

      if (!user.otpHash || !user.otpExpiresAt || user.otpType !== 'reset') {
        return res.status(400).json({ error: 'No active forgot-password session exists.' });
      }

      if (Date.now() > user.otpExpiresAt) {
        return res.status(400).json({ error: 'Your password reset OTP has expired. Please request a new one.' });
      }

      const isValid = OTPService.verifyOTP(otp, user.otpHash);
      if (!isValid) {
        return res.status(400).json({ error: 'Invalid password reset code. Please check your email.' });
      }

      // Authorize client for the actual password reset step
      dbStore.updateUser(user.id, {
        isResetAuthorized: true,
        // Keep the session alive momentarily but clear the actual OTP so it cannot be reused
        otpHash: null,
        otpExpiresAt: null,
      });

      return res.status(200).json({
        message: 'Password reset code verified successfully. You may now customize your password.',
        email: lowerEmail,
      });
    } catch (err) {
      console.error('Verify Reset OTP Error:', err);
      return res.status(500).json({ error: 'An error occurred during reset code verification.' });
    }
  }

  /**
   * POST /api/auth/reset-password
   * Upgrades the password securely after verified OTP authorization
   */
  static async resetPassword(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const lowerEmail = email.toLowerCase().trim();

      const user = dbStore.findUserByEmail(lowerEmail);
      if (!user) {
        return res.status(404).json({ error: 'User account not found.' });
      }

      if (!user.isResetAuthorized) {
        return res.status(403).json({ error: 'Unauthorized request. Please verify your OTP code first.' });
      }

      // Hash and store the password safely with 12 salt rounds
      dbStore.updateUser(user.id, {
        passwordHash: bcrypt.hashSync(password, 12),
        isResetAuthorized: false, // Consume the reset token
        otpType: null,
      });

      return res.status(200).json({
        message: 'Your password has been reset successfully. Please login with your new credentials.',
      });
    } catch (err) {
      console.error('Reset Password Error:', err);
      return res.status(500).json({ error: 'An error occurred while resetting your password.' });
    }
  }

  /**
   * POST /api/auth/refresh-token
   * Rotates and validates access sessions via HTTP-Only cookies
   */
  static async refreshToken(req: Request, res: Response) {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh session expired or not found. Please login again.' });
      }

      const decoded = JWTService.verifyRefreshToken(refreshToken);
      if (!decoded) {
        return res.status(403).json({ error: 'Invalid or expired refresh token. Please login again.' });
      }

      const user = dbStore.findUserById(decoded.id);
      if (!user || !user.refreshTokenHash) {
        return res.status(403).json({ error: 'Refresh session has been invalidated. Please login again.' });
      }

      const isValid = JWTService.compareToken(refreshToken, user.refreshTokenHash);
      if (!isValid) {
        return res.status(403).json({ error: 'Compromised credentials detected. Security lockout initiated.' });
      }

      // Generate a brand new access token
      const accessToken = JWTService.generateAccessToken({ id: user.id, email: user.email });

      return res.status(200).json({
        token: accessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
        },
      });
    } catch (err) {
      console.error('Refresh Token Error:', err);
      return res.status(500).json({ error: 'Failed to refresh login session.' });
    }
  }

  /**
   * GET /api/auth/profile
   * Returns current authenticated profile details safely excluding sensitive properties
   */
  static async profile(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthenticated.' });
      }

      const user = dbStore.findUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Profile not found.' });
      }

      return res.status(200).json({
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      });
    } catch (err) {
      console.error('Profile Controller Error:', err);
      return res.status(500).json({ error: 'Failed to fetch user profile details.' });
    }
  }
}
