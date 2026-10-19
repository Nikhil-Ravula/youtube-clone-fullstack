import nodemailer from "nodemailer";

/**
 * Configure email transporter.
 * Uses environment SMTP if provided, otherwise creates an Ethereal test transporter
 * or falls back to robust local preview logging so the email pipeline is 100% resilient.
 */
let transporter = null;

const getTransporter = async () => {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Development fallback using Ethereal or test mock
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    } catch {
      // Safe fallback if network is restricted
      transporter = {
        sendMail: async (opts) => {
          console.log("[EMAIL MOCK] Email would be sent to:", opts.to);
          console.log("[EMAIL MOCK] Subject:", opts.subject);
          return { messageId: `mock_${Date.now()}` };
        },
      };
    }
  }

  return transporter;
};

/**
 * Sends a rich, professional subscription confirmation email with receipt & invoice
 */
export const sendSubscriptionConfirmationEmail = async ({
  to,
  userName,
  invoiceNumber,
  paymentId,
  orderId,
  plan,
  billingCycle,
  amount,
  currency = "INR",
  startDate,
  expiryDate,
  features = [],
}) => {
  try {
    const transport = await getTransporter();

    const formattedStart = new Date(startDate).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const formattedExpiry = new Date(expiryDate).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    const featuresListHtml = features
      .map(
        (f) =>
          `<li style="padding: 6px 0; color: #374151; font-size: 14px;">✔ <strong>${f}</strong></li>`
      )
      .join("");

    const mailOptions = {
      from: `"YourTube Subscriptions" <${process.env.SMTP_FROM || "billing@yourtube.com"}>`,
      to,
      subject: `🎉 Payment Receipt & Subscription Activated: ${plan} Plan (${invoiceNumber})`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 24px; color: #1f2937; }
            .container { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e5e7eb; }
            .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 32px 24px; text-align: center; color: white; }
            .content { padding: 32px 28px; }
            .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; background: #fee2e2; color: #991b1b; }
            .invoice-table { width: 100%; border-collapse: collapse; margin: 24px 0; background: #f9fafb; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; }
            .invoice-table td { padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
            .invoice-table td:first-child { color: #6b7280; font-weight: 500; width: 40%; }
            .invoice-table td:last-child { color: #111827; font-weight: 600; text-align: right; }
            .invoice-table tr:last-child td { border-bottom: none; }
            .total-row { background: #eff6ff; font-size: 16px !important; }
            .total-row td { color: #1e40af !important; font-weight: 700 !important; }
            .features-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; margin: 24px 0; }
            .footer { background: #f9fafb; padding: 24px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
            .btn { display: inline-block; background: #dc2626; color: white !important; font-weight: 600; padding: 12px 28px; border-radius: 8px; text-decoration: none; margin: 16px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">YourTube Premium</h1>
              <p style="margin: 8px 0 0; opacity: 0.9; font-size: 15px;">Official Payment Receipt & Tax Invoice</p>
            </div>
            <div class="content">
              <p style="font-size: 16px; margin-top: 0;">Hi <strong>${userName || "Creator"}</strong>,</p>
              <p style="font-size: 14px; color: #4b5563; line-height: 1.5;">
                Thank you for your purchase! Your payment has been successfully verified, and your <strong>${plan}</strong> membership is now active.
              </p>

              <div style="text-align: center; margin: 20px 0;">
                <span class="badge">${plan} Membership Activated</span>
              </div>

              <table class="invoice-table">
                <tr>
                  <td>Invoice Number</td>
                  <td><strong>${invoiceNumber}</strong></td>
                </tr>
                <tr>
                  <td>Payment ID</td>
                  <td><code>${paymentId}</code></td>
                </tr>
                <tr>
                  <td>Razorpay Order ID</td>
                  <td><code>${orderId}</code></td>
                </tr>
                <tr>
                  <td>Billing Cycle</td>
                  <td style="text-transform: capitalize;">${billingCycle}</td>
                </tr>
                <tr>
                  <td>Start Date</td>
                  <td>${formattedStart}</td>
                </tr>
                <tr>
                  <td>Next Renewal / Expiry</td>
                  <td><strong>${formattedExpiry}</strong></td>
                </tr>
                <tr class="total-row">
                  <td>Total Paid</td>
                  <td>₹${amount} ${currency}</td>
                </tr>
              </table>

              <div class="features-box">
                <h3 style="margin: 0 0 10px; color: #991b1b; font-size: 15px;">✨ Your Unlocked Premium Benefits:</h3>
                <ul style="margin: 0; padding-left: 20px; list-style-type: none;">
                  ${featuresListHtml}
                </ul>
              </div>

              <div style="text-align: center;">
                <a href="${process.env.CLIENT_URL || "http://localhost:3000"}/membership" class="btn">
                  Open Subscription Dashboard
                </a>
              </div>
            </div>

            <div class="footer">
              <p style="margin: 0 0 8px;"><strong>Need Help or Have Questions?</strong></p>
              <p style="margin: 0 0 8px;">
                Support Email: <a href="mailto:support@yourtube.com" style="color: #dc2626;">support@yourtube.com</a> |
                Toll-Free Helpline: <strong>+91 800-YOURTUBE</strong> (24/7 Dedicated Support)
              </p>
              <p style="margin: 8px 0 0; color: #9ca3af; font-size: 11px;">
                © 2026 YourTube Inc. All rights reserved. Razorpay Test Mode Transaction.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transport.sendMail(mailOptions);
    console.log("Subscription confirmation email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Failed to send subscription confirmation email:", error);
    // Don't throw so payment confirmation flow continues smoothly
    return { success: false, error: error.message };
  }
};

/**
 * Sends a high-security OTP verification email when a login anomaly is detected
 */
export const sendSecurityOtpEmail = async ({
  to,
  userName = "User",
  otp,
  deviceInfo = {},
  anomalies = [],
}) => {
  try {
    const transport = await getTransporter();

    const formattedTime = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "medium",
    });

    const anomaliesHtml = anomalies.length
      ? `
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin: 16px 0;">
          <p style="margin: 0 0 6px; font-weight: 700; color: #991b1b; font-size: 13px;">⚠️ Security Anomaly Detected:</p>
          <ul style="margin: 0; padding-left: 20px; color: #b91c1c; font-size: 13px;">
            ${anomalies.map((a) => `<li>${a}</li>`).join("")}
          </ul>
        </div>
      `
      : "";

    const mailOptions = {
      from: `"YourTube Security" <${process.env.SMTP_FROM || "security@yourtube.com"}>`,
      to,
      subject: `🔐 YourTube Verification Code: ${otp}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 24px; color: #1f2937; }
            .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e5e7eb; }
            .header { background: #0f172a; padding: 24px; text-align: center; color: white; }
            .content { padding: 32px 28px; }
            .otp-box { background: #f3f4f6; border-radius: 12px; padding: 16px; text-align: center; margin: 24px 0; border: 2px dashed #cbd5e1; }
            .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #dc2626; font-family: monospace; }
            .details-table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
            .details-table td { padding: 8px 4px; border-bottom: 1px solid #f3f4f6; color: #4b5563; }
            .details-table td:first-child { font-weight: 600; color: #374151; width: 35%; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0; font-size: 20px; font-weight: 700;">YourTube Account Security</h2>
              <p style="margin: 4px 0 0; opacity: 0.8; font-size: 13px;">Login Verification Required</p>
            </div>
            <div class="content">
              <p style="margin: 0 0 12px; font-size: 15px;">Hello <strong>${userName}</strong>,</p>
              <p style="margin: 0 0 16px; font-size: 14px; color: #4b5563; line-height: 1.5;">
                We noticed a login attempt from a new device, browser, or location. Use the one-time verification code below to complete your sign-in:
              </p>

              ${anomaliesHtml}

              <div class="otp-box">
                <span class="otp-code">${otp}</span>
                <p style="margin: 8px 0 0; font-size: 12px; color: #64748b;">This code expires in 10 minutes. Never share this with anyone.</p>
              </div>

              <h4 style="margin: 20px 0 8px; font-size: 14px; color: #111827;">Login Attempt Details:</h4>
              <table class="details-table">
                <tr><td>Device / OS</td><td>${deviceInfo.deviceType || "Desktop"} (${deviceInfo.os || "Unknown OS"})</td></tr>
                <tr><td>Browser</td><td>${deviceInfo.browser || "Unknown Browser"} ${deviceInfo.browserVersion || ""}</td></tr>
                <tr><td>IP Address</td><td><code>${deviceInfo.ip || "127.0.0.1"}</code></td></tr>
                <tr><td>Location</td><td>${deviceInfo.location || "Unknown Location"}</td></tr>
                <tr><td>Time (IST)</td><td>${formattedTime}</td></tr>
              </table>

              <p style="margin: 24px 0 0; font-size: 12px; color: #9ca3af; line-height: 1.5;">
                If you did not initiate this request, someone may be trying to access your account. Please change your credentials immediately.
              </p>
            </div>
            <div class="footer">
              <p style="margin: 0;">© 2026 YourTube Inc. • Automated Security Protection</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transport.sendMail(mailOptions);
    console.log(`[SECURITY OTP] Dispatched OTP ${otp} to ${to} (MessageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Failed to send security OTP email:", error);
    console.log(`[SECURITY OTP FALLBACK] OTP for ${to} is: ${otp}`);
    return { success: false, error: error.message };
  }
};

