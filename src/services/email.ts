import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "inquiry@atlasstudio.com";
const ADMIN_EMAIL = "you@atlasstudio.com";

/** Notify admin of a new lead */
export async function sendLeadAlert(lead: {
  name: string;
  business: string;
  email: string;
  phone?: string;
  pos?: string;
  website?: string;
  message?: string;
}) {
  await resend.emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `New inquiry — ${lead.business}`,
    text: [
      `Name: ${lead.name}`,
      `Business: ${lead.business}`,
      `Email: ${lead.email}`,
      `Phone: ${lead.phone || "Not provided"}`,
      `POS: ${lead.pos || "Not specified"}`,
      `Current website: ${lead.website || "None"}`,
      "",
      `Message:`,
      `${lead.message || "No message provided"}`,
    ].join("\n"),
  });
}

/** Send portal invite to a new client */
export async function sendClientInvite(
  email: string,
  name: string,
  inviteLink: string,
) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Your client portal is ready",
    text: [
      `Hi ${name},`,
      "",
      `Your client portal is ready. Use the link below to set up your password and log in:`,
      "",
      inviteLink,
      "",
      `Once logged in you can track your project progress, send us messages, and share files.`,
      "",
      `— Atlas Studio`,
    ].join("\n"),
  });
}

/** Notify client of a milestone update */
export async function sendMilestoneUpdate(
  email: string,
  clientName: string,
  milestoneTitle: string,
  projectTitle: string,
) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Milestone completed — ${milestoneTitle}`,
    text: [
      `Hi ${clientName},`,
      "",
      `A milestone on your project "${projectTitle}" has been completed:`,
      "",
      `  ✓ ${milestoneTitle}`,
      "",
      `Log in to your portal to see the full update.`,
      "",
      `— Atlas Studio`,
    ].join("\n"),
  });
}
