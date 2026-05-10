import { Resend } from "resend";
import type { Bindings } from "../../worker-configuration";
import { STUDIO_EMAIL } from "../lib/studio";
import { stripNewlines } from "../utils/validate";

const FROM = STUDIO_EMAIL;
const ADMIN_EMAIL = STUDIO_EMAIL;

function client(env: Bindings) {
  return new Resend(env.RESEND_API_KEY);
}

/** Notify admin of a new lead */
export async function sendLeadAlert(
  env: Bindings,
  lead: {
    name: string;
    business: string;
    email: string;
    phone?: string;
    pos?: string;
    website?: string;
    message?: string;
  },
) {
  await client(env).emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: stripNewlines(`New inquiry — ${lead.business}`).slice(0, 200),
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

/** Notify client of a milestone update */
export async function sendMilestoneUpdate(
  env: Bindings,
  email: string,
  clientName: string,
  milestoneTitle: string,
  projectTitle: string,
) {
  await client(env).emails.send({
    from: FROM,
    to: email,
    subject: stripNewlines(`Milestone completed — ${milestoneTitle}`).slice(0, 200),
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
    ].join("\n"),
  });
}
