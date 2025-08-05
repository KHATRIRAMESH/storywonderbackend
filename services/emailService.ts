import { Resend } from 'resend';

// Initialize Resend with proper error handling
let resend: Resend | null = null;
try {
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    resend = new Resend(apiKey);
    console.log('📧 Resend email service initialized');
  } else {
    console.warn('⚠️  RESEND_API_KEY not found in environment variables. Email service disabled.');
  }
} catch (error) {
  console.error('❌ Failed to initialize Resend:', error);
}

export interface EmailVerificationData {
  email: string;
  firstName?: string;
  verificationCode: string;
  verificationUrl: string;
}

export interface PasswordResetData {
  email: string;
  firstName?: string;
  resetUrl: string;
}

export class EmailService {
  private readonly fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';
  private readonly appName = process.env.APP_NAME || 'StoryWonder';
  private readonly frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  /**
   * Send email verification code
   */
  async sendVerificationEmail(data: EmailVerificationData): Promise<boolean> {
    try {
      if (!resend) {
        console.warn('⚠️  Email service not available - RESEND_API_KEY missing');
        return false;
      }

      const { email, firstName, verificationCode, verificationUrl } = data;
      
      const emailContent = this.generateVerificationEmailHTML({
        firstName: firstName || 'User',
        verificationCode,
        verificationUrl,
      });

      const response = await resend.emails.send({
        from: this.fromEmail,
        to: [email],
        subject: `Verify your ${this.appName} account`,
        html: emailContent,
      });

      console.log('✅ Verification email sent successfully:', response);
      return true;
    } catch (error) {
      console.error('❌ Error sending verification email:', error);
      return false;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(data: PasswordResetData): Promise<boolean> {
    try {
      if (!resend) {
        console.warn('⚠️  Email service not available - RESEND_API_KEY missing');
        return false;
      }

      const { email, firstName, resetUrl } = data;
      
      const emailContent = this.generatePasswordResetEmailHTML({
        firstName: firstName || 'User',
        resetUrl,
      });

      const response = await resend.emails.send({
        from: this.fromEmail,
        to: [email],
        subject: `Reset your ${this.appName} password`,
        html: emailContent,
      });

      console.log('✅ Password reset email sent successfully:', response);
      return true;
    } catch (error) {
      console.error('❌ Error sending password reset email:', error);
      return false;
    }
  }

  /**
   * Send welcome email after successful verification
   */
  async sendWelcomeEmail(email: string, firstName?: string): Promise<boolean> {
    try {
      if (!resend) {
        console.warn('⚠️  Email service not available - RESEND_API_KEY missing');
        return false;
      }

      const emailContent = this.generateWelcomeEmailHTML({
        firstName: firstName || 'User',
      });

      const response = await resend.emails.send({
        from: this.fromEmail,
        to: [email],
        subject: `Welcome to ${this.appName}! 🎉`,
        html: emailContent,
      });

      console.log('✅ Welcome email sent successfully:', response);
      return true;
    } catch (error) {
      console.error('❌ Error sending welcome email:', error);
      return false;
    }
  }

  /**
   * Generate HTML content for verification email
   */
  private generateVerificationEmailHTML({ firstName, verificationCode, verificationUrl }: {
    firstName: string;
    verificationCode: string;
    verificationUrl: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .verification-code { background: #e9ecef; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
            .code { font-size: 32px; font-weight: bold; color: #495057; letter-spacing: 5px; margin: 10px 0; }
            .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #6c757d; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📚 ${this.appName}</h1>
            <p>Verify Your Email Address</p>
          </div>
          <div class="content">
            <h2>Hello ${firstName}! 👋</h2>
            <p>Thank you for joining ${this.appName}! To complete your registration, please verify your email address using the verification code below:</p>
            
            <div class="verification-code">
              <p><strong>Your Verification Code:</strong></p>
              <div class="code">${verificationCode}</div>
              <p>This code will expire in 15 minutes.</p>
            </div>

            <p>Alternatively, you can click the button below to verify your email:</p>
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </div>

            <p>If you didn't create an account with ${this.appName}, you can safely ignore this email.</p>
            
            <div class="footer">
              <p>Need help? Contact us at support@${this.appName.toLowerCase()}.com</p>
              <p>&copy; 2025 ${this.appName}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate HTML content for password reset email
   */
  private generatePasswordResetEmailHTML({ firstName, resetUrl }: {
    firstName: string;
    resetUrl: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #6c757d; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📚 ${this.appName}</h1>
            <p>Password Reset Request</p>
          </div>
          <div class="content">
            <h2>Hello ${firstName}! 👋</h2>
            <p>We received a request to reset your password for your ${this.appName} account.</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>

            <p>This link will expire in 15 minutes for security reasons.</p>
            <p>If you didn't request a password reset, you can safely ignore this email.</p>
            
            <div class="footer">
              <p>Need help? Contact us at support@${this.appName.toLowerCase()}.com</p>
              <p>&copy; 2025 ${this.appName}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate HTML content for welcome email
   */
  private generateWelcomeEmailHTML({ firstName }: {
    firstName: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to ${this.appName}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #6c757d; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📚 ${this.appName}</h1>
            <p>Welcome to the Family!</p>
          </div>
          <div class="content">
            <h2>Welcome ${firstName}! 🎉</h2>
            <p>Your email has been successfully verified, and your ${this.appName} account is now active!</p>
            
            <p>You can now:</p>
            <ul>
              <li>✨ Create magical personalized stories for your children</li>
              <li>🎨 Customize characters and settings</li>
              <li>📖 Generate beautiful illustrated storybooks</li>
              <li>💾 Save and share your favorite stories</li>
            </ul>

            <div style="text-align: center;">
              <a href="${this.frontendUrl}/dashboard" class="button">Start Creating Stories</a>
            </div>

            <p>Thank you for choosing ${this.appName} to create magical moments with your little ones!</p>
            
            <div class="footer">
              <p>Need help getting started? Contact us at support@${this.appName.toLowerCase()}.com</p>
              <p>&copy; 2025 ${this.appName}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Test email configuration
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!resend) {
        console.warn('⚠️  Email service not available - RESEND_API_KEY missing');
        return false;
      }

      // Send a test email to verify configuration
      const response = await resend.emails.send({
        from: this.fromEmail,
        to: ['test@example.com'],
        subject: 'Test Email Configuration',
        html: '<p>This is a test email to verify Resend configuration.</p>',
      });

      console.log('✅ Email service test successful:', response);
      return true;
    } catch (error) {
      console.error('❌ Email service test failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
