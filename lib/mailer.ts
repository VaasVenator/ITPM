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
