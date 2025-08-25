"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = void 0;
const nodemailer = __importStar(require("nodemailer"));
const functions = __importStar(require("firebase-functions"));
class EmailService {
    constructor() {
        var _a, _b;
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER || ((_a = functions.config().email) === null || _a === void 0 ? void 0 : _a.user),
                pass: process.env.EMAIL_PASS || ((_b = functions.config().email) === null || _b === void 0 ? void 0 : _b.pass)
            }
        });
    }
    async sendWelcomeEmail(userEmail, userName) {
        const emailOptions = {
            to: userEmail,
            subject: 'Welcome to CCN Cleaning Services',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, #f97316, #ea580c); border-radius: 12px; color: white; font-weight: bold; font-size: 24px; line-height: 60px;">CCN</div>
            <h1 style="color: #f97316; margin: 10px 0;">Welcome to CCN Cleaning!</h1>
          </div>
          
          <p style="font-size: 16px; color: #374151;">Dear ${userName},</p>
          
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Thank you for registering with CCN Cleaning Services. We're excited to serve you with our professional cleaning solutions!
          </p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h3 style="color: #1f2937; margin-top: 0;">Our Services Include:</h3>
            <ul style="color: #4b5563; line-height: 1.8;">
              <li>Commercial Cleaning for offices and retail spaces</li>
              <li>Post-Construction Cleanup for new buildings</li>
              <li>Janitorial Services for daily maintenance</li>
              <li>Emergency Response available 24/7</li>
            </ul>
          </div>
          
          <div style="background: #fef3e2; border-left: 4px solid #f97316; padding: 15px; margin: 25px 0;">
            <p style="margin: 0; color: #92400e;">
              <strong>25+ Years of Trusted Service</strong><br>
              Family-owned and operated since 1998, serving the Tampa Bay Area
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="font-size: 18px; color: #1f2937; margin-bottom: 10px;">Ready to get started?</p>
            <a href="tel:+18132191920" style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Call (813) 219-1920</a>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center;">
            <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">
              <strong>CC&N's Cleaning Services</strong><br>
              Tampa Bay Area, Florida<br>
              Email: <a href="mailto:info@ccnscleaning.com" style="color: #f97316;">info@ccnscleaning.com</a>
            </p>
          </div>
        </div>
      `,
            text: `Welcome to CCN Cleaning, ${userName}! 

Thank you for registering with CCN Cleaning Services. We're excited to serve you!

Our Services:
- Commercial Cleaning
- Post-Construction Cleanup  
- Janitorial Services
- Emergency Response (24/7)

With 25+ years of experience serving the Tampa Bay Area, we're ready to help.

Contact us:
Phone: (813) 219-1920
Email: info@ccnscleaning.com

Best regards,
The CC&N's Cleaning Team`
        };
        await this.sendEmail(emailOptions);
    }
    async sendAppointmentConfirmation(userEmail, userName, appointmentDetails) {
        const formattedDate = new Date(appointmentDetails.appointmentDate).toLocaleDateString('en-CA', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        const emailOptions = {
            to: userEmail,
            subject: 'Appointment Confirmed - CCN Cleaning Services',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 12px; color: white; font-weight: bold; font-size: 24px; line-height: 60px;">✓</div>
            <h1 style="color: #10b981; margin: 10px 0;">Appointment Confirmed!</h1>
          </div>
          
          <p style="font-size: 16px; color: #374151;">Dear ${userName},</p>
          
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Your cleaning appointment has been successfully confirmed. Here are the details:
          </p>
          
          <div style="background: #f0fdf4; border: 2px solid #10b981; border-radius: 8px; padding: 20px; margin: 25px 0;">
            <h3 style="color: #065f46; margin-top: 0; margin-bottom: 15px;">Appointment Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #374151; font-weight: bold; width: 120px;">Service:</td>
                <td style="padding: 8px 0; color: #1f2937;">${appointmentDetails.serviceType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #374151; font-weight: bold;">Date & Time:</td>
                <td style="padding: 8px 0; color: #1f2937;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #374151; font-weight: bold;">Address:</td>
                <td style="padding: 8px 0; color: #1f2937;">${appointmentDetails.address}</td>
              </tr>
              ${appointmentDetails.notes ? `
              <tr>
                <td style="padding: 8px 0; color: #374151; font-weight: bold; vertical-align: top;">Notes:</td>
                <td style="padding: 8px 0; color: #1f2937;">${appointmentDetails.notes}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          
          <div style="background: #fef3e2; border-left: 4px solid #f97316; padding: 15px; margin: 25px 0;">
            <h4 style="color: #92400e; margin-top: 0;">What to Expect:</h4>
            <ul style="color: #92400e; margin: 10px 0; padding-left: 20px;">
              <li>Our professional team will arrive on time</li>
              <li>All equipment and supplies are provided</li>
              <li>We're fully insured and bonded</li>
              <li>Quality guarantee on all work performed</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="font-size: 16px; color: #1f2937; margin-bottom: 15px;">
              Questions or need to make changes?
            </p>
            <div>
              <a href="tel:+18132191920" style="display: inline-block; background: #f97316; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 0 5px;">Call (813) 219-1920</a>
              <a href="mailto:info@ccnscleaning.com" style="display: inline-block; background: #6b7280; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 0 5px;">Email Us</a>
            </div>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center;">
            <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">
              <strong>CC&N's Cleaning Services</strong><br>
              Professional • Reliable • Trusted since 1998<br>
              info@ccnscleaning.com | (813) 219-1920
            </p>
          </div>
        </div>
      `,
            text: `Appointment Confirmed - CCN Cleaning

Dear ${userName},

Your cleaning appointment has been confirmed:

Service: ${appointmentDetails.serviceType}
Date: ${formattedDate}
Address: ${appointmentDetails.address}
${appointmentDetails.notes ? `Notes: ${appointmentDetails.notes}` : ''}

Our professional team will arrive on time with all necessary equipment.

Questions? Contact us:
Phone: (813) 219-1920
Email: info@ccnscleaning.com

Thank you for choosing CC&N's Cleaning Services!`
        };
        await this.sendEmail(emailOptions);
    }
    async sendPasswordResetEmail(userEmail, resetLink) {
        const emailOptions = {
            to: userEmail,
            subject: 'Password Reset - CCN Cleaning Services',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, #f97316, #ea580c); border-radius: 12px; color: white; font-weight: bold; font-size: 24px; line-height: 60px;">🔐</div>
            <h1 style="color: #1f2937; margin: 10px 0;">Password Reset Request</h1>
          </div>
          
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            We received a request to reset your password for your CCN Cleaning Services account.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
          </div>
          
          <div style="background: #fef3e2; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              <strong>Security Notice:</strong> This link will expire in 1 hour. If you didn't request this reset, please ignore this email.
            </p>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
            If the button doesn't work, copy and paste this link in your browser:<br>
            <a href="${resetLink}" style="color: #f97316; word-break: break-all;">${resetLink}</a>
          </p>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center;">
            <p style="color: #6b7280; font-size: 14px;">
              CC&N's Cleaning Services<br>
              info@ccnscleaning.com | (813) 219-1920
            </p>
          </div>
        </div>
      `,
            text: `Password Reset - CCN Cleaning Services

We received a request to reset your password.

Click here to reset your password: ${resetLink}

This link will expire in 1 hour.

If you didn't request this reset, please ignore this email.

CC&N's Cleaning Services
info@ccnscleaning.com | (813) 219-1920`
        };
        await this.sendEmail(emailOptions);
    }
    async sendEmail(options) {
        var _a;
        try {
            const emailConfig = process.env.EMAIL_USER || ((_a = functions.config().email) === null || _a === void 0 ? void 0 : _a.user);
            if (!emailConfig) {
                functions.logger.warn('Email configuration missing. Email not sent.');
                return;
            }
            await this.transporter.sendMail(Object.assign({ from: `"CCN Cleaning Services" <${emailConfig}>` }, options));
            functions.logger.info(`Email sent successfully to ${options.to}`);
        }
        catch (error) {
            functions.logger.error('Failed to send email:', error);
            // Don't throw error to prevent blocking other operations
        }
    }
    async verifyConnection() {
        try {
            await this.transporter.verify();
            return true;
        }
        catch (error) {
            functions.logger.error('Email service connection failed:', error);
            return false;
        }
    }
}
exports.emailService = new EmailService();
//# sourceMappingURL=emailService.js.map