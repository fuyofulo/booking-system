"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { USER_URLS } from "@/lib/api-urls";
import { useRouter } from "next/navigation";
import { SignInSchema } from "@repo/schemas/types";
import { useToast } from "@/components/ToastContext";

export default function SignIn() {
  const router = useRouter();
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({}); // Clear previous errors

    try {
      // Validate using Zod schema
      const validatedData = SignInSchema.parse({
        email: formData.email,
        password: formData.password,
      });

      setIsLoading(true);

      // API call to signin endpoint
      const response = await fetch(USER_URLS.SIGN_IN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validatedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Invalid email or password");
      }

      // Parse the response to get the token
      const data = await response.json();

      // Save token to localStorage
      if (data.token) {
        localStorage.setItem("token", data.token);
      } else {
        throw new Error("No token received from server");
      }

      // Handle successful login
      addToast("Login successful! Redirecting...", "success");

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch (error: any) {
      console.error("Login error:", error);

      // Handle Zod validation errors
      if (error.errors) {
        const zodErrors: Record<string, string> = {};
        error.errors.forEach((err: any) => {
          zodErrors[err.path[0]] = err.message;
        });
        setErrors(zodErrors);

        // Add toast for validation errors
        addToast("Please check the form for errors", "error");
      } else {
        // Network or server errors
        const errorMessage =
          error instanceof Error
            ? error.message === "Failed to fetch"
              ? "Unable to connect to the server. Please check your internet connection and try again."
              : error.message
            : "An error occurred during sign in. Please try again later.";

        addToast(errorMessage, "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#778e6b] rounded-xl shadow-lg overflow-hidden border border-white/10">
        <div className="p-8">
          <h1 className="text-2xl font-bold text-white mb-2 text-center">
            Welcome back
          </h1>
          <p className="text-white/70 text-center text-sm mb-6">
            Sign in to your account
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                className="bg-white/10 text-white placeholder:text-white/50 border-white/20 focus-visible:ring-white/30"
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-red-200 text-xs">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-white">
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-white/70 text-xs hover:text-white"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                className="bg-white/10 text-white placeholder:text-white/50 border-white/20 focus-visible:ring-white/30"
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-red-200 text-xs">{errors.password}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-white text-[#6A8262] hover:bg-white/90 mt-4"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
            </div>

            <div className="text-center pt-2">
              <div className="flex items-center justify-center space-x-2 text-white/70 text-sm">
                <span>Don't have an account?</span>
                <Link href="/signup" className="text-white underline">
                  Sign up
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
