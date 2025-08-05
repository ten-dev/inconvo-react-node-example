const MessageInput = ({ message, setMessage, conversationId, onSubmit, isStreaming }) => (
  <form onSubmit={onSubmit}>
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
    <button disabled={!conversationId || isStreaming} id="submit">
      Submit
    </button>
  </form>
);

export default MessageInput;
