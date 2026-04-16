import React, { useState, useEffect, useRef } from "react";
import { sendChatMessage } from "../api/client";
import type { ChatResponse } from "../api/client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./ChatBot.css";
 
// ─── Types ──────────────────────────────────────────────────────────────────
interface Message {
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
}
 
// ─── Column Header Mapping ───────────────────────────────────────────────────
const COLUMN_LABELS: Record<string, string> = {
  trigger_product: "Trigger Product",
  recommended_product: "Recommended Product",
  lift: "Lift Score",
  confidence: "Confidence",
  segment: "Segment",
  score: "Score",
};
 
function friendlyHeader(col: string): string {
  const lower = col.toLowerCase().trim();
  if (COLUMN_LABELS[lower]) return COLUMN_LABELS[lower];
  return col.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
 
// ─── Message Formatter ───────────────────────────────────────────────────────
function FormattedMessage({ content }: { content: string }) {
  return (
    <div className="formatted-message">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <div className="reco-table-wrapper">
              <table className="reco-table">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th>{typeof children === "string" ? friendlyHeader(children) : children}</th>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
 
// ─── ChatBot Component ───────────────────────────────────────────────────────
const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      text: "Hello! I am your Recommendation Assistant. How can I help you today?",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
 
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
 
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
 
  const handleSend = async () => {
    if (!input.trim()) return;
 
    const userMessage: Message = {
      text: input,
      sender: "user",
      timestamp: new Date(),
    };
 
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
 
    try {
      const response: ChatResponse = await sendChatMessage(input);
 
      if (response.status === "success") {
        setMessages((prev) => [
          ...prev,
          {
            text: response.response || "No response from bot.",
            sender: "bot",
            timestamp: new Date(),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            text: response.message || "Something went wrong.",
            sender: "bot",
            timestamp: new Date(),
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          text: "Error connecting to server.",
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };
 
  return (
<div className="chatbot-container">
<button className="chatbot-toggle" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? "✖" : "💬"}
</button>
 
      {isOpen && (
<div className="chatbot-window">
<div className="chatbot-header">
<h3>RecoAssist</h3>
<button onClick={() => setIsOpen(false)}>×</button>
</div>
 
          <div className="chatbot-messages">
            {messages.map((msg, idx) => (
<div key={idx} className={`message-wrapper ${msg.sender}`}>
<div className="message-bubble">
                  {msg.sender === "bot" ? (
<FormattedMessage content={msg.text} />
                  ) : (
                    msg.text
                  )}
<span className="message-time">
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
</span>
</div>
</div>
            ))}
 
            {isLoading && (
<div className="message-wrapper bot">
<div className="message-bubble loading">
<div className="typing-dots">
<span></span><span></span><span></span>
</div>
</div>
</div>
            )}
 
            <div ref={messagesEndRef} />
</div>
 
          <div className="chatbot-input-area">
<input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask about recommendations..."
            />
<button onClick={handleSend} disabled={isLoading}>
              Send
</button>
</div>
</div>
      )}
</div>
  );
};
 
export default ChatBot;