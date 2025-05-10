"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRestaurant } from "@/context/RestaurantContext";
import { MENU_URLS } from "@/lib/api-urls";
import { useToast } from "@/components/ToastContext";
import { Button } from "@/components/ui/button";
import {
  Plus,
  BookOpen,
  Utensils,
  Loader2,
  Coffee,
  BookText,
  Edit,
  Settings,
} from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Menu {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  restaurantId: number;
}

export default function MenusPage() {
  const { selectedRestaurant } = useRestaurant();
  const { addToast } = useToast();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createMenuModalOpen, setCreateMenuModalOpen] = useState(false);
  const [menuName, setMenuName] = useState("");
  const [menuDescription, setMenuDescription] = useState("");
  const [isCreatingMenu, setIsCreatingMenu] = useState(false);

  // Edit menu state
  const [editMenuModalOpen, setEditMenuModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [editMenuName, setEditMenuName] = useState("");
  const [editMenuDescription, setEditMenuDescription] = useState("");
  const [isUpdatingMenu, setIsUpdatingMenu] = useState(false);

  // Fetch menus for the selected restaurant
  const fetchMenus = async () => {
    if (!selectedRestaurant) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        addToast("You are not logged in", "error");
        return;
      }

      const response = await fetch(
        `${MENU_URLS.GET_MENUS}?restaurantId=${selectedRestaurant.restaurant.id}`,
        {
          headers: {
            Authorization: token,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch menus");
      }

      const data = await response.json();
      setMenus(data.data || []);
    } catch (error) {
      console.error("Error fetching menus:", error);
      addToast("Failed to fetch menus", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new menu
  const handleCreateMenu = async () => {
    if (!selectedRestaurant || !menuName.trim()) return;

    setIsCreatingMenu(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        addToast("You are not logged in", "error");
        return;
      }

      const response = await fetch(MENU_URLS.CREATE_MENU, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          name: menuName,
          description: menuDescription || undefined,
          restaurantId: selectedRestaurant.restaurant.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create menu");
      }

      const data = await response.json();
      addToast("Menu created successfully", "success");
      setCreateMenuModalOpen(false);
      // Reset form
      setMenuName("");
      setMenuDescription("");
      // Refresh menus list
      fetchMenus();
    } catch (error) {
      console.error("Error creating menu:", error);
      addToast("Failed to create menu", "error");
    } finally {
      setIsCreatingMenu(false);
    }
  };

  // Open the edit menu modal
  const openEditMenuModal = (menu: Menu) => {
    setEditingMenu(menu);
    setEditMenuName(menu.name);
    setEditMenuDescription(menu.description || "");
    setEditMenuModalOpen(true);
  };

  // Handle menu update
  const handleUpdateMenu = async () => {
    if (!selectedRestaurant || !editingMenu || !editMenuName.trim()) return;

    setIsUpdatingMenu(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        addToast("You are not logged in", "error");
        return;
      }

      const response = await fetch(MENU_URLS.UPDATE_MENU, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          menuId: editingMenu.id,
          name: editMenuName,
          description: editMenuDescription || undefined,
          restaurantId: selectedRestaurant.restaurant.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update menu");
      }

      addToast("Menu updated successfully", "success");
      setEditMenuModalOpen(false);

      // Update menu in local state
      setMenus(
        menus.map((menu) =>
          menu.id === editingMenu.id
            ? { ...menu, name: editMenuName, description: editMenuDescription }
            : menu
        )
      );

      // Reset form
      setEditingMenu(null);
      setEditMenuName("");
      setEditMenuDescription("");
    } catch (error) {
      console.error("Error updating menu:", error);
      addToast("Failed to update menu", "error");
    } finally {
      setIsUpdatingMenu(false);
    }
  };

  useEffect(() => {
    fetchMenus();
  }, [selectedRestaurant]);

  // If no restaurant is selected, show a message
  if (!selectedRestaurant) {
    return (
      <div className="p-4 space-y-4 w-full">
        <div className="px-6 py-2">
          <h1 className="text-2xl font-bold text-white">Menu Management</h1>
          <p className="text-white/80 mt-1 px-1">
            Please select a restaurant from the sidebar to manage menus
          </p>
        </div>
        <div className="grid grid-cols-1 px-6 py-4">
          <Card className="rounded-3xl bg-white text-black">
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-semibold mb-4">
                No Restaurant Selected
              </h2>
              <p className="text-gray-600 mb-6">
                Select a restaurant from the dropdown in the sidebar to manage
                menus
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
      {/* Header with title and create menu button */}
      <div className="px-6 py-2 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Restaurant Menus</h1>
          <p className="text-white/80 mt-1 px-1">
            Create and manage your restaurant menus and dishes
          </p>
        </div>

        {canManageMenu && (
          <div className="mt-2 md:mt-0 w-full md:w-auto">
            <Button
              className="bg-white hover:bg-white/90 text-black py-2 px-4 w-full md:w-auto font-medium rounded-2xl"
              onClick={() => setCreateMenuModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Menu
            </Button>
          </div>
        )}
      </div>

      {/* Menus list */}
      <div className="px-6 py-2">
        <Card className="rounded-3xl bg-[#4a5842] text-white">
          <CardContent className="pb-6 px-6">
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-gray-300">Loading menus...</p>
              </div>
            ) : menus.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                {menus.map((menu) => (
                  <Card
                    key={menu.id}
                    className="border-2 rounded-3xl overflow-hidden bg-white hover:bg-gray-50 transition-colors"
                  >
                    <CardHeader className="py-4 px-6 flex flex-row items-center space-y-0">
                      <div className="h-12 w-12 flex-shrink-0 rounded-full bg-[#4a5842]/10 flex items-center justify-center mr-4">
                        <BookOpen className="h-6 w-6 text-[#4a5842]" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold text-black">
                          {menu.name}
                        </CardTitle>
                        {menu.description && (
                          <p className="text-sm text-gray-500 mt-1">
                            {menu.description}
                          </p>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="px-6 pb-4">
                      <div className="flex flex-col space-y-3">
                        <Link
                          href={`/menus/${menu.id}`}
                          className="text-center py-2 px-3 bg-[#4a5842] text-white rounded-lg text-sm hover:bg-[#4a5842]/90 transition-colors"
                        >
                          <Utensils className="h-4 w-4 inline-block mr-1" />
                          Manage Dishes
                        </Link>

                        {canManageMenu && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-[#4a5842] text-[#4a5842] hover:bg-[#4a5842] hover:text-white"
                            onClick={(e) => {
                              e.preventDefault();
                              openEditMenuModal(menu);
                            }}
                          >
                            <Edit className="h-3.5 w-3.5 mr-1" />
                            Edit Menu
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <BookText className="h-16 w-16 mx-auto mb-4 opacity-40" />
                <p className="text-xl text-white/80 mb-4">No menus found</p>
                {canManageMenu && (
                  <Button
                    className="bg-white hover:bg-white/90 text-black"
                    onClick={() => setCreateMenuModalOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create your first menu
                  </Button>
                )}
                {!canManageMenu && (
                  <p className="text-white/60 mt-2">
                    You don't have permission to create menus.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Menu Modal */}
      <Dialog
        open={createMenuModalOpen}
        onOpenChange={(open) => {
          setCreateMenuModalOpen(open);
          if (!open) {
            setMenuName("");
            setMenuDescription("");
          }
        }}
      >
        <DialogContent className="bg-white text-black">
          <DialogHeader>
            <DialogTitle>Create New Menu</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreateMenu();
            }}
            className="space-y-6"
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="menuName">Menu Name</Label>
                <Input
                  id="menuName"
                  type="text"
                  value={menuName}
                  onChange={(e) => setMenuName(e.target.value)}
                  placeholder="e.g., Breakfast, Lunch, Dinner, etc."
                  className="mt-2"
                  required
                />
              </div>

              <div>
                <Label htmlFor="menuDescription">Description (Optional)</Label>
                <Textarea
                  id="menuDescription"
                  value={menuDescription}
                  onChange={(e) => setMenuDescription(e.target.value)}
                  placeholder="Brief description of this menu"
                  className="mt-2"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="submit"
                className="bg-[#4a5842] text-white hover:bg-[#778e6b]"
                disabled={isCreatingMenu || !menuName.trim()}
              >
                {isCreatingMenu ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  "Create Menu"
                )}
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Menu Modal */}
      <Dialog
        open={editMenuModalOpen}
        onOpenChange={(open) => {
          setEditMenuModalOpen(open);
          if (!open) {
            setEditingMenu(null);
            setEditMenuName("");
            setEditMenuDescription("");
          }
        }}
      >
        <DialogContent className="bg-white text-black">
          <DialogHeader>
            <DialogTitle>Edit Menu</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUpdateMenu();
            }}
            className="space-y-6"
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="editMenuName">Menu Name</Label>
                <Input
                  id="editMenuName"
                  type="text"
                  value={editMenuName}
                  onChange={(e) => setEditMenuName(e.target.value)}
                  placeholder="e.g., Breakfast, Lunch, Dinner, etc."
                  className="mt-2"
                  required
                />
              </div>

              <div>
                <Label htmlFor="editMenuDescription">
                  Description (Optional)
                </Label>
                <Textarea
                  id="editMenuDescription"
                  value={editMenuDescription}
                  onChange={(e) => setEditMenuDescription(e.target.value)}
                  placeholder="Brief description of this menu"
                  className="mt-2"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="submit"
                className="bg-[#4a5842] text-white hover:bg-[#778e6b]"
                disabled={isUpdatingMenu || !editMenuName.trim()}
              >
                {isUpdatingMenu ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Updating...
                  </>
                ) : (
                  "Update Menu"
                )}
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
