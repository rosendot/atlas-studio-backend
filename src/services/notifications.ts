import { eq } from "drizzle-orm";
import { getDb, schema } from "../db/client";
import { sendMilestoneUpdate } from "./email";
import type { Bindings } from "../../worker-configuration";

/**
 * Look up the client for a milestone and send them an email notification.
 */
export async function notifyMilestoneComplete(
  env: Bindings,
  milestoneId: string,
) {
  const db = getDb(env);

  const [row] = await db
    .select({
      milestoneTitle: schema.milestones.title,
      projectTitle: schema.projects.title,
      email: schema.clients.email,
      name: schema.clients.name,
    })
    .from(schema.milestones)
    .innerJoin(schema.projects, eq(schema.projects.id, schema.milestones.projectId))
    .innerJoin(schema.clients, eq(schema.clients.id, schema.projects.clientId))
    .where(eq(schema.milestones.id, milestoneId))
    .limit(1);

  if (!row) return;

  await sendMilestoneUpdate(
    env,
    row.email,
    row.name,
    row.milestoneTitle,
    row.projectTitle,
  );
}
