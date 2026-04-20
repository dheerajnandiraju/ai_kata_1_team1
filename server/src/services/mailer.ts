import nodemailer from 'nodemailer';
import { env } from '../config/env';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false, // STARTTLS
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_APP_PASSWORD,
  },
});

interface NotifyPayload {
  to: string;
  employeeName: string;
  itemName: string;
  quantity: number;
  status: 'approved' | 'rejected';
  rejectionReason?: string;
}

export const sendRequestStatusEmail = async (payload: NotifyPayload): Promise<void> => {
  if (!env.SMTP_USER || !env.SMTP_APP_PASSWORD) {
    console.warn('SMTP not configured — skipping email notification');
    return;
  }

  const { to, employeeName, itemName, quantity, status, rejectionReason } = payload;

  const isApproved = status === 'approved';
  const statusLabel = isApproved ? '✅ Approved' : '❌ Rejected';
  const statusColor = isApproved ? '#16a34a' : '#dc2626';

  const subject = `Supply Request ${isApproved ? 'Approved' : 'Rejected'}: ${itemName} (x${quantity})`;

  const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#2563eb,#7c3aed);padding:24px 28px">
        <h2 style="color:#fff;margin:0;font-size:20px">Office Supply Management</h2>
      </div>
      <div style="padding:28px">
        <p style="margin:0 0 16px;color:#374151;font-size:15px">Hi <strong>${employeeName}</strong>,</p>
        <p style="margin:0 0 20px;color:#374151;font-size:15px">Your supply request has been updated:</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
          <tr>
            <td style="padding:10px 14px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;color:#6b7280;width:120px">Item</td>
            <td style="padding:10px 14px;border:1px solid #e5e7eb;color:#111827">${itemName}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;color:#6b7280">Quantity</td>
            <td style="padding:10px 14px;border:1px solid #e5e7eb;color:#111827">${quantity}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;color:#6b7280">Status</td>
            <td style="padding:10px 14px;border:1px solid #e5e7eb"><span style="color:${statusColor};font-weight:700">${statusLabel}</span></td>
          </tr>
          ${rejectionReason ? `
          <tr>
            <td style="padding:10px 14px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;color:#6b7280">Reason</td>
            <td style="padding:10px 14px;border:1px solid #e5e7eb;color:#111827">${rejectionReason}</td>
          </tr>` : ''}
        </table>
        ${isApproved
          ? '<p style="margin:0;color:#374151;font-size:14px">Your items will be available for pickup shortly.</p>'
          : '<p style="margin:0;color:#374151;font-size:14px">Please contact your admin if you have questions.</p>'}
      </div>
      <div style="background:#f9fafb;padding:16px 28px;border-top:1px solid #e5e7eb">
        <p style="margin:0;color:#9ca3af;font-size:12px">This is an automated notification from the Office Supply Management System.</p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"OSMS Notifications" <${env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`📧 Notification sent to ${to} — ${status}`);
  } catch (err) {
    console.error('Failed to send email notification:', err);
    // Don't throw — email failure should not block the approval/rejection flow
  }
};
