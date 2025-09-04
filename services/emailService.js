const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'Gmail', // You can use other services like SendGrid, Mailgun, etc.
  auth: {
    user: process.env.EMAIL_USER, // Your email
    pass: process.env.EMAIL_PASS  // Your app password (NOT your regular password)
  }
});

// Welcome email
const sendWelcomeEmail = async (email, username) => {
  try {
     // Check if email is configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('📧 Email not configured - skipping welcome email');
      return;
    }

    const mailOptions = {
      from: `"Auth API Team" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to Our Awesome App! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                     padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { background: #667eea; color: white; padding: 15px 30px; 
                     text-decoration: none; border-radius: 5px; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Our App! 🎉</h1>
            </div>
            <div class="content">
              <h2>Hello ${username}!</h2>
              <p>Thank you for joining our community. We're excited to have you on board!</p>
              <p>Your account has been successfully created and you can now access all features.</p>
              <br>
              <a href="http://localhost:5001" class="button">Get Started</a>
              <br><br>
              <p>If you have any questions, just reply to this email.</p>
              <p>Cheers,<br>The Auth API Team</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
   const info = await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent:', info.messageId);
    return info;
    
  } catch (error) {
    console.error('❌ Email error:', error.message);
    
    // Don't crash the app - just log the error
    if (error.code === 'EAUTH') {
      console.log('🔐 Authentication failed - check your email credentials');
    } else if (error.code === 'EENVELOPE') {
      console.log('📭 Invalid email address');
    }
  }
};

// Password reset email
const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    const resetUrl = `http://localhost:8000/login.html?reset=true&token=${resetToken}`;
    
    const mailOptions = {
      from: `"Auth API Team" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ff6b6b; padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { background: #ff6b6b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; }
            .warning { color: #ff6b6b; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset 🔒</h1>
            </div>
            <div class="content">
              <h2>Hello!</h2>
              <p>We received a request to reset your password. Click the button below to proceed:</p>
              <br>
              <a href="${resetUrl}" class="button">Reset Password</a>
              <br><br>
              <p class="warning">This link will expire in 1 hour for security reasons.</p>
              <p>If you didn't request this, please ignore this email.</p>
              <br>
              <p>Cheers,<br>The Auth API Team</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error('Error sending reset email:', error);
  }
};

module.exports = { sendWelcomeEmail, sendPasswordResetEmail };