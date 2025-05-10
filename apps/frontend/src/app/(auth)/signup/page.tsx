"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { USER_URLS } from "@/lib/api-urls";
import { SignUpSchema } from "@repo/schemas/types";
import { useToast } from "@/components/ToastContext";
import { useRouter } from "next/navigation";

export default function SignUp() {
  const router = useRouter();
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

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

    // Validate form using Zod schema
    try {
      // Custom validation for confirm password
      if (formData.password !== formData.confirmPassword) {
        setErrors({ confirmPassword: "Passwords do not match" });
        return;
      }

      // Check terms acceptance
      if (!acceptTerms) {
        setErrors({ terms: "You must accept the terms and conditions" });
        return;
      }

      // Validate using Zod schema
      const validatedData = SignUpSchema.parse({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });

      setIsLoading(true);

      // API call to signup endpoint
      const response = await fetch(USER_URLS.SIGN_UP, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validatedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to sign up");
      }

      // Parse the response to get the token
      const data = await response.json();

      // Save token to localStorage
      if (data.token) {
        localStorage.setItem("token", data.token);
      } else {
        throw new Error("No token received from server");
      }

      // Handle successful signup
      addToast(
        "Account created successfully! Redirecting to dashboard...",
        "success"
      );
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (error: any) {
      console.error("Signup error:", error);

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
            : "An error occurred during signup. Please try again later.";

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
            Create an account
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white">
                Name
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="Enter your name"
                value={formData.name}
                onChange={handleChange}
                className="bg-white/10 text-white placeholder:text-white/50 border-white/20 focus-visible:ring-white/30"
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-red-200 text-xs">{errors.name}</p>
              )}
            </div>

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
              <Label htmlFor="password" className="text-white">
                Password
              </Label>
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
              <p className="text-white/70 text-xs">
                Must be at least 6 characters.
              </p>
              {errors.password && (
                <p className="text-red-200 text-xs">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white">
                Confirm password
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="bg-white/10 text-white placeholder:text-white/50 border-white/20 focus-visible:ring-white/30"
                disabled={isLoading}
              />
              {errors.confirmPassword && (
                <p className="text-red-200 text-xs">{errors.confirmPassword}</p>
              )}
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="terms"
                checked={acceptTerms}
                onCheckedChange={(checked) => setAcceptTerms(checked === true)}
              />
              <Label htmlFor="terms" className="text-white text-xs">
                Accept terms and conditions
              </Label>
            </div>
            {errors.terms && (
              <p className="text-red-200 text-xs">{errors.terms}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-white text-[#6A8262] hover:bg-white/90 mt-4"
              disabled={isLoading}
            >
              {isLoading ? "Creating account..." : "Get Started"}
            </Button>

            <div className="text-center pt-2">
              <div className="flex items-center justify-center space-x-2 text-white/70 text-sm">
                <span>Already have an account?</span>
                <Link href="/signin" className="text-white underline">
                  Log In
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
