import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Leaf, Loader2, MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ChatMessage = {
  sender: "user" | "bot";
  text: string;
};

interface ChatbotResponse {
  response: string;
}

// Use relative path - works both in dev and production
const CHATBOT_API_URL = "/api/chatbot";

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ sender: "user" | "bot"; text: string }>>([
    {
      sender: "bot",
      text: "Namaste! How can I assist you with your Ayurvedic wellness journey today?",
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isOpen]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleSend = async () => {
    const cleanMessage = input.trim();
    if (!cleanMessage || isLoading) return;

    setInput("");
    setIsLoading(true);
    setMessages((currentMessages) => [...currentMessages, { sender: "user", text: cleanMessage }]);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const { data } = await axios.post<ChatbotResponse>(
        CHATBOT_API_URL,
        { message: cleanMessage },
        {
          signal: abortController.signal,
          timeout: 30000,
        },
      );

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          sender: "bot",
          text: data.response || "I am sorry, but I could not prepare a response right now.",
        },
      ]);
    } catch (error) {
      if (axios.isCancel(error)) return;

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          sender: "bot",
          text: "I am sorry, but the AyurSutra Assistant is unavailable right now. Please try again shortly.",
        },
      ]);
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {isOpen ? (
        <section className="flex h-[min(640px,calc(100vh-7rem))] w-[calc(100vw-2rem)] max-w-[380px] flex-col overflow-hidden rounded-lg border border-emerald-900/10 bg-card shadow-2xl shadow-emerald-950/20">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex min-w-0 items-center gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-foreground/15 text-[11px] font-bold tracking-wide">
                AI
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold">AyurSutra AI Assistant</h2>
                <p className="truncate text-xs text-primary-foreground/75">
                  Ayurveda and Panchakarma guidance
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
              onClick={() => setIsOpen(false)}
              aria-label="Close AyurSutra Assistant"
            >
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="flex-1 overflow-y-auto bg-gradient-to-b from-emerald-50/70 via-background to-background px-4 py-4">
            <div className="space-y-3">
              {messages.map((message, index) => (
                <ChatBubble key={`${message.sender}-${index}`} message={message} />
              ))}

              {isLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  Assistant is thinking...
                </div>
              ) : null}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <form
            className="sticky bottom-0 flex gap-2 border-t border-border bg-card p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSend();
            }}
          >
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={isLoading}
              placeholder="Ask about Nasya, Basti, diet..."
              className="h-10 bg-background"
              aria-label="Chat message"
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="h-10 shrink-0 bg-primary px-3 text-primary-foreground hover:bg-primary/90"
              aria-label="Send message"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Send</span>
            </Button>
          </form>
        </section>
      ) : null}

      <Button
        type="button"
        size="icon"
        onClick={() => setIsOpen((current) => !current)}
        className="relative h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl shadow-emerald-950/25 transition hover:scale-105 hover:bg-primary/90"
        aria-label={isOpen ? "Collapse AyurSutra Assistant" : "Open AyurSutra Assistant"}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!isOpen ? (
          <span className="absolute -right-1 -top-1 rounded-full border-2 border-background bg-saffron px-1.5 py-0.5 text-[10px] font-bold leading-none text-saffron-foreground shadow-sm">
            AI
          </span>
        ) : null}
      </Button>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.sender === "user";

  return (
    <div className={cn("flex items-start gap-2", isUser ? "justify-end" : "justify-start")}>
      {!isUser ? (
        <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-leaf/20 text-leaf-foreground">
          <Leaf className="h-3.5 w-3.5" />
        </span>
      ) : null}
      <div
        className={cn(
          "max-w-[78%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm leading-relaxed shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "border border-border bg-card text-card-foreground",
        )}
      >
        {message.text}
      </div>
    </div>
  );
}
