"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { USER_URLS } from "@/lib/api-urls";
import { useToast } from "@/components/ToastContext";
import { useRestaurant } from "@/context/RestaurantContext";

interface Restaurant {
  id: number;
  name: string;
  ownerId: string;
}

interface Role {
  id: number;
  name: string;
  canCreateRoles: boolean;
  canManageTables: boolean;
  canManageSlots: boolean;
  canManageStaff: boolean;
  canManageMenu: boolean;
  canManageOrders: boolean;
  restaurantId: number;
}

interface UserRestaurant {
  id: number;
  userId: string;
  restaurantId: number;
  roleId: number;
  restaurant: Restaurant;
  role: Role;
}

interface User {
  id: string;
  name: string;
  email: string;
  hasRestaurant: boolean;
  restaurants: UserRestaurant[];
}

interface UserResponse {
  user: User;
}

export default function ProfilePage() {
  const { addToast } = useToast();
  const router = useRouter();
  const { setSelectedRestaurantId } = useRestaurant();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          addToast("You are not logged in. Please sign in.", "error");
          // Handle redirect to login if needed
          return;
        }

        const response = await fetch(USER_URLS.GET_USER, {
          headers: {
            Authorization: token,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch user data");
        }

        const data: UserResponse = await response.json();
        setUser(data.user);
      } catch (error) {
        console.error("Error fetching user:", error);
        addToast("Failed to load user data. Please try again.", "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [addToast]);

  // Filter restaurants by search term
  const filteredRestaurants =
    user?.restaurants.filter(
      (restaurant) =>
        restaurant.restaurant.name
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        restaurant.role.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  // New function to handle navigation to dashboard for a specific restaurant
  const goToDashboard = (restaurantId: number) => {
    setSelectedRestaurantId(String(restaurantId));
    router.push("/dashboard");
  };

  return (
    <div className="p-4 space-y-4 w-full">
      {/* Welcome header with create restaurant button */}
      <div className="px-6 py-2 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {isLoading ? "User" : user?.name || "User"}
          </h1>
          <p className="text-white/80 mt-1 px-1">
            You can manage your profile on this page
          </p>
        </div>

        {/* Create restaurant button moved here */}
        <div className="mt-2 md:mt-0 w-full md:w-auto">
          <Button
            asChild
            className="bg-white hover:bg-white/90 text-black py-2 px-4 w-full md:w-auto font-medium rounded-2xl"
          >
            <Link
              href="/create-restaurant"
              className="text-sm flex items-center"
            >
              <Plus className="h-4 w-4" />
              create restaurant
            </Link>
          </Button>
        </div>
      </div>

      {/* Top section with user info and main content area */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 px-4 py-2">
        {/* User info card */}
        <Card className="md:col-span-4 border-2 rounded-3xl bg-white text-black">
          <CardHeader className="py-0 px-6 pb-0">
            <CardTitle className="text-lg font-semibold">
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pt-0 -mt-4">
            <div className="space-y-3">
              <div>
                <h3 className="text-xs px-2 font-medium text-gray-500">
                  Full Name
                </h3>
                <p className="text-sm px-2 font-medium">
                  {isLoading ? "Loading..." : user?.name || "Not set"}
                </p>
              </div>

              <div>
                <h3 className="text-xs px-2 font-medium text-gray-500">
                  Email Address
                </h3>
                <p className="text-sm px-2 font-medium">
                  {isLoading
                    ? "Loading..."
                    : user?.email || "email@example.com"}
                </p>
              </div>

              <div>
                <h3 className="text-xs px-2 font-medium text-gray-500">
                  Restaurants
                </h3>
                <p className="text-sm px-2 font-medium">
                  {isLoading
                    ? "Loading..."
                    : user?.restaurants.length
                      ? `${user.restaurants.length} ${
                          user.restaurants.length === 1
                            ? "restaurant"
                            : "restaurants"
                        }`
                      : "No restaurants yet"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main content area - now spans 8 columns */}
        <Card className="md:col-span-8 border-2 rounded-3xl bg-white text-black">
          <CardHeader className="py-0 px-6 pb-0">
            <CardTitle className="text-lg font-semibold">Quick Stats</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Restaurants section */}
      <Card className="rounded-3xl bg-[#4a5842] text-white border-0">
        <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center py-0.5 px-4">
          <div>
            <CardTitle className="text-lg font-semibold -mt-8 px-6 mb-4">
              Restaurants you are a part of
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="py-2 px-4 -mt-10">
          {isLoading ? (
            <div className="text-center py-4">Loading restaurants...</div>
          ) : filteredRestaurants.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {filteredRestaurants.map((userRestaurant) => (
                <Card
                  key={userRestaurant.id}
                  className="border-2 rounded-3xl overflow-hidden bg-white text-black"
                >
                  <CardHeader className="py-2 px-4 -mt-2">
                    <CardTitle className="text-base font-semibold px-4">
                      {userRestaurant.restaurant.name}
                    </CardTitle>
                    <span className="inline-block px-4 py-0.5 bg-[#4a5842]/10 text-black rounded-full text-xs mt-1">
                      {userRestaurant.role.name}
                    </span>
                  </CardHeader>
                  <CardContent className="px-4 pb-3 pt-0">
                    {/* Stats section - would be fetched from API in a real implementation */}
                    {/* <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="text-center">
                        <p className="text-xs text-black/80">Revenue</p>
                        <p className="text-sm font-semibold">$0</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-black/80">Orders</p>
                        <p className="text-sm font-semibold">0</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-black/80">Tables</p>
                        <p className="text-sm font-semibold">0</p>
                      </div>
                    </div> */}

                    {/* Actions */}
                    <div className="flex gap-3">
                      <Button
                        className="flex-1 bg-[#4a5842] border-white text-white hover:bg-[#3e4a36] hover:text-white font-medium text-xs py-1 h-8"
                        onClick={() =>
                          goToDashboard(userRestaurant.restaurant.id)
                        }
                      >
                        Go to Dashboard
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              {searchTerm
                ? "No restaurants found matching your search."
                : "You are not part of any restaurants yet."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
