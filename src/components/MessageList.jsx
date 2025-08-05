import MessageRenderer from "./MessageRenderer";

const MessageList = ({ messages }) => (
  <section>
    {messages.map((msg, index) => (
      <div key={index} className="message-response-pair">
        <div className={msg.id ? "response-container" : "message-container"}>
          {msg.id ? (
            <MessageRenderer response={msg} />
          ) : (
            <p className="question">{msg.message}</p>
          )}
        </div>
      </div>
    ))}
  </section>
);

export default MessageList;
