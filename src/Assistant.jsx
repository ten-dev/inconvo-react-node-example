import { useState } from "react";
import "./App.css";
import MessageInput from "./components/MessageInput";
import MessageList from "./components/MessageList";
import useConversation from "./hooks/useConversation";
import useMessage from "./hooks/useMessage";

const Assistant = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingSteps, setStreamingSteps] = useState([]);
  const [streamingEnabled, setStreamingEnabled] = useState(true);
  
  const { conversationId, createNewConversation } = useConversation();
  const { sendMessage } = useMessage();

  const handleNewConversation = async () => {
    setMessage("");
    setMessages([]);
    setStreamingSteps([]);
    await createNewConversation();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    const userMessage = message;
    setMessage("");
    setMessages(prev => [...prev, { message: userMessage, timestamp: Date.now() }]);
    
    try {
      if (streamingEnabled) {
        setIsStreaming(true);
        setStreamingSteps([]);
        
        await sendMessage(userMessage, conversationId, {
          stream: true,
          onUpdate: (data) => {
            if (data.type === "agent_step") {
              setStreamingSteps(prev => [...prev, { step: data.step, message: data.message }]);
            } else if (data.type === "completed") {
              setMessages(prev => [...prev, { ...data.response, id: data.id }]);
              setIsStreaming(false);
              setStreamingSteps([]);
            } else if (data.type === "error") {
              setIsStreaming(false);
              setStreamingSteps([]);
            }
          }
        });
      } else {
        const response = await sendMessage(userMessage, conversationId);
        setMessages(prev => [...prev, { ...response.response, id: response.id }]);
      }
    } catch (error) {
      console.error("Request error:", error);
    }
  };

  return (
    <div>
      <div style={{ textAlign: "center" }}>
        <button onClick={handleNewConversation}>New conversation</button>
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
        isStreaming={isStreaming}
        streamingSteps={streamingSteps}
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
