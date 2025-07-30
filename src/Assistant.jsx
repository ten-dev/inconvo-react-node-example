import { useState } from "react";
import "./App.css";
import { BarChart, LineChart } from "react-chartkick";
import "chartkick/chart.js";

const MessageInput = ({ message, setMessage, isLoading, conversationId }) => {
  const handleChange = (e) => {
    setMessage(e.target.value);
  };

  return (
    <label>
      Enter message:
      <input
        id="message"
        type="text"
        disabled={!conversationId || isLoading}
        value={message}
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

const ResponseOutput = ({ response }) => {
  if (!response || Object.keys(response).length === 0) {
    return <div>Send a message to see a response here</div>;
  }

  switch (response.type) {
    case "text":
      return <div>{response.message}</div>;

    case "table":
      return (
        <table>
          <caption>{response.message}</caption>
          <thead>
            <tr>
              {response.table.head.map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {response.table.body.map((row, i) => (
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
      const data = response.chart.data.map((item) => [item.label, item.value]);
      switch (response.chart.type) {
        case "bar":
          return (
            <div className="chart-container">
              <div>{response.message}</div>
              <BarChart data={data} round={2} thousands="," width="400px" />
            </div>
          );
        case "line":
          return (
            <div className="chart-container">
              <div>{response.message}</div>
              <LineChart data={data} round={2} thousands="," width="400px" />
            </div>
          );
        default:
          return <div>Unsupported chart type</div>;
      }
    }

    default:
      console.error("Unsupported response type:", response.type);
      return <div>Unsupported response type</div>;
  }
};

const Assistant = () => {
  const [message, setMessage] = useState("");
  const [messageResponsePairs, setMessageResponsePairs] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const createNewConversation = async () => {
    setConversationId(null);
    setMessage("");
    setMessageResponsePairs([]);
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
      console.log("Submitting message:", message);
      console.log("Payload:", {
        message,
        ...(conversationId ? { conversationId } : {}),
      });
      const res = await fetch(`http://localhost:4242/create-response`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
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

      setMessageResponsePairs((prevMessageResponsePairs) => [
        ...prevMessageResponsePairs,
        { message, response: data },
      ]);
    } catch (err) {
      console.error("Error submitting message:", err);
    } finally {
      setIsLoading(false);
      setMessage("");
    }
  };

  return (
    <div>
      <div style={{ textAlign: "center" }}>
        <button onClick={createNewConversation}>New conversation</button>
        {conversationId && (
          <div className="conversation-id">{conversationId}</div>
        )}
      </div>
      <section>
        {messageResponsePairs.length > 0 && (
          <div className="conversation-history">
            {messageResponsePairs.map((messageResponsePair, index) => (
              <div key={index} className="message-response-pair">
                <div className="message-container">
                  <p className="message">{messageResponsePair.message}</p>
                </div>
                <div className="response-container">
                  <ResponseOutput response={messageResponsePair.response} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <form onSubmit={handleSubmit}>
        <MessageInput
          message={message}
          setMessage={setMessage}
          isLoading={isLoading}
          conversationId={conversationId}
        />
        <button disabled={isLoading || !conversationId} id="submit">
          {isLoading ? `Thinking ...` : `Submit`}
        </button>
      </form>
    </div>
  );
};

export default Assistant;
