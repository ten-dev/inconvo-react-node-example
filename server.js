// Load environment variables from .env file
require("dotenv").config();

const express = require("express");
const app = express();

// Add these lines to enable CORS
const cors = require("cors");
app.use(
  cors({
    origin: "http://localhost:3232", // Allow requests from your React app
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
    const response = await fetch(
      `${process.env.INCONVO_API_BASE_URL}/conversations/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.INCONVO_API_KEY}`,
        },
        body: JSON.stringify({
          context,
        }),
      }
    );
    if (!response.ok) {
      throw new Error(`Failed to create conversation: ${response.status}`);
    }
    const data = await response.json();
    console.log(data);
    res.json(data);
  } catch (error) {
    console.error("Error creating conversation:", error);
    next(error); // Pass error to Express 5 error handler
  }
});

app.post("/create-response", async (req, res, next) => {
  const { message, conversationId } = req.body;

  try {
    const response = await fetch(
      `${process.env.INCONVO_API_BASE_URL}/conversations/${conversationId}/response/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.INCONVO_API_KEY}`,
        },
        body: JSON.stringify({
          message,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to create response: ${response.status}`);
    }

    const inconvoResponse = await response.json();
    res.json(inconvoResponse);
  } catch (error) {
    console.error("Error from Inconvo AI:", error);
    next(error); // Pass error to Express 5 error handler
  }
});

// Create feedback endpoint
app.post(
  "/conversations/:conversationId/response/:responseId/feedback",
  async (req, res, next) => {
    const { conversationId, responseId } = req.params;
    const { rating, comment } = req.body;

    try {
      const response = await fetch(
        `${process.env.INCONVO_API_BASE_URL}/conversations/${conversationId}/response/${responseId}/feedback/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.INCONVO_API_KEY}`,
          },
          body: JSON.stringify({
            rating,
            comment,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to create feedback: ${response.status}`);
      }

      const feedback = await response.json();
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
      const response = await fetch(
        `${process.env.INCONVO_API_BASE_URL}/conversations/${conversationId}/response/${responseId}/feedback/${feedbackId}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.INCONVO_API_KEY}`,
          },
          body: JSON.stringify({
            rating,
            comment,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to update feedback: ${response.status}`);
      }

      const feedback = await response.json();
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
