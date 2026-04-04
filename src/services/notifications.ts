import pool from "../db/client.js";
import { sendMilestoneUpdate } from "./email.js";

/**
 * Look up the client for a milestone and send them an email notification.
 */
export async function notifyMilestoneComplete(milestoneId: string) {
  const { rows } = await pool.query(
    `SELECT m.title AS milestone_title, p.title AS project_title, c.email, c.name
     FROM milestones m
     JOIN projects p ON p.id = m.project_id
     JOIN clients c ON c.id = p.client_id
     WHERE m.id = $1`,
    [milestoneId],
  );

  if (rows.length === 0) return;

  const row = rows[0];
  await sendMilestoneUpdate(
    row.email,
    row.name,
    row.milestone_title,
    row.project_title,
  );
}
