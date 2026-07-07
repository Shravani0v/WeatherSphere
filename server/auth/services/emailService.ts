import nodemailer from 'nodemailer';

export class EmailService {
  private static cachedTransporter: any = null;

  /**
   * Initializes Nodemailer transporter dynamically
   */
  private static async getTransporter() {
    if (this.cachedTransporter) {
      return this.cachedTransporter;
    }

    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      console.log(`[SMTP] Dispatched with production host: ${process.env.SMTP_HOST}`);
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      this.cachedTransporter = transporter;
      return transporter;
    } else {
      console.log(`[SMTP] Missing credentials. Initializing Ethereal sandbox fallback.`);
      try {
        const testAccount = await nodemailer.createTestAccount();
        const transporter = nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        this.cachedTransporter = transporter;
        return transporter;
      } catch (err) {
        console.error('[SMTP] Failed to initialize Ethereal sandbox fallback:', err);
        return null; // Return null to trigger console logging fallback
      }
    }
  }

  /**
   * Helper to dispatch the compiled mail with previews
   */
  private static async sendMail(options: { to: string; subject: string; text: string; html: string }) {
    try {
      const transporter = await this.getTransporter();
      if (!transporter) {
        console.warn(`[EMAIL BACKUP LOG] No email transporter available. Printing email to console instead:`);
        console.warn(`========================================================================`);
        console.warn(`TO: ${options.to}`);
        console.warn(`SUBJECT: ${options.subject}`);
        console.warn(`CONTENT:\n${options.text}`);
        console.warn(`========================================================================`);
        return 'console_fallback';
      }

      const fromAddress = process.env.SMTP_FROM || '"WeatherSphere Security" <security@weathersphere.com>';

      const info = await transporter.sendMail({
        from: fromAddress,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      if (!process.env.SMTP_HOST) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log(`[EMAIL DISPATCH] Ethereal Preview URL: ${previewUrl}`);
        return previewUrl;
      }
      console.log(`[EMAIL DISPATCH] Dispatched email securely to: ${options.to}`);
      return null;
    } catch (err) {
      console.error('[EMAIL ERROR] Failed to send email via SMTP:', err);
      console.warn(`[EMAIL BACKUP LOG] SMTP Dispatch failed. Printing email content to console:`);
      console.warn(`========================================================================`);
      console.warn(`TO: ${options.to}`);
      console.warn(`SUBJECT: ${options.subject}`);
      console.warn(`CONTENT:\n${options.text}`);
      console.warn(`========================================================================`);
      return 'console_fallback';
    }
  }

  /**
   * Sends 6-digit Account Verification OTP code
   */
  static async sendVerificationOTP(email: string, name: string, otp: string) {
    const subject = 'Verify Your Email - WeatherSphere AI';
    const text = `Hello ${name},\n\nYour 6-digit WeatherSphere AI verification code is: ${otp}\n\nThis code expires in 5 minutes.\n\nBest regards,\nWeatherSphere Team`;
    
    const html = `
      <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #0b1329; color: #f8fafc; border-radius: 24px; border: 1px solid rgba(255,255,255,0.08);">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; background: linear-gradient(135deg, #2563eb, #3b82f6); color: #ffffff; padding: 12px 24px; border-radius: 16px; font-weight: 800; font-size: 20px; letter-spacing: -0.5px; box-shadow: 0 4px 12px rgba(37,99,235,0.3);">
            WeatherSphere AI
          </div>
          <p style="color: #94a3b8; font-size: 12px; font-family: monospace; text-transform: uppercase; letter-spacing: 2px; margin-top: 10px; margin-bottom: 0;">
            High-Precision Atmospheric Workspace
          </p>
        </div>
        
        <div style="background-color: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 20px; padding: 32px; margin-bottom: 24px;">
          <h2 style="color: #ffffff; font-size: 22px; font-weight: 700; margin-top: 0; margin-bottom: 16px; text-align: center;">Verify Your Identity</h2>
          <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
            Hello <strong>${name}</strong>,<br/><br/>
            Thank you for registering. To complete your account activation and access the high-precision WeatherSphere simulation dashboard, please enter the One-Time Password (OTP) verification code below:
          </p>
          
          <div style="background: linear-gradient(135deg, rgba(37,99,235,0.1), rgba(59,130,246,0.05)); border: 1px solid rgba(37,99,235,0.3); padding: 20px; border-radius: 16px; text-align: center; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #60a5fa; margin: 32px 0; font-family: monospace; text-shadow: 0 0 10px rgba(96,165,250,0.3);">
            ${otp}
          </div>
          
          <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; text-align: center; margin-bottom: 0;">
            This verification code is strictly valid for <strong style="color: #ffffff;">5 minutes</strong>.<br/>
            If you did not request this code, please ignore this email.
          </p>
        </div>
        
        <div style="text-align: center; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 24px;">
          <p style="font-size: 12px; color: #64748b; margin: 0;">
            WeatherSphere Portal &copy; 2026. Powered by Google AI Studio.
          </p>
        </div>
      </div>
    `;

    return this.sendMail({ to: email, subject, text, html });
  }

  /**
   * Sends 6-digit Password Reset OTP code
   */
  static async sendPasswordResetOTP(email: string, name: string, otp: string) {
    const subject = 'Reset Your Password - WeatherSphere AI';
    const text = `Hello ${name},\n\nYour password reset verification code is: ${otp}\n\nThis code expires in 5 minutes.\n\nBest regards,\nWeatherSphere Team`;
    
    const html = `
      <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #0b1329; color: #f8fafc; border-radius: 24px; border: 1px solid rgba(255,255,255,0.08);">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; background: linear-gradient(135deg, #ea580c, #f97316); color: #ffffff; padding: 12px 24px; border-radius: 16px; font-weight: 800; font-size: 20px; letter-spacing: -0.5px; box-shadow: 0 4px 12px rgba(234,88,12,0.3);">
            WeatherSphere AI Security
          </div>
          <p style="color: #94a3b8; font-size: 12px; font-family: monospace; text-transform: uppercase; letter-spacing: 2px; margin-top: 10px; margin-bottom: 0;">
            High-Precision Atmospheric Workspace
          </p>
        </div>
        
        <div style="background-color: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 20px; padding: 32px; margin-bottom: 24px;">
          <h2 style="color: #ffffff; font-size: 22px; font-weight: 700; margin-top: 0; margin-bottom: 16px; text-align: center;">Reset Your Password</h2>
          <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
            Hello <strong>${name}</strong>,<br/><br/>
            We received a request to reset your account password. Enter the verification code below on the password reset screen to authorize this change:
          </p>
          
          <div style="background: linear-gradient(135deg, rgba(234,88,12,0.1), rgba(249,115,22,0.05)); border: 1px solid rgba(234,88,12,0.3); padding: 20px; border-radius: 16px; text-align: center; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #f97316; margin: 32px 0; font-family: monospace; text-shadow: 0 0 10px rgba(249,115,22,0.3);">
            ${otp}
          </div>
          
          <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; text-align: center; margin-bottom: 0;">
            This authorization code is strictly valid for <strong style="color: #ffffff;">5 minutes</strong>.<br/>
            If you did not initiate this request, please secure your account immediately.
          </p>
        </div>
        
        <div style="text-align: center; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 24px;">
          <p style="font-size: 12px; color: #64748b; margin: 0;">
            WeatherSphere Portal &copy; 2026. Powered by Google AI Studio.
          </p>
        </div>
      </div>
    `;

    return this.sendMail({ to: email, subject, text, html });
  }

  /**
   * Sends Welcome HTML Email upon verification
   */
  static async sendWelcomeEmail(email: string, name: string) {
    const subject = 'Welcome to WeatherSphere AI Portal!';
    const text = `Hello ${name},\n\nWelcome to WeatherSphere AI! Your account has been verified successfully. Enjoy dynamic real-time atmospheric simulation dashboard.\n\nBest regards,\nWeatherSphere Team`;
    
    const html = `
      <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #0b1329; color: #f8fafc; border-radius: 24px; border: 1px solid rgba(255,255,255,0.08);">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; padding: 12px 24px; border-radius: 16px; font-weight: 800; font-size: 20px; letter-spacing: -0.5px; box-shadow: 0 4px 12px rgba(16,185,129,0.3);">
            WeatherSphere AI Verified
          </div>
          <p style="color: #94a3b8; font-size: 12px; font-family: monospace; text-transform: uppercase; letter-spacing: 2px; margin-top: 10px; margin-bottom: 0;">
            High-Precision Atmospheric Workspace
          </p>
        </div>
        
        <div style="background-color: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 20px; padding: 32px; margin-bottom: 24px;">
          <h2 style="color: #ffffff; font-size: 22px; font-weight: 700; margin-top: 0; margin-bottom: 16px; text-align: center;">Welcome Aboard!</h2>
          <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6; margin-bottom: 24px; text-align: center;">
            Hello <strong>${name}</strong>,
          </p>
          <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6; margin-bottom: 24px; text-align: justify;">
            We are absolutely thrilled to welcome you to WeatherSphere AI. Your account has been verified successfully. You can now access your customized meteorology portal, review high-fidelity forecast trends, configure localized micro-climate alerts, and interact with the ambient atmospheric AI.
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${process.env.APP_URL || 'https://ai.studio/build'}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 14px rgba(37,99,235,0.4);">
              Go to Dashboard
            </a>
          </div>
          
          <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; text-align: center; margin-bottom: 0;">
            If you have any questions or require administrative assistance, please contact our support team.
          </p>
        </div>
        
        <div style="text-align: center; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 24px;">
          <p style="font-size: 12px; color: #64748b; margin: 0;">
            WeatherSphere Portal &copy; 2026. Powered by Google AI Studio.
          </p>
        </div>
      </div>
    `;

    return this.sendMail({ to: email, subject, text, html });
  }
}
