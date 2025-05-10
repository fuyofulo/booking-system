"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { useRestaurant } from "@/context/RestaurantContext";
import { MENU_URLS } from "@/lib/api-urls";
import { useToast } from "@/components/ToastContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

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

export default function EditDishPage() {
  const params = useParams();
  const router = useRouter();
  const menuId = params.menuId as string;
  const dishId = params.dishId as string;
  const { selectedRestaurant } = useRestaurant();
  const { addToast } = useToast();

  const [menu, setMenu] = useState<Menu | null>(null);
  const [dish, setDish] = useState<Dish | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [calories, setCalories] = useState("");
  const [isVegetarian, setIsVegetarian] = useState(false);

  // Fetch menu and dish details
  const fetchDishDetails = async () => {
    if (!selectedRestaurant || !menuId || !dishId) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        addToast("You are not logged in", "error");
        return;
      }

      // First, fetch menu details to make sure it exists
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

      if (!dishesResponse.ok) {
        throw new Error("Failed to fetch dishes");
      }

      const dishesData = await dishesResponse.json();
      const dishesList = dishesData.data || [];
      const currentDish = dishesList.find(
        (d: Dish) => d.id === parseInt(dishId)
      );

      if (!currentDish) {
        addToast("Dish not found", "error");
        router.push(`/menus/${menuId}`);
        return;
      }

      setDish(currentDish);

      // Initialize form with current dish values
      setName(currentDish.name);
      setDescription(currentDish.description || "");
      setPrice(currentDish.price.toString());
      setIsAvailable(currentDish.isAvailable);
      setCalories(currentDish.calories ? currentDish.calories.toString() : "");
      setIsVegetarian(currentDish.isVegetarian);
    } catch (error) {
      console.error("Error fetching dish details:", error);
      addToast("Failed to fetch dish details", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDishDetails();
  }, [selectedRestaurant, menuId, dishId]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRestaurant || !menu || !dish) return;

    // Validate form
    if (!name.trim()) {
      addToast("Dish name is required", "error");
      return;
    }

    if (!price.trim() || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      addToast("Valid price is required", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        addToast("You are not logged in", "error");
        return;
      }

      const dishData = {
        dishId: parseInt(dishId),
        name,
        description: description || undefined,
        price: parseFloat(price),
        isAvailable,
        calories: calories ? parseInt(calories) : undefined,
        isVegetarian,
        menuId: parseInt(menuId),
        restaurantId: selectedRestaurant.restaurant.id,
      };

      const response = await fetch(MENU_URLS.UPDATE_DISH, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify(dishData),
      });

      if (!response.ok) {
        throw new Error("Failed to update dish");
      }

      addToast("Dish updated successfully", "success");
      router.push(`/menus/${menuId}`);
    } catch (error) {
      console.error("Error updating dish:", error);
      addToast("Failed to update dish", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // If no restaurant is selected, show a message
  if (!selectedRestaurant) {
    return (
      <div className="p-4 space-y-4 w-full">
        <div className="px-6 py-2">
          <h1 className="text-2xl font-bold text-white">Edit Dish</h1>
          <p className="text-white/80 mt-1 px-1">
            Please select a restaurant from the sidebar to continue
          </p>
        </div>
        <Card className="rounded-3xl bg-white text-black">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-4">
              No Restaurant Selected
            </h2>
            <p className="text-gray-600 mb-6">
              Select a restaurant from the dropdown in the sidebar to edit
              dishes
            </p>
            <Button asChild className="bg-[#4a5842] hover:bg-[#4a5842]/90">
              <Link href="/profile">Go to Profile</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if current user has permission to manage menus
  const canManageMenu = selectedRestaurant.role.canManageMenu;

  if (!canManageMenu) {
    return (
      <div className="p-4 space-y-4 w-full">
        <div className="px-6 py-2">
          <h1 className="text-2xl font-bold text-white">Edit Dish</h1>
        </div>
        <Card className="rounded-3xl bg-white text-black">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-4">Permission Denied</h2>
            <p className="text-gray-600 mb-6">
              You don't have permission to manage menus in this restaurant
            </p>
            <Button asChild className="bg-[#4a5842] hover:bg-[#4a5842]/90">
              <Link href={`/menus/${menuId}`}>Go Back to Menu</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 w-full">
      {/* Header with title and back button */}
      <div className="px-6 py-2">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10 -ml-3 mr-1"
            asChild
          >
            <Link href={`/menus/${menuId}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-white">
            {isLoading ? "Loading..." : `Edit ${dish?.name}`}
          </h1>
        </div>
      </div>

      {/* Form Card */}
      <div className="px-6 py-2">
        <Card className="rounded-3xl overflow-hidden">
          <CardContent className="p-6">
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-gray-500">Loading dish details...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Dish Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter dish name"
                      className="mt-1"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Brief description of this dish"
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="price">Price ($)</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                      className="mt-1"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="calories">Calories (Optional)</Label>
                    <Input
                      id="calories"
                      type="number"
                      min="0"
                      value={calories}
                      onChange={(e) => setCalories(e.target.value)}
                      placeholder="Enter calorie count"
                      className="mt-1"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="isAvailable" className="cursor-pointer">
                      Available for Order
                    </Label>
                    <Switch
                      id="isAvailable"
                      checked={isAvailable}
                      onCheckedChange={setIsAvailable}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="isVegetarian" className="cursor-pointer">
                      Vegetarian
                    </Label>
                    <Switch
                      id="isVegetarian"
                      checked={isVegetarian}
                      onCheckedChange={setIsVegetarian}
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <Button type="button" variant="outline" asChild>
                    <Link href={`/menus/${menuId}`}>Cancel</Link>
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[#4a5842] text-white hover:bg-[#4a5842]/90"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      "Update Dish"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
