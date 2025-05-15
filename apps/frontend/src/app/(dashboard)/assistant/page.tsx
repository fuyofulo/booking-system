"use client";

import { useState, useEffect, useRef } from "react";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ConnectionStatus {
  connected: boolean;
  sessionId?: string;
  tools: number;
  prompts: number;
  resources: number;
  authenticated: boolean;
}

const TOKEN_STORAGE_KEY = "token";

export default function AssistantPage() {
  const [savedToken, setSavedToken] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>({
    connected: false,
    tools: 0,
    prompts: 0,
    resources: 0,
    authenticated: false,
  });
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "system",
      content:
        "Welcome to your AI restaurant assistant. Connect to start chatting.",
    },
  ]);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Check connection status and load token from localStorage on component mount
  useEffect(() => {
    fetchStatus();
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    setSavedToken(storedToken);

    // Auto-connect with saved token if available
    if (storedToken) {
      addSystemMessage("Found saved authentication token");

      // Automatically attempt to connect with the saved token
      setTimeout(() => {
        handleConnect();
      }, 500);
    } else {
      addSystemMessage(
        "No authentication token found in browser storage. Please set a token first."
      );
    }
  }, []);

  // Connect to the MCP server
  const handleConnect = async () => {
    if (!savedToken) {
      addSystemMessage(
        "No authentication token available. Please store a token first."
      );
      return;
    }

    setIsConnecting(true);

    try {
      // First set the auth token
      const authResponse = await fetch("http://localhost:8080/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: savedToken }),
      });

      if (!authResponse.ok) {
        throw new Error("Failed to set authentication token");
      }

      // Then connect to the server
      const connectResponse = await fetch("http://localhost:8080/api/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!connectResponse.ok) {
        throw new Error("Failed to connect to server");
      }

      const connectData = await connectResponse.json();

      addSystemMessage(
        `Connected to server successfully! Available: ${connectData.tools.length} tools, ${connectData.prompts.length} prompts, ${connectData.resources.length} resources.`
      );

      // Update connection status
      await fetchStatus();
    } catch (error) {
      console.error("Connection error:", error);
      addSystemMessage(
        `Error connecting: ${error instanceof Error ? error.message : String(error)}`
      );

      if (savedToken) {
        addSystemMessage("Saved token may be expired or invalid.");
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect from the server
  const handleDisconnect = async () => {
    try {
      const response = await fetch("http://localhost:8080/api/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error("Failed to disconnect from server");
      }

      addSystemMessage("Disconnected from server.");

      // Update connection status
      await fetchStatus();
    } catch (error) {
      console.error("Disconnect error:", error);
      addSystemMessage(
        `Error disconnecting: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  // External token storage function - this would be triggered by external UI elements
  const setExternalToken = (newToken: string) => {
    if (!newToken.trim()) {
      addSystemMessage("Invalid token provided");
      return;
    }

    localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    setSavedToken(newToken);
    addSystemMessage("New token saved to browser storage.");

    // Disconnect if connected
    if (status.connected) {
      handleDisconnect();
    }
  };

  // Empty function to prevent reference errors - will be removed when the UI no longer references it
  const handleClearToken = () => {};

  // Get current connection status
  const fetchStatus = async () => {
    try {
      const response = await fetch("http://localhost:8080/api/status");
      if (!response.ok) {
        throw new Error("Failed to fetch status");
      }

      const statusData = await response.json();
      setStatus(statusData);
    } catch (error) {
      console.error("Status error:", error);
    }
  };

  // Send a message to the assistant
  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    if (!status.connected) {
      addSystemMessage("Not connected to server. Please connect first.");
      return;
    }

    // Add user message
    const userMessage: Message = { role: "user", content: inputMessage };
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:8080/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: inputMessage }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = await response.json();

      // Add assistant response
      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      addSystemMessage(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Add a system message
  const addSystemMessage = (content: string) => {
    const systemMessage: Message = { role: "system", content };
    setMessages((prev) => [...prev, systemMessage]);
  };

  // Handle input submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  return (
    <div className="w-full h-[87vh] mx-auto bg-[#778e6b] shadow-lg p-2 text-white border border-white/10 flex flex-col rounded-xl">
      <h1 className="text-lg font-bold mb-1">AI Restaurant Assistant</h1>

      {/* Connection status */}
      <div className="bg-[#5a6d51] p-1 rounded-lg mb-2 flex justify-between items-center text-sm">
        <div className="flex items-center space-x-1">
          <div
            className={`w-2 h-2 rounded-full ${status.connected ? "bg-green-500" : "bg-red-500"}`}
          ></div>
          <span>{status.connected ? "Connected" : "Disconnected"}</span>
          {status.sessionId && (
            <span className="text-xs opacity-70">
              {status.sessionId.slice(0, 8)}
            </span>
          )}
        </div>
        <div className="flex space-x-1">
          {!status.connected ? (
            <>
              {savedToken ? (
                <div className="flex space-x-1">
                  <button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="bg-emerald-600 hover:bg-emerald-700 px-2 py-0.5 rounded text-white text-xs"
                  >
                    {isConnecting ? "..." : "Connect"}
                  </button>
                </div>
              ) : (
                <div className="text-xs italic">No token</div>
              )}
            </>
          ) : (
            <div className="flex space-x-1">
              <button
                onClick={handleDisconnect}
                className="bg-red-600 hover:bg-red-700 px-2 py-0.5 rounded text-white text-xs"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages container */}
      <div className="flex-1 overflow-y-auto bg-white rounded-lg p-2 mb-2 space-y-1.5 text-gray-800">
        {messages.map((msg, idx) => (
          <div key={idx} className="flex flex-col">
            <div
              className={`p-1.5 rounded-lg text-sm ${
                msg.role === "user"
                  ? "bg-[#4a5d41] ml-auto text-white w-fit max-w-[60%]"
                  : msg.role === "assistant"
                    ? "bg-[#5a6d51] text-white max-w-[80%]"
                    : "bg-[#f0f0f0] text-center mx-auto text-xs italic text-gray-600 max-w-[90%]"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex flex-col">
            <div className="p-1.5 rounded-lg bg-[#5a6d51] w-fit max-w-[60%] text-white">
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"></div>
                <div
                  className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
                <div
                  className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"
                  style={{ animationDelay: "0.4s" }}
                ></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex space-x-1">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type message..."
          disabled={!status.connected || isLoading}
          className="flex-1 bg-[#5a6d51] px-2 py-1 rounded-lg text-white placeholder-gray-300 text-sm"
        />
        <button
          type="submit"
          disabled={!status.connected || !inputMessage.trim() || isLoading}
          className="bg-[#4a5d41] hover:bg-[#3a4d31] px-2 py-1 rounded-lg text-white disabled:opacity-50 text-sm"
        >
          Send
        </button>
      </form>
    </div>
  );
}
