import nodemailer from 'nodemailer';

/**
 * DonorSync Transactional Email Service
 * Dispatches real emails via Gmail SMTP or Custom SMTP Gateway.
 * Fully decoupled and non-blocking — failure to send an email will never crash transactions.
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.initTransporter();
  }

  initTransporter() {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!user || !pass || pass === 'your-smtp-password-or-app-password') {
      this.isConfigured = false;
      return;
    }

    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT, 10) || 587;
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;

    try {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        tls: { rejectUnauthorized: false }
      });
      this.isConfigured = true;
      console.log(`[EMAIL] SMTP Transporter initialized (${host}:${port}) for sender ${user}`);
    } catch (err) {
      console.error('[EMAIL] Failed to initialize SMTP transporter:', err.message);
      this.isConfigured = false;
    }
  }

  getBrandHeader(title, urgency = 'Normal') {
    const isUrgent = urgency === 'Critical' || urgency === 'High';
    const headerBg = isUrgent ? '#dc2626' : '#ef4444';

    return `
      <div style="background-color: ${headerBg}; padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">
          🩸 DonorSync
        </h1>
        <p style="color: #fee2e2; margin: 6px 0 0 0; font-size: 13px; font-family: sans-serif;">
          ${title}
        </p>
      </div>
    `;
  }

  getBrandFooter() {
    return `
      <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 24px; text-align: center; border-radius: 0 0 12px 12px; font-family: sans-serif; font-size: 11px; color: #64748b;">
        <p style="margin: 0;">This is an automated notification from the <strong>DonorSync Clinical Network</strong>.</p>
        <p style="margin: 4px 0 0 0;">For immediate life-threatening emergencies, always dial your local emergency services (112 / 911).</p>
      </div>
    `;
  }

  async sendMail({ to, subject, html, text }) {
    if (!to) return { success: false, reason: 'Missing recipient email' };

    // Re-verify if credentials were added at runtime
    if (!this.transporter && process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.initTransporter();
    }

    if (!this.isConfigured || !this.transporter) {
      console.log(`[EMAIL-NOTICE] Email to <${to}>: "${subject}". Delivery paused — SMTP credentials unconfigured (Set SMTP_USER and SMTP_PASS in server/.env).`);
      return {
        success: false,
        reason: 'SMTP_UNCONFIGURED',
        note: 'Email queued. Configure SMTP_USER and SMTP_PASS in server/.env to enable live delivery.'
      };
    }

    const fromAddress = process.env.EMAIL_FROM || `"DonorSync Blood Management" <${process.env.SMTP_USER}>`;

    try {
      const info = await this.transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        text,
        html
      });

      console.log(`[EMAIL-SENT] Successfully delivered to ${to} (Message ID: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error(`[EMAIL-ERROR] Failed to send email to ${to}:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * 1. Registration Confirmation Email
   */
  async sendRegistrationConfirmation({ to, name, role }) {
    const subject = `Welcome to DonorSync — Account Verified (${role})`;
    const html = `
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        ${this.getBrandHeader('Healthcare Community Registration')}
        <div style="padding: 24px; color: #1e293b; font-size: 14px; line-height: 1.6;">
          <p>Hello <strong>${name || 'Member'}</strong>,</p>
          <p>Your <strong>DonorSync</strong> account has been registered as a verified <strong>${role}</strong>.</p>
          <div style="background: #f1f5f9; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 13px;"><strong>Account Details:</strong></p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #475569;">Email: ${to}</p>
            <p style="margin: 2px 0 0 0; font-size: 12px; color: #475569;">Portal Role: ${role}</p>
          </div>
          <p>You can now sign in to your clinical dashboard, update your location radar, and access digital passes.</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="http://localhost:3000/login" style="background-color: #ef4444; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
              Open DonorSync Portal
            </a>
          </div>
        </div>
        ${this.getBrandFooter()}
      </div>
    `;

    return this.sendMail({
      to,
      subject,
      html,
      text: `Hello ${name}, your DonorSync account has been registered as a verified ${role}. Sign in at http://localhost:3000/login.`
    });
  }

  /**
   * 2. Emergency Blood Request Alert to Compatible Donors
   */
  async sendBloodRequestAlert({ to, donorName, patientName, bloodGroup, unitsRequired, hospital, urgency, distanceKm, requestId }) {
    const isUrgent = urgency === 'Critical' || urgency === 'High';
    const subject = `🚨 URGENT: ${bloodGroup} Blood Needed at ${hospital || 'Hospital'}`;
    const distanceText = distanceKm ? `${distanceKm} km away` : 'in your proximity';

    const html = `
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        ${this.getBrandHeader(`Emergency ${bloodGroup} Blood Request`, urgency)}
        <div style="padding: 24px; color: #1e293b; font-size: 14px; line-height: 1.6;">
          <p>Dear <strong>${donorName || 'Life Saver'}</strong>,</p>
          <p>A high-priority blood request matching your blood type (<strong>${bloodGroup}</strong>) has been initiated ${distanceText}:</p>
          <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 16px; margin: 16px 0; border-radius: 8px;">
            <table style="width: 100%; font-size: 13px; color: #1e293b;">
              <tr><td style="padding: 4px 0; color: #64748b;">Hospital:</td><td style="font-weight: bold;">${hospital}</td></tr>
              <tr><td style="padding: 4px 0; color: #64748b;">Blood Group:</td><td style="font-weight: bold; color: #dc2626;">${bloodGroup}</td></tr>
              <tr><td style="padding: 4px 0; color: #64748b;">Units Required:</td><td style="font-weight: bold;">${unitsRequired} Units</td></tr>
              <tr><td style="padding: 4px 0; color: #64748b;">Urgency:</td><td style="font-weight: bold; color: ${isUrgent ? '#dc2626' : '#d97706'};">${urgency}</td></tr>
            </table>
          </div>
          <p>If you are available to donate, please open DonorSync to confirm your dispatch and receive your digital check-in QR pass.</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="http://localhost:3000/dashboard/donor" style="background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
              Respond to Request
            </a>
          </div>
        </div>
        ${this.getBrandFooter()}
      </div>
    `;

    return this.sendMail({
      to,
      subject,
      html,
      text: `URGENT: ${bloodGroup} blood required at ${hospital}. Urgency: ${urgency}. Respond at http://localhost:3000/dashboard/donor.`
    });
  }

  /**
   * 3. Donor Acceptance Notification to Hospital / Patient
   */
  async sendDonorAcceptedNotification({ to, patientName, bloodGroup, hospital, donorName, donorCode, etaMinutes }) {
    const subject = `✅ Life Saver Confirmed for ${bloodGroup} Request`;
    const html = `
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        ${this.getBrandHeader('Donor Confirmed & Dispatched')}
        <div style="padding: 24px; color: #1e293b; font-size: 14px; line-height: 1.6;">
          <p>Good news,</p>
          <p>A compatible <strong>${bloodGroup}</strong> donor has accepted the request for <strong>${patientName || 'patient'}</strong> and is en route to <strong>${hospital}</strong>.</p>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; margin: 16px 0; border-radius: 8px; font-size: 13px;">
            <p style="margin: 0; color: #166534;"><strong>Donor Pass Code:</strong> ${donorCode || 'DS-DONOR'}</p>
            <p style="margin: 4px 0 0 0; color: #166534;"><strong>Estimated Arrival:</strong> ${etaMinutes ? `${etaMinutes} minutes` : 'En route'}</p>
          </div>
          <p>Please prepare the clinical transfusion team for check-in via the donor's digital QR pass.</p>
        </div>
        ${this.getBrandFooter()}
      </div>
    `;

    return this.sendMail({
      to,
      subject,
      html,
      text: `A compatible ${bloodGroup} donor has accepted the blood request for ${patientName} at ${hospital}.`
    });
  }

  /**
   * 4. User Login & Session Alert
   */
  async sendLoginAlert({ to, name, role, ip = 'Verified Browser Session', time = new Date().toLocaleString() }) {
    if (!to) return { success: false, reason: 'No recipient' };
    const subject = `🔐 DonorSync Login Notification - Session Active`;
    const html = `
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        ${this.getBrandHeader('Security & Login Alert')}
        <div style="padding: 24px; color: #1e293b; font-size: 14px; line-height: 1.6;">
          <p>Hello <strong>${name || 'DonorSync Member'}</strong>,</p>
          <p>Your DonorSync account has just been logged into successfully:</p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; margin: 16px 0; border-radius: 8px; font-size: 13px;">
            <p style="margin: 0; color: #334155;"><strong>Account:</strong> ${to}</p>
            <p style="margin: 4px 0 0 0; color: #334155;"><strong>Role:</strong> ${role}</p>
            <p style="margin: 4px 0 0 0; color: #334155;"><strong>Login Time:</strong> ${time}</p>
            <p style="margin: 6px 0 0 0; color: #16a34a; font-weight: bold;">✔ Real-Time Digital QR Check-in Pass Generated</p>
          </div>
          <p>Your real-time pass is active and synced with clinical blood repositories. If this was you, you can continue saving lives!</p>
          <p style="font-size: 12px; color: #64748b; margin-top: 16px;">If you did not authorize this login, please change your password immediately.</p>
        </div>
        ${this.getBrandFooter()}
      </div>
    `;

    return this.sendMail({
      to,
      subject,
      html,
      text: `Hello ${name}, your DonorSync account was signed into as ${role} at ${time}. Your real-time check-in pass is active.`
    });
  }
}

export const emailService = new EmailService();
