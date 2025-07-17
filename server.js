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

app.post("/create-conversation", async (_req, res) => {
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
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

app.post("/create-response", async (req, res) => {
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
    res.status(500).json({ error: "Failed to get response from Inconvo AI" });
  }
});

// Create feedback endpoint
app.post(
  "/conversations/:conversationId/response/:responseId/feedback",
  async (req, res) => {
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
      res.status(500).json({ error: "Failed to create feedback" });
    }
  }
);

// Update feedback endpoint
app.patch(
  "/conversations/:conversationId/response/:responseId/feedback/:feedbackId",
  async (req, res) => {
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
      res.status(500).json({ error: "Failed to update feedback" });
    }
  }
);

app.listen(4242, () => console.log("Running on port 4242"));
