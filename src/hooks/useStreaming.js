const useStreaming = () => {
  const handleStreamingResponse = async (
    userMessage,
    conversationId,
    onUpdate
  ) => {
    try {
      const response = await fetch(`http://localhost:4242/create-response`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
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
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            if (dataStr === "[DONE]") {
              onUpdate({ type: "done" });
              return;
            }

            try {
              const data = JSON.parse(dataStr);
              onUpdate(data);
            } catch (error) {
              console.error(
                "Error parsing streaming data:",
                error,
                "Data was:",
                dataStr
              );
            }
          }
        }
      }

      onUpdate({ type: "done" });
    } catch (error) {
      console.error("Error with streaming request:", error);
      onUpdate({ type: "error", error });
    }
  };

  const handleNonStreamingResponse = async (userMessage, conversationId) => {
    try {
      const response = await fetch(`http://localhost:4242/create-response`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          conversationId,
          stream: false,
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error with non-streaming request:", error);
      throw error;
    }
  };

  return { handleStreamingResponse, handleNonStreamingResponse };
};

export default useStreaming;
