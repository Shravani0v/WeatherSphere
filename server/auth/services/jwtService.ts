import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'weathersphere_super_secret_9988_key';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'weathersphere_refresh_secret_1122_key';

export class JWTService {
  /**
   * Generates a 15-minute access token
   */
  static generateAccessToken(user: { id: string; email: string }): string {
    return jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '15m' }
    );
  }

  /**
   * Generates a 7-day refresh token
   */
  static generateRefreshToken(user: { id: string; email: string }): string {
    return jwt.sign(
      { id: user.id, email: user.email },
      REFRESH_SECRET,
      { expiresIn: '7d' }
    );
  }

  /**
   * Verifies an access token
   */
  static verifyAccessToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return null;
    }
  }

  /**
   * Verifies a refresh token
   */
  static verifyRefreshToken(token: string): any {
    try {
      return jwt.verify(token, REFRESH_SECRET);
    } catch (err) {
      return null;
    }
  }

  /**
   * Hashes a refresh token for database storage
   */
  static hashToken(token: string): string {
    return bcrypt.hashSync(token, 10);
  }

  /**
   * Compares plain refresh token with stored hash
   */
  static compareToken(token: string, hashedToken: string): boolean {
    return bcrypt.compareSync(token, hashedToken);
  }
}
