"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRestaurant } from "@/context/RestaurantContext";
import { MENU_URLS, DISH_URLS } from "@/lib/api-urls";
import { useToast } from "@/components/ToastContext";
import { Button } from "@/components/ui/button";
import {
  Plus,
  ArrowLeft,
  Utensils,
  Loader2,
  UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface Menu {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  restaurantId: number;
}

interface Dish {
  id: number;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  calories: number | null;
  isVegetarian: boolean;
  menuId: number;
  restaurantId: number;
}

export default function MenuDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const menuId = params.menuId as string;
  const { selectedRestaurant } = useRestaurant();
  const { addToast } = useToast();

  const [menu, setMenu] = useState<Menu | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch menu details and dishes
  const fetchMenuDetails = async () => {
    if (!selectedRestaurant || !menuId) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        addToast("You are not logged in", "error");
        return;
      }

      // First, fetch menu details
      const menuResponse = await fetch(
        `${MENU_URLS.GET_MENUS}?restaurantId=${selectedRestaurant.restaurant.id}`,
        {
          headers: {
            Authorization: token,
          },
        }
      );

      if (!menuResponse.ok) {
        throw new Error("Failed to fetch menu details");
      }

      const menuData = await menuResponse.json();
      const menusList = menuData.data || [];
      const currentMenu = menusList.find(
        (m: Menu) => m.id === parseInt(menuId)
      );

      if (!currentMenu) {
        addToast("Menu not found", "error");
        router.push("/menus");
        return;
      }

      setMenu(currentMenu);

      // Then, fetch dishes for this menu
      const dishesResponse = await fetch(
        `${MENU_URLS.GET_DISHES}?restaurantId=${selectedRestaurant.restaurant.id}&menuId=${menuId}`,
        {
          headers: {
            Authorization: token,
          },
        }
      );

      if (dishesResponse.ok) {
        const dishesData = await dishesResponse.json();
        setDishes(dishesData.data || []);
      }
    } catch (error) {
      console.error("Error fetching menu details:", error);
      addToast("Failed to fetch menu details", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuDetails();
  }, [selectedRestaurant, menuId]);

  // If no restaurant is selected, show a message
  if (!selectedRestaurant) {
    return (
      <div className="p-4 space-y-4 w-full">
        <div className="px-6 py-2">
          <h1 className="text-2xl font-bold text-white">Menu Details</h1>
          <p className="text-white/80 mt-1 px-1">
            Please select a restaurant from the sidebar to continue
          </p>
        </div>
        <div className="grid grid-cols-1 px-6 py-4">
          <Card className="rounded-3xl bg-white text-black">
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-semibold mb-4">
                No Restaurant Selected
              </h2>
              <p className="text-gray-600 mb-6">
                Select a restaurant from the dropdown in the sidebar to view
                menu details
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

  // Check if current user has permission to manage menus
  const canManageMenu = selectedRestaurant.role.canManageMenu;

  return (
    <div className="p-4 space-y-4 w-full">
      {/* Header with title and back button */}
      <div className="px-6 py-2 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10 -ml-3 mr-1"
              asChild
            >
              <Link href="/menus">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold text-white">
              {isLoading ? "Loading..." : menu?.name}
            </h1>
          </div>
          <p className="text-white/80 mt-1 px-1">
            {isLoading
              ? "Loading..."
              : menu?.description || "No description provided"}
          </p>
        </div>

        {canManageMenu && (
          <div className="mt-2 md:mt-0 w-full md:w-auto">
            <Button
              className="bg-white hover:bg-white/90 text-black py-2 px-4 w-full md:w-auto font-medium rounded-2xl"
              asChild
            >
              <Link href={`/menus/${menuId}/add-dish`}>
                <Plus className="h-4 w-4 mr-2" />
                Add Dish
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Dishes list */}
      <div className="px-6 py-2">
        <Card className="rounded-3xl bg-[#4a5842] text-white">
          <CardContent className="pb-6 px-6">
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-gray-300">Loading dishes...</p>
              </div>
            ) : dishes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                {dishes.map((dish) => (
                  <Card
                    key={dish.id}
                    className="border-2 rounded-3xl overflow-hidden bg-white hover:bg-gray-50 transition-colors"
                  >
                    <CardHeader className="py-4 px-6">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg font-semibold text-black">
                          {dish.name}
                        </CardTitle>
                        <div className="text-lg font-semibold text-black">
                          $
                          {typeof dish.price === "number"
                            ? dish.price.toFixed(2)
                            : parseFloat(dish.price).toFixed(2)}
                        </div>
                      </div>
                      {dish.description && (
                        <p className="text-sm text-gray-500 mt-1">
                          {dish.description}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="px-6 pb-4">
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge
                          variant={dish.isAvailable ? "default" : "destructive"}
                          className={
                            dish.isAvailable
                              ? "bg-green-100 text-green-800 hover:bg-green-200"
                              : ""
                          }
                        >
                          {dish.isAvailable ? "Available" : "Unavailable"}
                        </Badge>

                        {dish.isVegetarian && (
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">
                            Vegetarian
                          </Badge>
                        )}

                        {dish.calories && (
                          <Badge
                            variant="outline"
                            className="bg-gray-100 text-gray-800"
                          >
                            {dish.calories} cal
                          </Badge>
                        )}
                      </div>

                      {canManageMenu && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2 border-[#4a5842] text-[#4a5842] hover:bg-[#4a5842] hover:text-white"
                          asChild
                        >
                          <Link href={`/menus/${menuId}/dishes/${dish.id}`}>
                            Edit Dish
                          </Link>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <UtensilsCrossed className="h-16 w-16 mx-auto mb-4 opacity-40" />
                <p className="text-xl text-white/80 mb-4">No dishes found</p>
                {canManageMenu && (
                  <Button
                    className="bg-white hover:bg-white/90 text-black"
                    asChild
                  >
                    <Link href={`/menus/${menuId}/add-dish`}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add your first dish
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
