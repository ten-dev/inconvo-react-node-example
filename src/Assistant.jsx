import React, { useState } from "react";
import "./App.css";
import { BarChart, LineChart } from "react-chartkick";
import "chartkick/chart.js";

const QuestionInput = ({
  question,
  setQuestion,
  isLoading,
  conversationId,
}) => {
  const handleChange = (e) => {
    setQuestion(e.target.value);
  };

  return (
    <label>
      Enter message:
      <input
        id="question"
        type="text"
        disabled={!conversationId || isLoading}
        value={question}
        onChange={handleChange}
        placeholder={
          conversationId
            ? "What is our most popular product?"
            : "Start a new conversation"
        }
      />
    </label>
  );
};

const AnswerOutput = ({ answer }) => {
  if (!answer || Object.keys(answer).length === 0) {
    return <div>Ask a question to see the answer here</div>;
  }

  switch (answer.type) {
    case "text":
      return <div>{answer.message}</div>;

    case "table":
      return (
        <table>
          <caption>{answer.message}</caption>
          <thead>
            <tr>
              {answer.table.head.map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {answer.table.body.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );

    case "chart": {
      const data = answer.chart.data.map((item) => [item.label, item.value]);
      switch (answer.chart.type) {
        case "bar":
          return (
            <div className="chart-container">
              <div>{answer.message}</div>
              <BarChart data={data} round={2} thousands="," width="400px" />
            </div>
          );
        case "line":
          return (
            <div className="chart-container">
              <div>{answer.message}</div>
              <LineChart data={data} round={2} thousands="," width="400px" />
            </div>
          );
        default:
          return <div>Unsupported chart type</div>;
      }
    }

    default:
      return <div>Unsupported answer type</div>;
  }
};

const Assistant = () => {
  const [question, setQuestion] = useState("");
  const [qaPairs, setQaPairs] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const resetConversation = () => {
    setQuestion("");
    setQaPairs([]);
    setConversationId(null);
  };

  const createConversation = async () => {
    try {
      const res = await fetch(`http://localhost:4242/create-conversation`, {
        method: "POST",
      });
      const conversation = await res.json();
      setConversationId(conversation.id);
    } catch (err) {
      console.error("Error creating conversation:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log("Submitting question:", question);
      console.log("Payload:", {
        question,
        ...(conversationId ? { conversationId } : {}),
      });
      const res = await fetch(`http://localhost:4242/create-response`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
          ...(conversationId ? { conversationId } : {}),
        }),
      });

      if (!res.ok) {
        throw new Error(`Server responded with status: ${res.status}`);
      }

      const data = await res.json();
      console.log("Response data:", data);

      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }

      setQaPairs((prevQaPairs) => [...prevQaPairs, { question, answer: data }]);
    } catch (err) {
      console.error("Error submitting question:", err);
    } finally {
      setIsLoading(false);
      setQuestion("");
    }
  };

  return (
    <div>
      {conversationId ?? conversationId}

      <button onClick={createConversation}>New conversation</button>
      <section>
        {qaPairs.length > 0 && (
          <div className="conversation-history">
            {qaPairs.map((qaPair, index) => (
              <div key={index} className="qa-pair">
                <div className="question-container">
                  <p className="question">{qaPair.question}</p>
                </div>
                <div className="answer-container">
                  <AnswerOutput answer={qaPair.answer} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <form onSubmit={handleSubmit}>
        <QuestionInput
          question={question}
          setQuestion={setQuestion}
          isLoading={isLoading}
          conversationId={conversationId}
        />
        <button disabled={isLoading | !conversationId} id="submit">
          {isLoading ? `Thinking ...` : `Submit`}
        </button>
      </form>
    </div>
  );
};

export default Assistant;
