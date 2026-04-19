import { NextResponse } from "next/server";
import { mailOptions, transporter } from "@/config/nodemailer";

type TransferRequestBody = {
  eventId: string;
  eventName?: string;
  eventVenue?: string;
  eventDate?: string;
  selectedTicket?: {
    id: string;
    label: string;
    tier: string;
    reference: string;
  };
  recipientEmail?: string;
  message?: string;
  senderName?: string;
  senderEmail?: string;
};

function getTransferHtml(data: TransferRequestBody, acceptLink: string) {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <body style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <div style="max-width: 680px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
          <h1 style="margin-bottom: 12px;">Ticket Transfer</h1>
          <p>You have received a ticket transfer request.</p>

          <p><strong>Event:</strong> ${data.eventName ?? "Not available"}</p>
          <p><strong>Date:</strong> ${data.eventDate ?? "Not available"}</p>
          <p><strong>Location:</strong> ${data.eventVenue ?? "Not available"}</p>
          <p><strong>Ticket:</strong> ${data.selectedTicket?.label ?? "Not available"} ${data.selectedTicket?.tier ?? ""}</p>
          <p><strong>Reference:</strong> ${data.selectedTicket?.reference ?? "Not available"}</p>
          <p><strong>Sender:</strong> ${data.senderName ?? "Ticket Owner"}</p>
          <p><strong>Sender Email:</strong> ${data.senderEmail ?? "owner@example.com"}</p>
          ${data.message ? `<p><strong>Message:</strong> ${data.message}</p>` : ""}

          <p style="margin-top: 20px;">
            <a
              href="${acceptLink}"
              style="display:inline-block;padding:12px 20px;background:#0f4c5c;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;"
            >
              Accept Ticket
            </a>
          </p>
        </div>
      </body>
    </html>
  `;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as TransferRequestBody;

    if (!body.eventId || !body.selectedTicket || !body.recipientEmail) {
      return NextResponse.json(
        { success: false, message: "Missing required transfer details." },
        { status: 400 }
      );
    }

    await transporter.verify();

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3003";
    const acceptLink = `${baseUrl}/events/${body.eventId}/transfer/status?accept=true`;
  


    await transporter.sendMail({
      ...mailOptions,
      to: body.recipientEmail,
      subject: `Ticket Transfer for ${body.eventName ?? "Event"}`,
      html: getTransferHtml(body, acceptLink)
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send transfer email.";

    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
