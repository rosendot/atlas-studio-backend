import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

const uuid = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
  integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`);

/**
 * Better Auth tables. Names match Better Auth's defaults so the adapter
 * picks them up automatically. If you rename, also update the `schema`
 * mapping in src/lib/auth.ts.
 */
export const users = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const sessions = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verifications = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .default(sql`(unixepoch())`),
});

export const leads = sqliteTable("leads", {
  id: uuid(),
  name: text("name").notNull(),
  business: text("business").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  pos: text("pos"),
  website: text("website"),
  message: text("message"),
  status: text("status").notNull().default("new"),
  createdAt: createdAt(),
});

export const clients = sqliteTable("clients", {
  id: uuid(),
  leadId: text("lead_id").references(() => leads.id),
  authUid: text("auth_uid")
    .notNull()
    .unique()
    .references(() => users.id),
  name: text("name").notNull(),
  business: text("business").notNull(),
  email: text("email").notNull().unique(),
  createdAt: createdAt(),
});

export const projects = sqliteTable("projects", {
  id: uuid(),
  clientId: text("client_id").references(() => clients.id),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("discovery"),
  startDate: text("start_date"),
  launchDate: text("launch_date"),
  siteUrl: text("site_url"),
  createdAt: createdAt(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const milestones = sqliteTable("milestones", {
  id: uuid(),
  projectId: text("project_id").references(() => projects.id),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"),
  dueDate: text("due_date"),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

export const messages = sqliteTable("messages", {
  id: uuid(),
  projectId: text("project_id").references(() => projects.id),
  senderUid: text("sender_uid").notNull(),
  senderRole: text("sender_role").notNull(),
  body: text("body").notNull(),
  readAt: integer("read_at", { mode: "timestamp" }),
  createdAt: createdAt(),
});

export const files = sqliteTable("files", {
  id: uuid(),
  projectId: text("project_id").references(() => projects.id),
  uploadedBy: text("uploaded_by").notNull(),
  filename: text("filename").notNull(),
  storagePath: text("storage_path").notNull(),
  fileType: text("file_type"),
  sizeBytes: integer("size_bytes"),
  createdAt: createdAt(),
});
