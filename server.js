// Load environment variables from .env file
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import Inconvo from "inconvo";

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
  })
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
    const conversation = await client.conversations.create({
      context: context,
    });
    return res.json(conversation);
  } catch (error) {
    next(error);
  }
});

app.post("/create-response", async (req, res, next) => {
  const { message, conversationId, stream = false } = req.body;

  try {
    if (stream) {
      // Set headers for Server-Sent Events
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "http://localhost:3232",
        "Access-Control-Allow-Headers": "Cache-Control",
      });

      const streamResponse = client.conversations.response.create(
        conversationId,
        {
          message: message,
          stream: true,
        }
      );

      try {
        for await (const chunk of streamResponse) {
          console.log(chunk);
          // Format the response objects as Server-Sent Events
          const sseMessage = `data: ${JSON.stringify(chunk)}\n\n`;
          res.write(sseMessage);
        }
        // Send the done event
        res.write("data: [DONE]\n\n");
        res.end();
      } catch (error) {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      }
    } else {
      const response = await client.conversations.response.create(
        conversationId,
        {
          message: message,
        }
      );
      return res.json(response);
    }
  } catch (error) {
    if (stream) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    } else {
      next(error);
    }
  }
});

// Create feedback endpoint
app.post(
  "/conversations/:conversationId/response/:responseId/feedback",
  async (req, res, next) => {
    const { conversationId, responseId } = req.params;
    const { rating, comment } = req.body;

    try {
      const feedback = await client.conversations.response.feedback.create({
        conversationId,
        responseId,
        rating,
        comment,
      });
      res.json(feedback);
    } catch (error) {
      console.error("Error creating feedback:", error);
      next(error); // Pass error to Express 5 error handler
    }
  }
);

// Update feedback endpoint
app.patch(
  "/conversations/:conversationId/response/:responseId/feedback/:feedbackId",
  async (req, res, next) => {
    const { conversationId, responseId, feedbackId } = req.params;
    const { rating, comment } = req.body;

    try {
      const feedback = await client.conversations.response.feedback.update({
        conversationId,
        responseId,
        feedbackId,
        rating,
        comment,
      });
      res.json(feedback);
    } catch (error) {
      console.error("Error updating feedback:", error);
      next(error); // Pass error to Express 5 error handler
    }
  }
);

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
