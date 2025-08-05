import { resend } from '../lib/resend';

export const sendOtpEmail = async (to: string, otp: string) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'StoryWonder <noreply@storywonderbook.com>',
      to,
      subject: '⨾༊ Your Magic Code Awaits!',
      html: `
        <div style="background-color: #f4f0fa; padding: 32px; font-family: 'Segoe UI', sans-serif; color: #2d2d2d;">
          <div style="max-width: 480px; margin: 0 auto; background-color: #fff; padding: 24px 32px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.1);">
            <h1 style="text-align: center; font-size: 28px; color: #6b21a8; margin-bottom: 12px;">🪄 Welcome to StoryWonder!</h1>
            <p style="font-size: 16px; text-align: center;">You're just one step away from unlocking magical stories.</p>
            <p style="text-align: center; margin: 32px 0; font-size: 18px;">
              Use the following <strong style="color: #6b21a8;">One-Time Passcode</strong> to continue:
            </p>
            <div style="text-align: center; margin: 24px 0;">
              <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4c1d95; background-color: #ede9fe; padding: 16px 32px; border-radius: 8px;">
                ${otp}
              </span>
            </div>
            <p style="font-size: 14px; color: #666; text-align: center; margin-top: 24px;">
              This code will expire soon. If you didn’t request this, you can ignore this email.
            </p>
            <p style="text-align: center; margin-top: 32px; font-size: 14px; color: #999;">
              ✨ StoryWonder – Where your imagination comes alive ✨
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('Error sending OTP email:', error);
    } else {
      console.log('OTP email sent successfully:', data);
    }
    return data;
  } catch (error) {
    console.error('Error sending OTP email:', error);
  }
};
