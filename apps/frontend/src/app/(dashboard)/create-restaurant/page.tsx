"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RESTAURANT_URLS } from "@/lib/api-urls";
import { useToast } from "@/components/ToastContext";
import { CreateRestaurantSchema } from "@repo/schemas/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CreateRestaurantPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [restaurantName, setRestaurantName] = useState("");
  const [nameError, setNameError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError("");

    try {
      // Validate the form data
      const validatedData = CreateRestaurantSchema.parse({
        name: restaurantName,
      });

      setIsLoading(true);

      // Get the JWT token from localStorage
      const token = localStorage.getItem("token");

      if (!token) {
        addToast("You are not logged in. Please sign in.", "error");
        router.push("/signin");
        return;
      }

      // API call to create restaurant
      const response = await fetch(RESTAURANT_URLS.CREATE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify(validatedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create restaurant");
      }

      const data = await response.json();

      // Success message
      addToast(
        "Restaurant created successfully! Redirecting to dashboard...",
        "success"
      );

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (error: any) {
      console.error("Restaurant creation error:", error);

      // Handle Zod validation errors
      if (error.errors) {
        setNameError(error.errors[0]?.message || "Invalid restaurant name");
        addToast("Please check the form for errors", "error");
      } else {
        // Other errors
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to create restaurant. Please try again.";

        addToast(errorMessage, "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 w-full flex justify-center items-center">
      <div className="px-6 mb-6 w-full">
        <h1 className="text-2xl font-bold text-white">
          Create a New Restaurant
        </h1>
        <p className="text-white/70">
          Set up your restaurant and start managing it
        </p>
      </div>
      <Card className="w-full max-w-2xl border-2 rounded-3xl bg-white text-black">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Restaurant Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="restaurantName">Restaurant Name</Label>
              <Input
                id="restaurantName"
                placeholder="Enter your restaurant name"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                className="border-2 rounded-xl"
                disabled={isLoading}
              />
              {nameError && <p className="text-red-500 text-xs">{nameError}</p>}
              <p className="text-black/70 text-xs">
                Your restaurant name should be at least 3 characters long.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#4a5842] hover:bg-[#3e4a36] text-white mt-8 rounded-xl py-6 font-medium"
              disabled={isLoading}
            >
              {isLoading ? "Creating Restaurant..." : "Create Restaurant"}
            </Button>

            <div className="pt-4 text-center">
              <p className="text-black/70 text-sm">
                As the creator, you'll automatically be assigned the Owner role
                with full permissions.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
