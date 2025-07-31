import { useState } from "react";
import "./App.css";
import { BarChart, LineChart } from "react-chartkick";
import "chartkick/chart.js";

const MessageInput = ({ message, setMessage, conversationId }) => (
  <label>
    Enter message:
    <input
      id="message"
      type="text"
      disabled={!conversationId}
      value={message}
      onChange={(e) => setMessage(e.target.value)}
      placeholder={conversationId ? "What is our most popular product?" : "Start a new conversation"}
    />
  </label>
);

const ResponseOutput = ({ response, isStreaming, streamingSteps }) => {
  if (isStreaming) {
    return (
      <div className="streaming-container">
        <div className="streaming-status">Processing...</div>
        <div className="streaming-steps">
          {streamingSteps.map((step, index) => (
            <div key={index} className="streaming-step">
              <span className="step-name">{step.step}:</span> {step.message}
            </div>
          ))}
        </div>
      </div>
    );
  }

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
      return <div>Unsupported response type</div>;
  }
};

const Assistant = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingSteps, setStreamingSteps] = useState([]);

  const createNewConversation = async () => {
    setConversationId(null);
    setMessage("");
    setMessages([]);
    setStreamingSteps([]);
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

  const handleStreamingResponse = async (userMessage) => {
    setIsStreaming(true);
    setStreamingSteps([]);
    
    // Add user message immediately
    const userMsg = { message: userMessage, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);

    try {
      const response = await fetch(`http://localhost:4242/create-response`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
        },
        body: JSON.stringify({
          message: userMessage,
          conversationId,
          stream: true,
        }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') {
              setIsStreaming(false);
              setStreamingSteps([]);
              return;
            }

            try {
              const data = JSON.parse(dataStr);
              
              if (data.type === "agent_step") {
                setStreamingSteps(prev => [...prev, { step: data.step, message: data.message }]);
              } else if (data.type === "completed") {
                setMessages(prev => [...prev, { ...data.response, id: data.id }]);
                setIsStreaming(false);
                setStreamingSteps([]);
                return;
              }
            } catch (error) {
              console.error("Error parsing streaming data:", error, "Data was:", dataStr);
            }
          }
        }
      }
      
      setIsStreaming(false);
      setStreamingSteps([]);
    } catch (error) {
      console.error("Error with streaming request:", error);
      setIsStreaming(false);
      setStreamingSteps([]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    const userMessage = message;
    setMessage("");
    handleStreamingResponse(userMessage);
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
        {messages.map((msg, index) => (
          <div key={index} className="message-response-pair">
            <div className={msg.id ? "response-container" : "message-container"}>
              {msg.id ? (
                <ResponseOutput response={msg} />
              ) : (
                <p className="question">{msg.message}</p>
              )}
            </div>
          </div>
        ))}
        {isStreaming && (
          <div className="response-container">
            <ResponseOutput 
              response={{}} 
              isStreaming={isStreaming} 
              streamingSteps={streamingSteps} 
            />
          </div>
        )}
      </section>
      <form onSubmit={handleSubmit}>
        <MessageInput
          message={message}
          setMessage={setMessage}
          conversationId={conversationId}
        />
        <button disabled={!conversationId || isStreaming } id="submit">
          { "Submit"}
        </button>
      </form>
    </div>
  );
};

export default Assistant;
