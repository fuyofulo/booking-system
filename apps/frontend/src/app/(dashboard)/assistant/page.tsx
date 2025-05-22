"use client";

import { useState, useEffect, useRef } from "react";
import { useRestaurant } from "@/context/RestaurantContext";

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
}

// Token storage key constant
const TOKEN_STORAGE_KEY = "token";

// Centralized API client
const api = {
  async call(endpoint: string, method: string = "GET", body?: any) {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    const headers: HeadersInit = { "Content-Type": "application/json" };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const options: RequestInit = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }

    console.log(`API call to ${endpoint}`, { method, body });

    try {
      const response = await fetch(
        `http://localhost:8080/api/${endpoint}`,
        options
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API error (${response.status}):`, errorText);
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      return response.json();
    } catch (error) {
      console.error(`API call to ${endpoint} failed:`, error);
      throw error;
    }
  },
};

export default function AssistantPage() {
  const [status, setStatus] = useState<ConnectionStatus>({
    connected: false,
    tools: 0,
    prompts: 0,
    resources: 0,
  });
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "system",
      content:
        "Welcome to your AI restaurant assistant. Connect to start chatting.",
    },
  ]);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Add a ref to prevent duplicate connection attempts
  const hasAttemptedConnection = useRef<boolean>(false);
  const { selectedRestaurantId } = useRestaurant();
  const [selectedRestaurantName, setSelectedRestaurantName] =
    useState<string>("");

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Update useEffect to load restaurant name immediately
  useEffect(() => {
    // Get restaurant name from localStorage when ID changes or on component mount
    if (selectedRestaurantId) {
      const storedName = localStorage.getItem(
        `restaurant_name_${selectedRestaurantId}`
      );
      if (storedName) {
        setSelectedRestaurantName(storedName);
        console.log(
          `Loaded restaurant name from localStorage: ${storedName} for ID: ${selectedRestaurantId}`
        );
      } else {
        console.log(
          `No restaurant name found in localStorage for ID: ${selectedRestaurantId}`
        );
      }
    }
  }, [selectedRestaurantId]);

  // Add a system message
  const addSystemMessage = (content: string) => {
    const systemMessage: Message = { role: "system", content };
    setMessages((prev) => [...prev, systemMessage]);
  };

  // Connect to the server
  const handleConnect = async () => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      addSystemMessage(
        "No authentication token available. Please store a token first."
      );
      return;
    }

    setIsLoading(true);
    console.log("Starting connection process...");
    console.log(
      `Using restaurant ID: ${selectedRestaurantId}, Name: ${selectedRestaurantName}`
    );

    try {
      // Set the auth token
      console.log("Setting auth token...");
      await api.call("auth", "POST", { token });

      // Connect to the server with both restaurant ID and name
      console.log("Connecting to server...");
      const connectData = await api.call("connect", "POST", {
        token,
        restaurantId: selectedRestaurantId,
        restaurantName: selectedRestaurantName,
      });
      console.log("Connection response:", connectData);

      if (connectData.success) {
        // Add a system message about successful connection
        addSystemMessage(
          `Connected to server successfully! Available: ${connectData.tools?.length || 0} tools, ${connectData.prompts?.length || 0} prompts, ${connectData.resources?.length || 0} resources.`
        );

        setStatus((currentStatus) => ({
          ...currentStatus,
          connected: true,
          sessionId: connectData.sessionId || "session-id",
          tools: connectData.tools?.length || 0,
          prompts: connectData.prompts?.length || 0,
          resources: connectData.resources?.length || 0,
        }));

        // Fetch initial conversation to get the welcome message
        console.log("Fetching initial conversation...");
        try {
          const chatData = await api.call(
            `chat/initial?token=${encodeURIComponent(token)}`,
            "GET"
          );

          if (
            chatData.success &&
            chatData.history &&
            chatData.history.length > 0
          ) {
            // Find the first assistant message in the history
            const welcomeMessage = chatData.history.find(
              (msg: any) =>
                msg.role === "assistant" && typeof msg.content === "string"
            );

            if (welcomeMessage) {
              console.log("Received welcome message:", welcomeMessage.content);
              // Add the welcome message from Claude
              setMessages((prev) => [
                ...prev,
                { role: "assistant", content: welcomeMessage.content },
              ]);
            } else {
              console.log("No welcome message found in initial conversation");
            }
          } else {
            console.log("No initial conversation history available");
          }
        } catch (chatError) {
          console.error("Error fetching initial conversation:", chatError);
          // If we can't get the welcome message, we'll continue anyway
        }
      } else {
        // Handle unsuccessful connection
        addSystemMessage(
          `Connection failed: ${connectData.error || "Unknown error"}`
        );
        setStatus((prev) => ({
          ...prev,
          connected: false,
        }));
      }
    } catch (error) {
      console.error("Connection error:", error);
      addSystemMessage(
        `Error connecting: ${error instanceof Error ? error.message : String(error)}`
      );

      // Make sure status shows disconnected on error
      setStatus((prev) => ({
        ...prev,
        connected: false,
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect from the server
  const handleDisconnect = async () => {
    try {
      await api.call("disconnect", "POST");
      addSystemMessage("Disconnected from server.");

      // Directly set status to disconnected
      setStatus((prev) => ({
        ...prev,
        connected: false,
        sessionId: undefined,
      }));
    } catch (error) {
      console.error("Disconnect error:", error);
      addSystemMessage(
        `Error disconnecting: ${error instanceof Error ? error.message : String(error)}`
      );
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
    const messageToSend = inputMessage;
    setInputMessage("");
    setIsSendingMessage(true);

    try {
      const data = await api.call("chat", "POST", { message: messageToSend });

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
      setIsSendingMessage(false);
    }
  };

  // Handle input submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  // Log connection status for debugging
  console.log("Connection status:", {
    connected: status.connected,
    isLoading,
    sessionId: status.sessionId,
    canType: status.connected && !isLoading,
  });

  return (
    <div className="w-full h-[87vh] mx-auto bg-[#e8f5e9] shadow-lg p-4 text-gray-800 border border-gray-200 flex flex-col rounded-xl">
      <h1 className="text-2xl font-semibold mb-4 text-[#385538]">
        AI Restaurant Assistant
      </h1>

      {/* Connection status */}
      <div className="bg-[#c8e6c9] p-2 rounded-lg mb-4 shadow flex justify-between items-center text-sm">
        <div className="flex items-center space-x-2">
          <div
            className={`w-3 h-3 rounded-full ${status.connected ? "bg-green-600" : "bg-red-600"}`}
            onClick={() => {
              // Removed: Debug helper - click the status indicator to check status
              // No more status API call here
              // Optionally, you can keep the emergency toggle logic only
            }}
            style={{ cursor: "pointer" }}
            title="Click to debug connection status"
          ></div>
          <span>{status.connected ? "Connected" : "Disconnected"}</span>
          {status.sessionId && (
            <span className="text-xs opacity-70">
              {status.sessionId.slice(0, 8)}
            </span>
          )}
        </div>
        <div className="flex space-x-2">
          {!status.connected ? (
            <button
              onClick={handleConnect}
              disabled={isLoading}
              className="bg-[#4CAF50] hover:bg-[#45a049] px-3 py-1 rounded-md text-white text-xs font-medium"
            >
              {isLoading ? "Connecting..." : "Connect"}
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded-md text-white text-xs font-medium"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      {/* Messages container */}
      <div
        className="flex-1 overflow-y-auto bg-[#f0f8f0] rounded-lg p-4 mb-4 space-y-3 shadow-inner border border-gray-200"
        onClick={(e) => {
          // Check if we clicked on the emergency toggle link
          const target = e.target as HTMLElement;
          if (
            target.tagName === "A" ||
            target.textContent?.includes("click here")
          ) {
            e.preventDefault();

            // Toggle the connected state
            const newConnectedState = !status.connected;
            console.log(
              `EMERGENCY TOGGLE: Setting connected=${newConnectedState}`
            );

            setStatus((current) => ({
              ...current,
              connected: newConnectedState,
            }));

            addSystemMessage(
              `Emergency override: Connection state set to ${newConnectedState ? "CONNECTED" : "DISCONNECTED"}`
            );
          }
        }}
      >
        {messages.map((msg, idx) => (
          <div key={idx} className="flex flex-col">
            <div
              className={`p-3 rounded-xl text-sm shadow-md max-w-max ${
                msg.role === "user"
                  ? "bg-[#4a5d41] ml-auto text-white self-end max-w-[70%]"
                  : msg.role === "assistant"
                    ? "bg-[#6b8e23] text-white self-start max-w-[80%]"
                    : "bg-transparent text-center mx-auto text-xs italic text-gray-500 max-w-[90%] py-1"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isSendingMessage && (
          <div className="flex flex-col items-start">
            <div className="p-3 rounded-xl bg-[#6b8e23] text-white w-fit max-w-[60%] shadow-md self-start">
              <div className="flex space-x-1.5 items-center">
                <span className="text-xs text-gray-200 mr-1">
                  Assistant is typing
                </span>
                <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-white rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-white rounded-full animate-bounce"
                  style={{ animationDelay: "0.4s" }}
                ></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <form
        onSubmit={handleSubmit}
        className="flex space-x-2 items-center p-2 bg-[#c8e6c9] rounded-lg shadow border border-gray-200"
      >
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={
            status.connected
              ? "Type your message here..."
              : "Please connect to the assistant to start chatting."
          }
          disabled={!status.connected || isLoading}
          className="flex-1 bg-white border border-gray-300 px-4 py-3 rounded-lg text-gray-800 placeholder-gray-400 text-sm focus:ring-2 focus:ring-[#4a5d41] focus:border-transparent shadow-sm transition-shadow duration-150 focus:shadow-md"
          onFocus={() => {
            // Debug check to see if input field can be focused
            console.log("Input focused:", {
              connected: status.connected,
              isLoading,
              disabled: !status.connected || isLoading,
            });
          }}
        />
        <button
          type="submit"
          disabled={!status.connected || !inputMessage.trim() || isLoading}
          className="bg-[#4a5d41] hover:bg-[#385538] px-5 py-3 rounded-lg text-white disabled:opacity-60 disabled:cursor-not-allowed text-sm font-semibold shadow-sm hover:shadow-md transition-all duration-150 flex items-center justify-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5 mr-1.5"
          >
            <path d="M3.105 3.105a1.5 1.5 0 012.121-.001L19.53 9.249a1.5 1.5 0 010 2.502L5.226 16.996a1.5 1.5 0 01-2.121-2.121l2.73-2.73a.75.75 0 00-1.06-1.06l-2.73 2.73a3 3 0 004.242 4.242L20.97 10.999a3 3 0 000-5.002L5.226 1.86A3 3 0 001.03 5.173l2.73 2.73a.75.75 0 101.06-1.06L2.095 4.105a1.5 1.5 0 011.01-2.121z" />
          </svg>
          Send
        </button>
      </form>
    </div>
  );
}
