import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import type { Bindings, Variables } from "../worker-configuration";
import { getAuth } from "./lib/auth";
import { leadsRouter } from "./routes/leads";
import { authRouter } from "./routes/auth";
import { clientsRouter } from "./routes/clients";
import { projectsRouter } from "./routes/projects";
import { milestonesRouter } from "./routes/milestones";
import { messagesRouter } from "./routes/messages";
import { filesRouter } from "./routes/files";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use(
  "*",
  secureHeaders({
    strictTransportSecurity: "max-age=63072000; includeSubDomains; preload",
    xContentTypeOptions: "nosniff",
    referrerPolicy: "no-referrer",
    xFrameOptions: "DENY",
  }),
);

app.use("*", (c, next) => {
  // Normalize FRONTEND_URL — strip trailing slash, and explicitly allow the
  // origin plus its www variant. Anything else is rejected.
  const origin = c.env.FRONTEND_URL.replace(/\/$/, "");
  const url = new URL(origin);
  const allowed = new Set([origin, `${url.protocol}//www.${url.hostname}`]);
  return cors({
    origin: (incoming) => (allowed.has(incoming) ? incoming : null),
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  })(c, next);
});

app.get("/health", (c) => c.json({ status: "ok" }));

// Better Auth handles sign-in, sign-up, OAuth callbacks, password reset, etc.
// Mount it under /api/auth/* — that path is hard-coded into the client SDK
// and the URLs Better Auth bakes into emails, so don't change it lightly.
app.on(["GET", "POST"], "/api/auth/*", (c) => {
  const auth = getAuth(c.env);
  return auth.handler(c.req.raw);
});

app.route("/leads", leadsRouter);
app.route("/auth", authRouter);
app.route("/clients", clientsRouter);
app.route("/projects", projectsRouter);
app.route("/milestones", milestonesRouter);
app.route("/messages", messagesRouter);
app.route("/files", filesRouter);

app.onError((err, c) => {
  // Log only the message + a stable identifier — not the stack — so Workers
  // logs don't accumulate full request bodies / user-controlled strings.
  console.error("Unhandled error:", err.name, err.message);
  return c.json({ error: "Internal server error" }, 500);
});

export default app;
