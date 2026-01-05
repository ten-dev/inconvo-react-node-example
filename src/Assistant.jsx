import { useState } from "react";
import "./App.css";
import MessageInput from "./components/MessageInput";
import MessageList from "./components/MessageList";

const Assistant = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingEnabled, setStreamingEnabled] = useState(true);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [conversationId, setConversationId] = useState(null);

  const alertResponseError = async (response) => {
    let message = `Request failed (${response.status})`;
    try {
      const text = await response.text();
      if (text) {
        try {
          const data = JSON.parse(text);
          if (typeof data === "string") {
            message = data;
          } else if (data && typeof data === "object") {
            const stringValues = Object.values(data).filter(
              (value) => typeof value === "string"
            );
            if (stringValues.length) {
              message = stringValues.join(", ");
            }
          }
        } catch {
          message = text;
        }
      }
    } catch {
      // Ignore parsing errors and fall back to the default message.
    }
    alert(message);
    return message;
  };

  const alertNetworkError = (error) => {
    const message = error?.message || "Request failed.";
    alert(message);
    return message;
  };

  const createNewConversation = async () => {
    setConversationId(null);
    try {
      const res = await fetch(`http://localhost:4242/create-conversation`, {
        method: "POST",
      });
      if (!res.ok) {
        await alertResponseError(res);
        return null;
      }
      const conversation = await res.json();
      setConversationId(conversation.id);
      return conversation.id;
    } catch (err) {
      console.error("Error creating conversation:", err);
      alertNetworkError(err);
      return null;
    }
  };

  const sendMessage = async (userMessage, conversationId, options = {}) => {
    const { stream = false, onUpdate } = options;
    
    const response = await fetch(`http://localhost:4242/create-response`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(stream && { Accept: "text/event-stream" }),
      },
      body: JSON.stringify({ message: userMessage, conversationId, stream }),
    });

    if (!response.ok) {
      const message = await alertResponseError(response);
      const error = new Error(message);
      error.alertAlreadyShown = true;
      throw error;
    }

    if (!stream) return response.json();

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          
          const data = line.slice(6);
          if (data === "[DONE]") return;
          
          try {
            onUpdate(JSON.parse(data));
          } catch (e) {
            console.error("Parse error:", e);
          }
        }
      }
    } catch (error) {
      onUpdate({ type: "error", error });
    }
  };

  const handleNewConversation = async () => {
    setIsCreatingConversation(true);
    setMessage("");
    setMessages([]);
    await createNewConversation();
    setIsCreatingConversation(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    const userMessage = message;
    let tempMessageId = null;
    setMessage("");
    setMessages(prev => [...prev, { message: userMessage, timestamp: Date.now() }]);
    
    try {
      if (streamingEnabled) {
        setIsStreaming(true);
        
        // Add temporary "thinking..." message
        tempMessageId = `temp-${Date.now()}`;
        setMessages(prev => [...prev, { 
          message: "Thinking...", 
          type: "text",
          id: tempMessageId 
        }]);
        
        await sendMessage(userMessage, conversationId, {
          stream: true,
          onUpdate: (data) => {
            if (data.type === "response.agent_step") {
              // Update the temporary message with the agent step message
              setMessages(prev => 
                prev.map(msg => 
                  msg.id === tempMessageId 
                    ? { ...msg, message: data.message }
                    : msg
                )
              );
            } else if (data.type === "response.completed") {
              // Replace the temporary message with the final response
              setMessages(prev => 
                prev.map(msg => 
                  msg.id === tempMessageId 
                    ? { ...data.response, id: data.id }
                    : msg
                )
              );
              setIsStreaming(false);
            } else if (data.type === "error") {
              // Remove the temporary message on error
              setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
              if (!data.error?.alertAlreadyShown) {
                alertNetworkError(data.error);
                if (data.error) {
                  data.error.alertAlreadyShown = true;
                }
              }
              setIsStreaming(false);
            }
          }
        });
      } else {
        const response = await sendMessage(userMessage, conversationId);
        setMessages(prev => [...prev, { ...response.response, id: response.id }]);
      }
    } catch (error) {
      console.error("Request error:", error);
      if (tempMessageId) {
        setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
      }
      setIsStreaming(false);
      if (!error?.alertAlreadyShown) {
        alertNetworkError(error);
      }
    }
  };

  return (
    <div>
      <div style={{ textAlign: "center" }}>
        <button onClick={handleNewConversation} disabled={isCreatingConversation}>
          {isCreatingConversation ? "Creating..." : "New conversation"}
        </button>
        <button 
          onClick={() => setStreamingEnabled(!streamingEnabled)}
          style={{ marginLeft: "10px" }}
        >
          {streamingEnabled ? "Disable" : "Enable"} Streaming
        </button>
        {conversationId && (
          <div className="conversation-id">{conversationId}</div>
        )}
      </div>
      
      <MessageList 
        messages={messages}
      />
      
      <MessageInput
        message={message}
        setMessage={setMessage}
        conversationId={conversationId}
        onSubmit={handleSubmit}
        isStreaming={isStreaming}
      />
    </div>
  );
};

export default Assistant;
