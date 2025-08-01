const useMessage = () => {
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

  return { sendMessage };
};

export default useMessage;
