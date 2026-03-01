import nodemailer from "nodemailer";

export function getTransporter() {
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
