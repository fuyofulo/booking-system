"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

export type ToastProps = {
  message: string;
  type: "success" | "error" | "info";
  onDismiss: () => void;
};

export const Toast = ({ message, type, onDismiss }: ToastProps) => {
  const [isVisible, setIsVisible] = useState(true);

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 300); // Allow animation to complete
    }, 5000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  // Determine background color based on type
  const getBgColor = () => {
    switch (type) {
      case "success":
        return "bg-[#778e6b]";
      case "error":
        return "bg-[#8e6b6b]";
      case "info":
        return "bg-[#A3CB8B]";
      default:
        return "bg-[#778e6b]";
    }
  };

  if (!isVisible) return null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div
        className={`${getBgColor()} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 max-w-md border border-white/10`}
      >
        <div className="flex-1">{message}</div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onDismiss, 300);
          }}
          className="text-white/80 hover:text-white"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

// Toast container to manage multiple toasts
export type ToastItem = {
  id: string;
  message: string;
  type: "success" | "error" | "info";
};

export const ToastContainer = ({
  toasts,
  removeToast,
}: {
  toasts: ToastItem[];
  removeToast: (id: string) => void;
}) => {
  return (
    <>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onDismiss={() => removeToast(toast.id)}
        />
      ))}
    </>
  );
};

// Toast context provider for global access
export const useToast = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = (
    message: string,
    type: "success" | "error" | "info" = "info"
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return {
    toasts,
    addToast,
    removeToast,
  };
};
