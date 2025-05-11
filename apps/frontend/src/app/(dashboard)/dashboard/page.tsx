"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRestaurant } from "@/context/RestaurantContext";
import {
  USER_URLS,
  BOOKING_URLS,
  RESTAURANT_USER_URLS,
  TABLE_URLS,
  MENU_URLS,
  DISH_URLS,
} from "@/lib/api-urls";
import { useToast } from "@/components/ToastContext";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  CalendarDays,
  Users,
  Receipt,
  ArrowRight,
  Phone,
  MessageSquare,
  Menu,
  Table,
} from "lucide-react";
import { format } from "date-fns";

export default function DashboardPage() {
  const { selectedRestaurant } = useRestaurant();
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [todayBookings, setTodayBookings] = useState(0);
  const [totalStaff, setTotalStaff] = useState(0);
  const [menuItems, setMenuItems] = useState(0);
  const [tableCount, setTableCount] = useState(0);

  // Fetch dashboard data
  useEffect(() => {
    if (selectedRestaurant) {
      const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
          const token = localStorage.getItem("token");
          if (!token) {
            addToast("Not authenticated", "error");
            return;
          }

          // Get today's date in YYYY-MM-DD format
          const today = format(new Date(), "yyyy-MM-dd");

          // Fetch today's bookings
          const bookingsRes = await fetch(
            `${BOOKING_URLS.GET_BOOKINGS_BY_DATE}?restaurantId=${selectedRestaurant.restaurant.id}&date=${today}`,
            {
              headers: {
                Authorization: token,
              },
            }
          )
            .then((res) => res.json())
            .catch(() => ({ bookings: [] }));

          // Fetch staff count
          const staffRes = await fetch(
            RESTAURANT_USER_URLS.GET_STAFF(selectedRestaurant.restaurant.id),
            {
              headers: {
                Authorization: token,
              },
            }
          )
            .then((res) => res.json())
            .catch(() => []);

          // Fetch table count
          const tablesRes = await fetch(
            `${TABLE_URLS.GET_ALL}?restaurantId=${selectedRestaurant.restaurant.id}`,
            {
              headers: {
                Authorization: token,
              },
            }
          )
            .then((res) => res.json())
            .catch(() => ({ tables: [] }));

          // Fetch menu items count
          const menusRes = await fetch(
            `${MENU_URLS.GET_MENUS}?restaurantId=${selectedRestaurant.restaurant.id}`,
            {
              headers: {
                Authorization: token,
              },
            }
          )
            .then((res) => res.json())
            .catch(() => ({ data: { menus: [] } }));

          // Get dish count if menus are available
          let dishCount = 0;
          if (menusRes.data?.menus?.length > 0) {
            // Get dishes for each menu
            const dishPromises = menusRes.data.menus.map((menu: any) =>
              fetch(`${DISH_URLS.GET_BY_MENU(menu.id)}`, {
                headers: {
                  Authorization: token,
                },
              }).then((res) => res.json())
            );

            const dishResults = await Promise.all(dishPromises);
            dishCount = dishResults.reduce(
              (count: number, result: any) =>
                count + (result.dishes?.length || 0),
              0
            );
          }

          // Update state with fetched data
          setTodayBookings(bookingsRes.bookings?.length || 0);
          setTotalStaff(staffRes?.length || 0);
          setMenuItems(dishCount);
          setTableCount(tablesRes.tables?.length || 0);
        } catch (error) {
          console.error("Error fetching dashboard data:", error);
          addToast("Failed to load dashboard data", "error");
        } finally {
          setIsLoading(false);
        }
      };

      fetchDashboardData();
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
    <div className="p-2 space-y-3 w-full">
      {/* Welcome header */}
      <div className="px-4 py-1">
        <h1 className="text-xl font-bold text-white">
          {selectedRestaurant.restaurant.name} dashboard
        </h1>
        <p className="text-white/80 text-sm">
          You are viewing this dashboard as{" "}
          <span className="font-semibold">{selectedRestaurant.role.name}</span>
        </p>
      </div>

      {/* Quick stats section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 px-4">
        <Card className="rounded-xl bg-white text-black">
          <CardHeader className="py-2 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                Today's Bookings
              </CardTitle>
              <CalendarDays className="h-4 w-4 text-[#4a5842]" />
            </div>
          </CardHeader>
          <CardContent className="pb-3 px-4 pt-0">
            {isLoading ? (
              <p className="text-2xl font-bold animate-pulse">...</p>
            ) : (
              <>
                <p className="text-2xl font-bold">{todayBookings}</p>
                <p className="text-xs text-gray-500">
                  {todayBookings === 1
                    ? "1 booking"
                    : `${todayBookings} bookings`}{" "}
                  today
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-white text-black">
          <CardHeader className="py-2 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                Staff Members
              </CardTitle>
              <Users className="h-4 w-4 text-[#4a5842]" />
            </div>
          </CardHeader>
          <CardContent className="pb-3 px-4 pt-0">
            {isLoading ? (
              <p className="text-2xl font-bold animate-pulse">...</p>
            ) : (
              <>
                <p className="text-2xl font-bold">{totalStaff}</p>
                <p className="text-xs text-gray-500">
                  {totalStaff === 1
                    ? "1 staff member"
                    : `${totalStaff} staff members`}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-white text-black">
          <CardHeader className="py-2 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                Menu Items
              </CardTitle>
              <Menu className="h-4 w-4 text-[#4a5842]" />
            </div>
          </CardHeader>
          <CardContent className="pb-3 px-4 pt-0">
            {isLoading ? (
              <p className="text-2xl font-bold animate-pulse">...</p>
            ) : (
              <>
                <p className="text-2xl font-bold">{menuItems}</p>
                <p className="text-xs text-gray-500">
                  {menuItems === 1 ? "1 item" : `${menuItems} items`} on menus
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-white text-black">
          <CardHeader className="py-2 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Tables</CardTitle>
              <Table className="h-4 w-4 text-[#4a5842]" />
            </div>
          </CardHeader>
          <CardContent className="pb-3 px-4 pt-0">
            {isLoading ? (
              <p className="text-2xl font-bold animate-pulse">...</p>
            ) : (
              <>
                <p className="text-2xl font-bold">{tableCount}</p>
                <p className="text-xs text-gray-500">
                  {tableCount === 1 ? "1 table" : `${tableCount} tables`} total
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Tools Section */}
      <div className="px-4 py-1">
        <h2 className="text-base font-semibold text-white mb-2">
          AI Assistants
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Link href="/assistant" className="block">
            <Card className="rounded-xl bg-white text-black hover:shadow-md transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-8 w-8 bg-[#4a5842]/10 rounded-full flex items-center justify-center mr-3">
                      <MessageSquare className="h-4 w-4 text-[#4a5842]" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">
                        Intelligent Assistant
                      </h3>
                      <p className="text-xs text-gray-500">
                        AI assistant for restaurant management
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#4a5842]" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/voice-agent" className="block">
            <Card className="rounded-xl bg-white text-black hover:shadow-md transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-8 w-8 bg-[#4a5842]/10 rounded-full flex items-center justify-center mr-3">
                      <Phone className="h-4 w-4 text-[#4a5842]" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">Voice Agent</h3>
                      <p className="text-xs text-gray-500">
                        AI-powered voice assistant
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#4a5842]" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Quick actions */}
      <div className="px-4 py-1">
        <h2 className="text-base font-semibold text-white mb-2">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          <Link href="/staff" className="block">
            <Card className="rounded-xl bg-white text-black hover:shadow-md transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-sm">Staff</h3>
                    <p className="text-xs text-gray-500">Manage team</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#4a5842]" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/menus" className="block">
            <Card className="rounded-xl bg-white text-black hover:shadow-md transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-sm">Menus</h3>
                    <p className="text-xs text-gray-500">Edit menu items</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#4a5842]" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/bookings" className="block">
            <Card className="rounded-xl bg-white text-black hover:shadow-md transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-sm">Bookings</h3>
                    <p className="text-xs text-gray-500">View reservations</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#4a5842]" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/orders" className="block">
            <Card className="rounded-xl bg-white text-black hover:shadow-md transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-sm">Orders</h3>
                    <p className="text-xs text-gray-500">Manage orders</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#4a5842]" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/tables" className="block">
            <Card className="rounded-xl bg-white text-black hover:shadow-md transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-sm">Tables</h3>
                    <p className="text-xs text-gray-500">Manage tables</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#4a5842]" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/schedule" className="block">
            <Card className="rounded-xl bg-white text-black hover:shadow-md transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-sm">Schedule</h3>
                    <p className="text-xs text-gray-500">Set availability</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#4a5842]" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
