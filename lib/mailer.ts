import nodemailer from "nodemailer";

export function getTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.SMTP_FROM) {
    throw new Error("SMTP is not configured");
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

export async function sendSponsorEmail(params: {
  to: string;
  sponsorType: string;
  eventTitle: string;
}) {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: params.to,
    subject: `Sponsorship Invitation: ${params.eventTitle}`,
    text: `You are invited as a ${params.sponsorType} sponsor for ${params.eventTitle}. Please reply for package details.`
  });
}

export async function sendTicketApprovedEmail(params: {
  to: string;
  userName: string;
  eventTitle: string;
}) {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: params.to,
    subject: `Payment Verified: ${params.eventTitle}`,
    text: `Hi ${params.userName}, your payment slip for "${params.eventTitle}" has been verified successfully. Your ticket request is now approved.`
  });
}

export async function sendRefundApprovedEmail(params: {
  to: string;
  userName: string;
  eventTitle: string;
  amount: string;
}) {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: params.to,
    subject: `Refund Approved: ${params.eventTitle}`,
    text: `Hi ${params.userName}, your refund request for "${params.eventTitle}" has been approved. Amount: ${params.amount}. The refund will be processed shortly.`
  });
}

export async function sendRefundRejectedEmail(params: {
  to: string;
  userName: string;
  eventTitle: string;
  reason: string;
}) {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: params.to,
    subject: `Refund Rejected: ${params.eventTitle}`,
    text: `Hi ${params.userName}, your refund request for "${params.eventTitle}" has been rejected. Reason: ${params.reason}`
  });
}

export async function sendRefundRequestNotification(params: {
  to: string;
  userName: string;
  userEmail: string;
  eventTitle: string;
  amount: string;
  reason: string;
  refundId: string;
}) {
  const transporter = getTransporter();
  const adminDashboardLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/admin?view=pending-refunds`;
  
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: params.to,
    subject: `New Refund Request: ${params.eventTitle}`,
    html: `
      <h2>New Refund Request Received</h2>
      <p><strong>User:</strong> ${params.userName} (${params.userEmail})</p>
      <p><strong>Event:</strong> ${params.eventTitle}</p>
      <p><strong>Amount:</strong> $${params.amount}</p>
      <p><strong>Reason:</strong> ${params.reason}</p>
      <p><strong>Request ID:</strong> ${params.refundId}</p>
      <hr>
      <p><a href="${adminDashboardLink}">Review in Admin Dashboard</a></p>
    `,
    text: `New Refund Request\n\nUser: ${params.userName} (${params.userEmail})\nEvent: ${params.eventTitle}\nAmount: $${params.amount}\nReason: ${params.reason}\n\nRequest ID: ${params.refundId}\n\nReview it in your admin dashboard.`
  });
}
