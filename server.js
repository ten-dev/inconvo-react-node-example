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

app.post("/create-answer", async (req, res) => {
  const { question, conversationId } = req.body;

  // This is placeholder context for the sample data.
  // In a real application, you would fetch this from your database or other trust source.
  const context = {
    organisationId: 1,
  };

  try {
    const response = await fetch(
      "https://app.inconvo.ai/api/v1/conversations/answer",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.INCONVO_API_KEY}`,
        },
        body: JSON.stringify({
          question,
          context,
          ...(conversationId ? { conversationId } : {}),
        }),
      }
    );

    const answer = await response.json();

    res.json(answer);
  } catch (error) {
    console.error("Error from Inconvo AI:", error);
    res.status(500).json({ error: "Failed to get response from Inconvo AI" });
  }
});

app.listen(4242, () => console.log("Running on port 4242"));
