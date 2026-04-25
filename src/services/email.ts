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
      `Your client portal is ready. Set up your password and log in here:`,
      "",
      inviteLink,
      "",
      `Once you're in, you can follow your project, send us messages, and grab any files we share with you. Day-to-day questions and updates live here so nothing gets lost in email.`,
      "",
      `— Atlas Studio`,
      `You run the business. We hold up your site.`,
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
      `Quick update on "${projectTitle}" — another milestone is done:`,
      "",
      `  ✓ ${milestoneTitle}`,
      "",
      `Log in to your portal for the details.`,
      "",
      `— Atlas Studio`,
      `You run the business. We hold up your site.`,
    ].join("\n"),
  });
}
