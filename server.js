// Load environment variables from .env file
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import Inconvo from "@inconvoai/node";
import { randomUUID } from "node:crypto";

dotenv.config();
const app = express();

const client = new Inconvo({
  baseURL: process.env.INCONVO_API_BASE_URL,
  apiKey: process.env.INCONVO_API_KEY,
});

// Allow requests from your React app
app.use(
  cors({
    origin: "http://localhost:3232",
  }),
);

app.use(express.static("public"));
app.use(express.json()); // Add this to parse JSON request bodies

// Express 5 error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.post("/create-conversation", async (_req, res, next) => {
  // This is placeholder context for the sample data.
  // In a real application, you would fetch this from your database or other trust source.
  const context = {
    organisationId: 1,
  };

  try {
    const conversation = await client.agents.conversations.create(
      process.env.INCONVO_AGENT_ID,
      {
        userIdentifier: randomUUID().toString(),
        userContext: context,
      },
    );
    return res.json(conversation);
  } catch (error) {
    next(error);
  }
});

app.post("/create-response", async (req, res, next) => {
  const { message, conversationId, stream = false } = req.body;

  try {
    const response = client.agents.conversations.response.create(
      conversationId,
      {
        agentId: process.env.INCONVO_AGENT_ID,
        message,
        stream,
      },
    );

    if (!stream) return res.json(await response);

    // SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    for await (const chunk of response) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    if (stream && res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    } else {
      next(error);
    }
  }
});

// Express 5 enhanced error handling middleware (must be after all routes)
app.use((err, req, res, next) => {
  console.error("Error details:", {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  // Determine appropriate status code
  const statusCode = err.statusCode || err.status || 500;

  // Send error response
  res.status(statusCode).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Something went wrong"
        : err.message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(4242, () => console.log("Running on port 4242"));
