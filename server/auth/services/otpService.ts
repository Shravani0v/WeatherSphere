import bcrypt from 'bcryptjs';

export class OTPService {
  /**
   * Generates a random 6-digit numeric OTP string
   */
  static generateOTP(): string {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < 6; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
  }

  /**
   * Hashes the 6-digit OTP for secure DB storage
   */
  static hashOTP(otp: string): string {
    return bcrypt.hashSync(otp, 10);
  }

  /**
   * Verifies an OTP against a hashed database representation
   */
  static verifyOTP(otp: string, hashedOtp: string): boolean {
    return bcrypt.compareSync(otp, hashedOtp);
  }

  /**
   * Enforces 30-second cooldown and hourly limits for OTP dispatch
   * Returns { allowed: boolean, reason?: string, cooldownRemaining?: number }
   */
  static checkRateLimit(user: any): { allowed: boolean; reason?: string; cooldownRemaining?: number } {
    const now = Date.now();

    // 1. Check 30-second cooldown
    if (user.otpLastRequestedAt) {
      const elapsed = now - user.otpLastRequestedAt;
      if (elapsed < 30 * 1000) {
        return {
          allowed: false,
          reason: 'Please wait before requesting a new OTP.',
          cooldownRemaining: Math.ceil((30 * 1000 - elapsed) / 1000),
        };
      }
    }

    // 2. Check 5 requests per hour limit
    const oneHourAgo = now - 60 * 60 * 1000;
    
    // Filter and clean the list of requests within the last hour
    let recentRequests: number[] = user.otpRequestsTimestamps || [];
    recentRequests = recentRequests.filter((timestamp: number) => timestamp > oneHourAgo);

    if (recentRequests.length >= 5) {
      return {
        allowed: false,
        reason: 'Too many OTP requests. Maximum of 5 requests per hour. Please try again later.',
      };
    }

    return { allowed: true };
  }
}
