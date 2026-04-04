import express from "express";
import cors from "cors";
import { errorHandler } from "./middleware/errorHandler.js";
import { leadsRouter } from "./routes/leads.js";
import { authRouter } from "./routes/auth.js";
import { projectsRouter } from "./routes/projects.js";
import { milestonesRouter } from "./routes/milestones.js";
import { messagesRouter } from "./routes/messages.js";
import { filesRouter } from "./routes/files.js";

const app = express();
const port = parseInt(process.env.PORT || "8080");

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:4321" }));
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Routes
app.use("/leads", leadsRouter);
app.use("/auth", authRouter);
app.use("/projects", projectsRouter);
app.use("/milestones", milestonesRouter);
app.use("/messages", messagesRouter);
app.use("/files", filesRouter);

// Error handler (must be last)
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app;
