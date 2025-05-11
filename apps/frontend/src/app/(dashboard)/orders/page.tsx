"use client";

import { useState, useEffect } from "react";
import { useRestaurant } from "@/context/RestaurantContext";
import { useToast } from "@/components/ToastContext";
import { BOOKING_URLS, ORDER_URLS, DISH_URLS, MENU_URLS } from "@/lib/api-urls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  User,
  Phone,
  Search,
  Plus,
  Loader2,
  ShoppingCart,
  Utensils,
  CookingPot,
  CheckCircle2,
  X,
  AlertCircle,
  Package,
  BookOpen,
  Receipt,
  Edit,
  Trash,
} from "lucide-react";
import { format, parseISO, isToday } from "date-fns";
import Link from "next/link";
import { Textarea } from "@/components/ui/textarea";

// Types
interface Dish {
  id: number;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  isAvailable: boolean;
  isVegetarian: boolean;
  calories: number | null;
}

interface OrderItem {
  id: number;
  dishId: number;
  quantity: number;
  unitPrice: string;
  status: string;
  dish: {
    name: string;
    imageUrl: string | null;
  };
}

interface Order {
  id: number;
  orderNumber: string;
  restaurantId: number;
  tableId: number;
  bookingId: number | null;
  customerName: string | null;
  status: string;
  totalAmount: string;
  notes: string | null;
  items: OrderItem[];
}

interface Booking {
  id: number;
  tableId: number;
  tableName?: string;
  customerName: string;
  date: string;
}

interface OrderItemInput {
  dishId: number;
  quantity: number;
}

const statusColors: Record<string, string> = {
  received: "bg-blue-500",
  preparing: "bg-orange-500",
  ready: "bg-yellow-500",
  completed: "bg-green-500",
  cancelled: "bg-red-500",
};

const itemStatusColors: Record<string, string> = {
  pending: "bg-blue-500",
  preparing: "bg-orange-500",
  ready: "bg-yellow-500",
  served: "bg-green-500",
  cancelled: "bg-red-500",
};

export default function OrdersPage() {
  const { selectedRestaurant } = useRestaurant();
  const { addToast } = useToast();

  // State for orders
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBookingFilter, setSelectedBookingFilter] = useState<
    number | null
  >(null);
  const [availableBookings, setAvailableBookings] = useState<Booking[]>([]);
  const [isLoadingBookingFilter, setIsLoadingBookingFilter] = useState(false);

  // State for creating orders
  const [createOrderModalOpen, setCreateOrderModalOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(
    null
  );
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [isLoadingDishes, setIsLoadingDishes] = useState(false);
  const [menus, setMenus] = useState<any[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState<number | null>(null);
  const [isLoadingMenus, setIsLoadingMenus] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItemInput[]>([]);
  const [notes, setNotes] = useState("");
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  // State for updating order items
  const [updateItemStatusModalOpen, setUpdateItemStatusModalOpen] =
    useState(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Fetch all orders for the restaurant
  const fetchOrders = async () => {
    if (!selectedRestaurant) return;

    setIsLoadingOrders(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        addToast("You are not logged in", "error");
        return;
      }

      const response = await fetch(
        `${ORDER_URLS.GET_ALL}?restaurantId=${selectedRestaurant.restaurant.id}`,
        {
          headers: {
            Authorization: token,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }

      const data = await response.json();
      if (data.success) {
        setOrders(data.orders || []);
        filterOrders(data.orders || [], searchTerm, activeTab);
      } else {
        throw new Error(data.message || "Failed to fetch orders");
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      addToast("Failed to fetch orders", "error");
    } finally {
      setIsLoadingOrders(false);
    }
  };

  // Filter orders based on active tab and search term
  const filterOrders = (ordersToFilter: Order[], term: string, tab: string) => {
    // First filter by tab
    let filtered = [...ordersToFilter];

    if (tab !== "all") {
      filtered = filtered.filter((order) => order.status === tab);
    }

    // Then filter by search term
    if (term) {
      const lowerTerm = term.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.orderNumber.toLowerCase().includes(lowerTerm) ||
          (order.customerName &&
            order.customerName.toLowerCase().includes(lowerTerm))
      );
    }

    // Sort by order ID (newest first)
    filtered.sort((a, b) => b.id - a.id);

    setFilteredOrders(filtered);
  };

  // Fetch available bookings
  const fetchBookings = async () => {
    if (!selectedRestaurant) return;

    setIsLoadingBookings(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        addToast("You are not logged in", "error");
        return;
      }

      const response = await fetch(
        `${BOOKING_URLS.BOOKED}?restaurantId=${selectedRestaurant.restaurant.id}`,
        {
          headers: {
            Authorization: token,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch bookings");
      }

      const data = await response.json();
      setBookings(data.bookings || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      addToast("Failed to fetch bookings", "error");
    } finally {
      setIsLoadingBookings(false);
    }
  };

  // Fetch menus for the restaurant
  const fetchMenus = async () => {
    if (!selectedRestaurant) return;

    setIsLoadingMenus(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        addToast("You are not logged in", "error");
        return;
      }

      console.log(
        "Fetching menus for restaurant:",
        selectedRestaurant.restaurant.id
      );
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
      console.log("API Response for menus:", data);

      // Extract menus based on the actual API response structure
      const restaurantMenus = data.data || data.menus || [];
      console.log("Extracted menus:", restaurantMenus);
      setMenus(restaurantMenus);

      // Select the first menu by default if available
      if (restaurantMenus.length > 0) {
        console.log("Auto-selecting first menu:", restaurantMenus[0].id);
        setSelectedMenuId(restaurantMenus[0].id);
        // Fetch dishes for the first menu immediately
        await fetchDishesForMenu(restaurantMenus[0].id);
      } else {
        console.log("No menus available for this restaurant");
      }
    } catch (error) {
      console.error("Error fetching menus:", error);
      addToast("Failed to fetch menus", "error");
    } finally {
      setIsLoadingMenus(false);
    }
  };

  // Fetch dishes for a specific menu
  const fetchDishesForMenu = async (menuId: number) => {
    if (!selectedRestaurant || !menuId) {
      console.log("Cannot fetch dishes: missing restaurantId or menuId");
      return;
    }

    setIsLoadingDishes(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        addToast("You are not logged in", "error");
        return;
      }

      console.log(
        `Fetching dishes for restaurant ${selectedRestaurant.restaurant.id}, menu ${menuId}`
      );
      const url = `${MENU_URLS.GET_DISHES}?restaurantId=${selectedRestaurant.restaurant.id}&menuId=${menuId}`;
      console.log("Fetch URL:", url);

      const response = await fetch(url, {
        headers: {
          Authorization: token,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch dishes");
      }

      const data = await response.json();
      console.log("API Response for dishes:", data);

      // Extract dishes based on different possible response formats
      const dishesData = data.data || data.dishes || [];
      console.log("Extracted dishes data:", dishesData);

      const availableDishes =
        dishesData.filter((dish: Dish) => dish.isAvailable) || [];
      console.log("Available dishes:", availableDishes);
      setDishes(availableDishes);
    } catch (error) {
      console.error("Error fetching dishes:", error);
      addToast("Failed to fetch dishes", "error");
    } finally {
      setIsLoadingDishes(false);
    }
  };

  // Fetch dishes (this will be called when selectedMenuId changes)
  const fetchDishes = async () => {
    if (selectedMenuId) {
      await fetchDishesForMenu(selectedMenuId);
    } else {
      console.log("No menuId selected, cannot fetch dishes");
    }
  };

  // Add item to order
  const addItemToOrder = (dishId: number) => {
    const existing = orderItems.find((item) => item.dishId === dishId);

    if (existing) {
      setOrderItems(
        orderItems.map((item) =>
          item.dishId === dishId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setOrderItems([...orderItems, { dishId, quantity: 1 }]);
    }
  };

  // Remove item from order
  const removeItemFromOrder = (dishId: number) => {
    const existing = orderItems.find((item) => item.dishId === dishId);

    if (existing && existing.quantity > 1) {
      setOrderItems(
        orderItems.map((item) =>
          item.dishId === dishId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
      );
    } else {
      setOrderItems(orderItems.filter((item) => item.dishId !== dishId));
    }
  };

  // Update quantity directly
  const updateItemQuantity = (dishId: number, quantity: number) => {
    if (quantity <= 0) {
      setOrderItems(orderItems.filter((item) => item.dishId !== dishId));
    } else {
      setOrderItems(
        orderItems.map((item) =>
          item.dishId === dishId ? { ...item, quantity } : item
        )
      );
    }
  };

  // Calculate total for new order
  const calculateTotal = () => {
    return orderItems
      .reduce((total, item) => {
        const dish = dishes.find((d) => d.id === item.dishId);
        return total + (dish ? parseFloat(dish.price) * item.quantity : 0);
      }, 0)
      .toFixed(2);
  };

  // Create a new order
  const handleCreateOrder = async () => {
    if (!selectedRestaurant || !selectedBookingId || orderItems.length === 0) {
      addToast("Please select a booking and add items to the order", "error");
      return;
    }

    setIsCreatingOrder(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        addToast("You are not logged in", "error");
        return;
      }

      const booking = bookings.find((b) => b.id === selectedBookingId);
      if (!booking) {
        throw new Error("Selected booking not found");
      }

      const response = await fetch(ORDER_URLS.CREATE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          restaurantId: selectedRestaurant.restaurant.id,
          tableId: booking.tableId,
          bookingId: selectedBookingId,
          notes: notes || undefined,
          items: orderItems,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create order");
      }

      addToast("Order created successfully", "success");
      setCreateOrderModalOpen(false);
      resetOrderForm();
      fetchOrders();
    } catch (error) {
      console.error("Error creating order:", error);
      addToast(
        error instanceof Error ? error.message : "Failed to create order",
        "error"
      );
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // Reset the order creation form
  const resetOrderForm = () => {
    setSelectedBookingId(null);
    setOrderItems([]);
    setNotes("");
  };

  // Update order item status
  const handleUpdateItemStatus = async () => {
    if (!selectedRestaurant || selectedItems.length === 0 || !selectedStatus) {
      addToast("Please select items and a status", "error");
      return;
    }

    setIsUpdatingStatus(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        addToast("You are not logged in", "error");
        return;
      }

      const response = await fetch(ORDER_URLS.UPDATE_ITEM_STATUS, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          orderItemIds: selectedItems,
          status: selectedStatus,
          restaurantId: selectedRestaurant.restaurant.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update item status");
      }

      addToast(
        `Updated ${selectedItems.length} items to ${selectedStatus}`,
        "success"
      );
      setUpdateItemStatusModalOpen(false);
      setSelectedItems([]);
      setSelectedStatus("");
      fetchOrders();
    } catch (error) {
      console.error("Error updating item status:", error);
      addToast(
        error instanceof Error ? error.message : "Failed to update item status",
        "error"
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Prepare items for status update
  const openUpdateStatusModal = (
    orderItemIds: number[],
    currentStatus: string
  ) => {
    setSelectedItems(orderItemIds);
    setSelectedStatus(currentStatus);
    setUpdateItemStatusModalOpen(true);
  };

  // Additional method to fetch orders by booking ID
  const fetchOrdersByBooking = async (bookingId: number) => {
    if (!selectedRestaurant || !bookingId) return;

    setIsLoadingOrders(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        addToast("You are not logged in", "error");
        return;
      }

      const response = await fetch(`${ORDER_URLS.GET_BY_BOOKING(bookingId)}`, {
        headers: {
          Authorization: token,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch orders for this booking");
      }

      const data = await response.json();
      if (data.success) {
        setOrders(data.orders || []);
        filterOrders(data.orders || [], searchTerm, activeTab);

        // Show booking info in a toast
        addToast(
          `Showing ${data.orderCount} orders for ${data.booking.customerName}`,
          "info"
        );
      } else {
        throw new Error(
          data.message || "Failed to fetch orders for this booking"
        );
      }
    } catch (error) {
      console.error("Error fetching orders by booking:", error);
      addToast("Failed to fetch orders for this booking", "error");
    } finally {
      setIsLoadingOrders(false);
    }
  };

  // Fetch available bookings for filtering
  const fetchAvailableBookings = async () => {
    if (!selectedRestaurant) return;

    setIsLoadingBookingFilter(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        addToast("You are not logged in", "error");
        return;
      }

      const response = await fetch(
        `${BOOKING_URLS.BOOKED}?restaurantId=${selectedRestaurant.restaurant.id}`,
        {
          headers: {
            Authorization: token,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch bookings");
      }

      const data = await response.json();
      setAvailableBookings(data.bookings || []);
    } catch (error) {
      console.error("Error fetching bookings for filter:", error);
    } finally {
      setIsLoadingBookingFilter(false);
    }
  };

  // Handle booking filter change
  const handleBookingFilterChange = (bookingId: string) => {
    if (bookingId === "all") {
      setSelectedBookingFilter(null);
      fetchOrders(); // Reset to all orders
    } else {
      const id = parseInt(bookingId);
      setSelectedBookingFilter(id);
      fetchOrdersByBooking(id);
    }
  };

  // Effect to fetch orders when restaurant changes
  useEffect(() => {
    if (selectedRestaurant) {
      fetchOrders();
      fetchMenus(); // Fetch menus when component mounts or restaurant changes
    }
  }, [selectedRestaurant]);

  // Effect to filter orders when search term or active tab changes
  useEffect(() => {
    filterOrders(orders, searchTerm, activeTab);
  }, [searchTerm, activeTab, orders]);

  // Effect to fetch bookings and dishes when opening create order modal
  useEffect(() => {
    if (createOrderModalOpen) {
      fetchBookings();
      fetchMenus();
    }
  }, [createOrderModalOpen]);

  // Effect to fetch dishes when menu changes
  useEffect(() => {
    if (selectedMenuId) {
      fetchDishes();
    }
  }, [selectedMenuId]);

  // Effect to fetch available bookings for filtering
  useEffect(() => {
    if (selectedRestaurant) {
      fetchAvailableBookings();
    }
  }, [selectedRestaurant]);

  // If no restaurant is selected, show a message
  if (!selectedRestaurant) {
    return (
      <div className="p-4 space-y-4 w-full">
        <div className="px-6 py-2">
          <h1 className="text-2xl font-bold text-white">Order Management</h1>
          <p className="text-white/80 mt-1 px-1">
            Please select a restaurant from the sidebar to manage orders
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
                orders
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

  // Check if current user has permission to manage orders
  const canManageOrders = selectedRestaurant.role.canManageOrders;

  return (
    <div className="p-4 space-y-4 w-full">
      {/* Header with title and add order button */}
      <div className="px-6 py-2 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Order Management</h1>
          <p className="text-white/80 mt-1 px-1">
            Create and manage customer orders
          </p>
        </div>

        {canManageOrders && (
          <div className="mt-2 md:mt-0 w-full md:w-auto">
            <Button
              className="bg-white hover:bg-white/90 text-black py-2 px-4 w-full md:w-auto font-medium rounded-2xl"
              onClick={() => setCreateOrderModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Order
            </Button>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="px-6 py-2">
        <Card className="rounded-3xl bg-[#4a5842] text-white">
          <CardContent className="pb-6 px-6 pt-6">
            {/* Tabs and filters */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
              <Tabs
                defaultValue="all"
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full lg:w-auto"
              >
                <TabsList className="bg-white/10 w-full lg:w-auto">
                  <TabsTrigger
                    value="all"
                    className="data-[state=active]:bg-white data-[state=active]:text-[#4a5842]"
                  >
                    All
                  </TabsTrigger>
                  <TabsTrigger
                    value="received"
                    className="data-[state=active]:bg-white data-[state=active]:text-[#4a5842]"
                  >
                    Received
                  </TabsTrigger>
                  <TabsTrigger
                    value="preparing"
                    className="data-[state=active]:bg-white data-[state=active]:text-[#4a5842]"
                  >
                    Preparing
                  </TabsTrigger>
                  <TabsTrigger
                    value="ready"
                    className="data-[state=active]:bg-white data-[state=active]:text-[#4a5842]"
                  >
                    Ready
                  </TabsTrigger>
                  <TabsTrigger
                    value="completed"
                    className="data-[state=active]:bg-white data-[state=active]:text-[#4a5842]"
                  >
                    Completed
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/70" />
                  <Input
                    placeholder="Search orders..."
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      onClick={() => setSearchTerm("")}
                    >
                      <X className="h-4 w-4 text-white/70" />
                    </button>
                  )}
                </div>

                <Select
                  value={selectedBookingFilter?.toString() || "all"}
                  onValueChange={handleBookingFilterChange}
                >
                  <SelectTrigger className="w-[200px] bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Filter by booking" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All bookings</SelectItem>
                    {isLoadingBookingFilter ? (
                      <div className="flex items-center justify-center p-2">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span>Loading...</span>
                      </div>
                    ) : (
                      availableBookings.map((booking) => (
                        <SelectItem
                          key={booking.id}
                          value={booking.id.toString()}
                        >
                          {booking.customerName} -{" "}
                          {format(parseISO(booking.date), "MMM d")}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Orders display */}
            {isLoadingOrders ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-white" />
                <p className="text-white">Loading orders...</p>
              </div>
            ) : filteredOrders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOrders.map((order) => (
                  <Card
                    key={order.id}
                    className="bg-white text-black border-0 shadow-md overflow-hidden flex flex-col h-full"
                  >
                    <div className="p-4 border-b border-gray-100">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Receipt className="h-5 w-5 mr-2 text-gray-500" />
                            <h3 className="text-lg font-medium">
                              {order.orderNumber}
                            </h3>
                          </div>
                          <Badge className={`${statusColors[order.status]}`}>
                            {order.status.charAt(0).toUpperCase() +
                              order.status.slice(1)}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-3 text-gray-500 text-sm">
                          <div className="flex items-center">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 mr-1"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M12 2v2M12 14v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                            </svg>
                            ${parseFloat(order.totalAmount).toFixed(2)}
                          </div>
                          {order.customerName && (
                            <div className="flex items-center">
                              <User className="h-3.5 w-3.5 mr-1" />
                              {order.customerName}
                            </div>
                          )}
                          <Badge
                            variant="outline"
                            className="border-gray-200 text-gray-700 bg-gray-50"
                          >
                            Table #{order.tableId}
                          </Badge>
                        </div>
                      </div>

                      {order.notes && (
                        <div className="mt-2 bg-gray-50 p-2 rounded-md text-sm">
                          <span className="font-medium">Notes:</span>{" "}
                          {order.notes}
                        </div>
                      )}
                    </div>

                    <div className="p-4 flex-1 flex flex-col">
                      <div className="mb-2 text-sm font-medium flex justify-between items-center">
                        <span>Order Items ({order.items.length})</span>
                        {canManageOrders &&
                          order.status !== "completed" &&
                          order.status !== "cancelled" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700 text-xs"
                              onClick={() =>
                                openUpdateStatusModal(
                                  order.items.map((item) => item.id),
                                  order.items.length > 0
                                    ? order.items[0].status
                                    : "pending"
                                )
                              }
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Update All
                            </Button>
                          )}
                      </div>

                      <div className="space-y-2 flex-1 min-h-[100px] overflow-y-auto text-sm">
                        {order.items.slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
                          >
                            <div className="flex items-center gap-2">
                              <div className="font-medium">
                                {item.quantity}x {item.dish.name}
                              </div>
                              <Badge
                                className={`${itemStatusColors[item.status]} text-xs`}
                              >
                                {item.status}
                              </Badge>
                            </div>
                            <div className="text-gray-500">
                              $
                              {(
                                parseFloat(item.unitPrice) * item.quantity
                              ).toFixed(2)}
                            </div>
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <div className="text-center py-1 text-gray-400 text-xs">
                            +{order.items.length - 3} more items
                          </div>
                        )}
                      </div>

                      <div className="mt-auto pt-3 flex justify-between items-center border-t border-gray-100 text-sm">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-gray-600 hover:text-gray-900 px-2 py-1 h-7 text-xs hover:bg-gray-50"
                          onClick={() => {
                            // TODO: Implement view details functionality
                            addToast(
                              "Order details view not yet implemented",
                              "info"
                            );
                          }}
                        >
                          View Details
                        </Button>

                        {canManageOrders &&
                          order.status !== "completed" &&
                          order.status !== "cancelled" && (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 rounded-full hover:bg-gray-50 text-gray-700"
                                onClick={() =>
                                  openUpdateStatusModal(
                                    order.items.map((item) => item.id),
                                    "ready"
                                  )
                                }
                                title="Mark as Ready"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 rounded-full hover:bg-gray-50 text-gray-700"
                                onClick={() =>
                                  openUpdateStatusModal(
                                    order.items.map((item) => item.id),
                                    "completed"
                                  )
                                }
                                title="Mark as Completed"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-3.5 w-3.5"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </Button>
                            </div>
                          )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white/5 rounded-lg">
                <ShoppingCart className="h-12 w-12 text-white/30 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">
                  No orders found
                </h3>
                <p className="text-white/70 max-w-md mx-auto mb-6">
                  {searchTerm
                    ? "No orders match your search criteria. Try a different search term."
                    : activeTab !== "all"
                      ? `No orders with status "${activeTab}" found.`
                      : "There are no orders yet. Create a new order to get started."}
                </p>
                {canManageOrders && (
                  <Button
                    onClick={() => setCreateOrderModalOpen(true)}
                    className="bg-white hover:bg-white/90 text-[#4a5842]"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Order
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Order Modal */}
      <Dialog
        open={createOrderModalOpen}
        onOpenChange={setCreateOrderModalOpen}
      >
        <DialogContent className="bg-white text-black sm:max-w-[600px] md:max-w-[750px] lg:max-w-[900px] p-6 overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl">Create New Order</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left column - Booking selection and Order notes */}
            <div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="booking" className="mb-2 block">
                    Select Booking
                  </Label>
                  <Select
                    value={selectedBookingId?.toString() || ""}
                    onValueChange={(value) =>
                      setSelectedBookingId(Number(value))
                    }
                  >
                    <SelectTrigger id="booking" className="w-full">
                      <SelectValue placeholder="Select a booking" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingBookings ? (
                        <div className="flex items-center justify-center py-2">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span>Loading bookings...</span>
                        </div>
                      ) : bookings.length > 0 ? (
                        bookings.map((booking) => (
                          <SelectItem
                            key={booking.id}
                            value={booking.id.toString()}
                          >
                            {booking.customerName} - Table{" "}
                            {booking.tableName || booking.tableId} (
                            {format(parseISO(booking.date), "MMM d, yyyy")})
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-center text-sm text-gray-500">
                          No bookings available
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notes">Order Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any special instructions or notes for this order"
                    className="mt-1 h-32"
                  />
                </div>

                {orderItems.length > 0 && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-md border">
                    <h3 className="font-medium mb-2">Order Summary</h3>
                    <div className="space-y-2">
                      {orderItems.map((item) => {
                        const dish = dishes.find((d) => d.id === item.dishId);
                        return dish ? (
                          <div
                            key={item.dishId}
                            className="flex justify-between items-center"
                          >
                            <div>
                              <span className="font-medium">
                                {item.quantity}x
                              </span>{" "}
                              {dish.name}
                            </div>
                            <div className="flex items-center gap-2">
                              <span>
                                $
                                {(
                                  parseFloat(dish.price) * item.quantity
                                ).toFixed(2)}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                                onClick={() => removeItemFromOrder(item.dishId)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ) : null;
                      })}
                      <div className="pt-2 mt-2 border-t border-gray-200 flex justify-between font-medium">
                        <span>Total:</span>
                        <span>${calculateTotal()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right column - Dish selection */}
            <div>
              <Label className="mb-2 block">Select Dishes</Label>

              {/* Menu selector - always shown */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <Label htmlFor="menu" className="text-sm">
                    Select Menu
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchMenus()}
                    className="h-7 px-2 text-xs"
                    disabled={isLoadingMenus}
                  >
                    {isLoadingMenus ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <svg
                        className="h-3 w-3 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    )}
                    Refresh Menus
                  </Button>
                </div>
                <Select
                  value={selectedMenuId?.toString() || ""}
                  onValueChange={(value) => {
                    const menuId = Number(value);
                    setSelectedMenuId(menuId);
                    fetchDishesForMenu(menuId);
                  }}
                >
                  <SelectTrigger id="menu" className="w-full">
                    <SelectValue placeholder="Select a menu" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingMenus ? (
                      <div className="flex items-center justify-center py-2">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span>Loading menus...</span>
                      </div>
                    ) : menus.length > 0 ? (
                      menus.map((menu) => (
                        <SelectItem key={menu.id} value={menu.id.toString()}>
                          {menu.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="py-2 px-2 text-center text-amber-600">
                        <p>No menus available for this restaurant</p>
                        <p className="text-xs text-gray-500 mt-1 mb-2">
                          Please create a menu first in the Menus section
                        </p>
                        <Button
                          size="sm"
                          className="text-xs h-7 px-3 bg-[#4a5842] text-white hover:bg-[#4a5842]/90"
                          asChild
                        >
                          <Link href="/menus">Go to Menus</Link>
                        </Button>
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="border rounded-md p-4 bg-gray-50 h-[400px] overflow-y-auto">
                {isLoadingDishes ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin mr-3" />
                    <span>Loading dishes...</span>
                  </div>
                ) : dishes.length > 0 ? (
                  <div className="space-y-3">
                    {dishes.map((dish) => {
                      const orderItem = orderItems.find(
                        (item) => item.dishId === dish.id
                      );
                      const quantity = orderItem ? orderItem.quantity : 0;

                      return (
                        <div
                          key={dish.id}
                          className="flex justify-between items-center p-2 border-b border-gray-200 last:border-0"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{dish.name}</span>
                            <span className="text-sm text-gray-500">
                              ${parseFloat(dish.price).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {quantity > 0 ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 w-7 p-0 rounded-full"
                                  onClick={() => removeItemFromOrder(dish.id)}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                                <Input
                                  type="number"
                                  className="w-12 h-7 p-1 text-center"
                                  value={quantity}
                                  min={1}
                                  onChange={(e) =>
                                    updateItemQuantity(
                                      dish.id,
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 w-7 p-0 rounded-full"
                                  onClick={() => addItemToOrder(dish.id)}
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8"
                                onClick={() => addItemToOrder(dish.id)}
                              >
                                <Plus className="h-3.5 w-3.5 mr-1" />
                                Add
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <Utensils className="h-10 w-10 text-gray-300 mb-2" />
                    {selectedMenuId ? (
                      <>
                        <p className="text-gray-500 mb-2">
                          No dishes available in this menu
                        </p>
                        <p className="text-sm text-gray-400">
                          Please select a different menu or check that dishes
                          have been added to this menu
                        </p>
                      </>
                    ) : (
                      <p className="text-gray-500">
                        Select a menu to view available dishes
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6 pt-4 border-t">
            <div className="flex flex-col sm:flex-row-reverse gap-3 w-full">
              <Button
                type="button"
                className="bg-[#4a5842] hover:bg-[#4a5842]/90 text-white w-full sm:w-auto"
                disabled={
                  isCreatingOrder ||
                  !selectedBookingId ||
                  orderItems.length === 0
                }
                onClick={handleCreateOrder}
              >
                {isCreatingOrder ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating Order...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Create Order
                  </>
                )}
              </Button>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
              </DialogClose>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Item Status Modal */}
      <Dialog
        open={updateItemStatusModalOpen}
        onOpenChange={setUpdateItemStatusModalOpen}
      >
        <DialogContent className="bg-white text-black p-6">
          <DialogHeader>
            <DialogTitle className="text-xl">Update Item Status</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="status" className="mb-2 block">
                Select New Status
              </Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="preparing">Preparing</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="served">Served</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-gray-50 p-3 rounded-md text-sm">
              <p className="font-medium text-gray-700 mb-1">
                Update Status for {selectedItems.length} item(s)
              </p>
              <p className="text-gray-500">
                This will update the status of all selected items. If all items
                in an order have the same status, the order status will also be
                updated.
              </p>
            </div>
          </div>

          <DialogFooter className="mt-4 pt-4 border-t">
            <div className="flex flex-col sm:flex-row-reverse gap-3 w-full">
              <Button
                type="button"
                className="bg-[#4a5842] hover:bg-[#4a5842]/90 text-white w-full sm:w-auto"
                disabled={isUpdatingStatus || !selectedStatus}
                onClick={handleUpdateItemStatus}
              >
                {isUpdatingStatus ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Updating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Update Status
                  </>
                )}
              </Button>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
              </DialogClose>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
