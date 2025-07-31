import { useState } from "react";

const useConversation = () => {
  const [conversationId, setConversationId] = useState(null);

  const createNewConversation = async () => {
    setConversationId(null);
    try {
      const res = await fetch(`http://localhost:4242/create-conversation`, {
        method: "POST",
      });
      const conversation = await res.json();
      setConversationId(conversation.id);
      return conversation.id;
    } catch (err) {
      console.error("Error creating conversation:", err);
      return null;
    }
  };

  return {
    conversationId,
    createNewConversation,
  };
};

export default useConversation;
