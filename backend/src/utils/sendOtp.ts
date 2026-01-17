import * as nodemailer from "nodemailer";

export const sendOtp = async (email: string, otp: string) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER!,
      pass: process.env.EMAIL_PASS!,
    },
  });

  await transporter.sendMail({
    from: `"Upastithi" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Verify Your Email - Upastithi",
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>Email Verification</title>
        <!--[if mso]>
        <style type="text/css">
          body, table, td {font-family: Arial, sans-serif !important;}
        </style>
        <![endif]-->
      </head>
      <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        
        <!-- Main Container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6;">
          <tr>
            <td style="padding: 40px 20px;">
              
              <!-- Email Card -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                
                <!-- Header with Gradient -->
                <tr>
                  <td style="background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); padding: 40px 30px; text-align: center;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="text-align: center;">
                          <!-- Logo/Icon -->
                          
                          
                          <!-- Brand Name -->
                          <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                            Upastithi
                          </h1>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Content Section -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td>
                          <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #111827; line-height: 1.3; text-align: center;">
                            Verify Your Email Address
                          </h2>

                          <p style="margin: 0 0 24px; font-size: 15px; color: #6b7280; line-height: 1.6; text-align: center;">
                            Thank you for signing up with Upastithi! To complete your registration, please use the verification code below:
                          </p>
                          
                          <!-- OTP Box -->
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0;">
                            <tr>
                              <td style="text-align: center;">
                                <div style="background: linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%); border: 2px solid #3b82f6; border-radius: 12px; padding: 24px; display: inline-block;">
                                  <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: #4b5563; text-transform: uppercase; letter-spacing: 1px;">
                                    Verification Code
                                  </p>
                                  <div style="font-size: 42px; font-weight: 700; color: #2563eb; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                                    ${otp}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Info Box -->
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
                            <tr>
                              <td style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px;">
                                <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.5;">
                                  <strong>⏱️ Important:</strong> This code will expire in <strong>10 minutes</strong>. Please complete your verification promptly.
                                </p>
                              </td>
                            </tr>
                          </table>
                          
                          <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                            If you didn't request this verification code, please ignore this email or contact our support team if you have concerns.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Footer Section -->
                <tr>
                  <td style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 30px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="text-align: center;">
                          <!-- Security Badge -->
                          <div style="margin-bottom: 20px;">
                            <span style="display: inline-flex; align-items: center; font-size: 12px; color: #6b7280;">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 6px;">
                                <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                              </svg>
                              Secured with end-to-end encryption
                            </span>
                          </div>
                          
                          <!-- Copyright -->
                          <p style="margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.5;">
                            © 2025 Upastithi. All rights reserved.<br>
                            This is an automated message, please do not reply to this email.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
              </table>
              
              <!-- Mobile Spacing -->
              <div style="height: 20px;"></div>
              
            </td>
          </tr>
        </table>
        
      </body>
      </html>
    `,
  });
};
