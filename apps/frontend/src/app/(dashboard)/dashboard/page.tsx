"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRestaurant } from "@/context/RestaurantContext";
import { USER_URLS } from "@/lib/api-urls";
import { useToast } from "@/components/ToastContext";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CalendarDays, Users, Receipt, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  const { selectedRestaurant } = useRestaurant();
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // This would fetch restaurant-specific data in a real implementation
  useEffect(() => {
    if (selectedRestaurant) {
      // Example of how you would fetch restaurant-specific data
      const fetchRestaurantData = async () => {
        setIsLoading(true);
        try {
          // You would implement this API endpoint
          // const response = await fetch(`${USER_URLS.GET_RESTAURANT_DATA}/${selectedRestaurant.restaurant.id}`, {
          //   headers: {
          //     Authorization: localStorage.getItem("token") || "",
          //   },
          // });
          // const data = await response.json();
          // Handle the data
        } catch (error) {
          console.error("Error fetching restaurant data:", error);
          addToast("Failed to load restaurant data", "error");
        } finally {
          setIsLoading(false);
        }
      };

      // Uncomment when API endpoint is available
      // fetchRestaurantData();
    }
  }, [selectedRestaurant, addToast]);

  // If no restaurant is selected, show a message to select one
  if (!selectedRestaurant) {
    return (
      <div className="p-4 space-y-4 w-full">
        <div className="px-6 py-2">
          <h1 className="text-2xl font-bold text-white">
            Restaurant Dashboard
          </h1>
          <p className="text-white/80 mt-1 px-1">
            Please select a restaurant from the sidebar to view its dashboard
          </p>
        </div>
        <div className="grid grid-cols-1 px-6 py-4">
          <Card className="rounded-3xl bg-white text-black">
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-semibold mb-4">
                No Restaurant Selected
              </h2>
              <p className="text-gray-600 mb-6">
                Select a restaurant from the dropdown in the sidebar to view its
                dashboard
              </p>
              <Button asChild className="bg-[#4a5842] hover:bg-[#4a5842]/90">
                <Link href="/profile">Go to Profile</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 w-full">
      {/* Welcome header */}
      <div className="px-6 py-2">
        <h1 className="text-2xl font-bold text-white">
          {selectedRestaurant.restaurant.name} dashboard
        </h1>
        <p className="text-white/80 mt-1">
          You are viewing this dashboard as{" "}
          <span className="font-semibold">{selectedRestaurant.role.name}</span>
        </p>
      </div>

      {/* Quick stats section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6">
        <Card className="rounded-3xl bg-white text-black">
          <CardHeader className="py-3 px-6">
            <div className="flex items-start justify-between">
              <CardTitle className="text-base font-semibold">
                Today's Bookings
              </CardTitle>
              <CalendarDays className="h-5 w-5 text-[#4a5842]" />
            </div>
          </CardHeader>
          <CardContent className="pb-6 px-6">
            <p className="text-3xl font-bold">0</p>
            <p className="text-sm text-gray-500">0 seats reserved for today</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl bg-white text-black">
          <CardHeader className="py-3 px-6">
            <div className="flex items-start justify-between">
              <CardTitle className="text-base font-semibold">
                Staff Members
              </CardTitle>
              <Users className="h-5 w-5 text-[#4a5842]" />
            </div>
          </CardHeader>
          <CardContent className="pb-6 px-6">
            <p className="text-3xl font-bold">1</p>
            <p className="text-sm text-gray-500">1 active staff member</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl bg-white text-black">
          <CardHeader className="py-3 px-6">
            <div className="flex items-start justify-between">
              <CardTitle className="text-base font-semibold">Revenue</CardTitle>
              <Receipt className="h-5 w-5 text-[#4a5842]" />
            </div>
          </CardHeader>
          <CardContent className="pb-6 px-6">
            <p className="text-3xl font-bold">$0</p>
            <p className="text-sm text-gray-500">For the current month</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity section */}
      <div className="px-6 py-2">
        <Card className="rounded-3xl bg-white text-black">
          <CardHeader className="py-4 px-6">
            <CardTitle className="text-lg font-semibold">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-6 px-6">
            {isLoading ? (
              <p className="text-center py-6 text-gray-500">
                Loading activity...
              </p>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="mb-2">No recent activity</p>
                <p className="text-sm">
                  Activity will appear here as you use your restaurant dashboard
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="px-6 py-2">
        <h2 className="text-lg font-semibold text-white mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/staff" className="block">
            <Card className="rounded-3xl bg-white text-black hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Manage Staff</h3>
                    <p className="text-sm text-gray-500">
                      Add or update staff members
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-[#4a5842]" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/menus" className="block">
            <Card className="rounded-3xl bg-white text-black hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Update Menu</h3>
                    <p className="text-sm text-gray-500">
                      Add or edit menu items
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-[#4a5842]" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/bookings" className="block">
            <Card className="rounded-3xl bg-white text-black hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">View Bookings</h3>
                    <p className="text-sm text-gray-500">
                      Check upcoming reservations
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-[#4a5842]" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
