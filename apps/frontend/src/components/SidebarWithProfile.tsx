"use client";
import {
  LayoutDashboard,
  Settings,
  Users,
  FileText,
  Mail,
  MessageSquare,
  CalendarDays,
  HelpCircle,
  MoreVertical,
  User,
  Phone,
  Calendar,
  Book,
  Receipt,
  Store,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { USER_URLS } from "@/lib/api-urls";
import { useToast } from "@/components/ToastContext";
import { useRestaurant } from "@/context/RestaurantContext";

// Types
interface Restaurant {
  id: number;
  name: string;
  ownerId: string;
}

interface Role {
  id: number;
  name: string;
  canCreateRoles: boolean;
  canManageSlots: boolean;
  canManageStaff: boolean;
  canManageMenu: boolean;
  canManageOrders: boolean;
  canManageTables: boolean;
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

// Navigation items
const navigationItems = [
  {
    title: "Profile",
    icon: User,
    url: "/profile",
  },
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    url: "/dashboard",
  },
  {
    title: "AI Intelligent Assistant",
    icon: MessageSquare,
    url: "/assistant",
  },
  {
    title: "AI Voice Agent",
    icon: Phone,
    url: "/voice-agent",
  },
  {
    title: "Schedule",
    icon: Calendar,
    url: "/schedule",
  },
  {
    title: "Tables",
    icon: CalendarDays,
    url: "/tables",
  },
  {
    title: "Staff",
    icon: Users,
    url: "/staff",
  },
  {
    title: "Roles",
    icon: Users,
    url: "/roles",
  },
  {
    title: "Menus",
    icon: FileText,
    url: "/menus",
  },
  {
    title: "Bookings",
    icon: Book,
    url: "/bookings",
  },
  {
    title: "Orders",
    icon: Receipt,
    url: "/orders",
  },
];

interface SidebarWithProfileProps {
  children: React.ReactNode;
}

export default function SidebarWithProfile({
  children,
}: SidebarWithProfileProps) {
  const pathname = usePathname();
  const { addToast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const {
    selectedRestaurantId,
    setSelectedRestaurantId,
    userRestaurants,
    setUserRestaurants,
    selectedRestaurant,
  } = useRestaurant();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
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

        const data = await response.json();
        setUser(data.user);

        // Set restaurants in the context
        setUserRestaurants(data.user.restaurants);

        // Set first restaurant as default if available and none is selected
        if (data.user.restaurants.length > 0 && !selectedRestaurantId) {
          setSelectedRestaurantId(
            String(data.user.restaurants[0].restaurant.id)
          );
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        addToast("Failed to load user data", "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [
    addToast,
    setUserRestaurants,
    setSelectedRestaurantId,
    selectedRestaurantId,
  ]);

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (!user?.name) return "U";
    return user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <section className="flex min-h-screen w-full flex-col">
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" asChild>
                  <div className="flex w-full items-center">
                    <Avatar className="mr-2 h-8 w-8">
                      <AvatarImage
                        src="/placeholder-user.jpg"
                        alt={user?.name || "User"}
                      />
                      <AvatarFallback>{getUserInitials()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-1 flex-col gap-0.5 text-left leading-none">
                      <span className="font-medium">
                        {isLoading ? "Loading..." : user?.name || "User"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {user?.email || ""}
                      </span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="ml-auto h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Toggle user menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Profile</DropdownMenuItem>
                        <DropdownMenuItem>Billing</DropdownMenuItem>
                        <DropdownMenuItem>Team</DropdownMenuItem>
                        <DropdownMenuItem>Subscription</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Log out</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Restaurant Selector */}
              {userRestaurants.length > 0 && (
                <SidebarMenuItem>
                  <div className="px-0 py-2">
                    <div className="mb-1">
                      <span className="text-xs text-white">Restaurant</span>
                    </div>
                    <Select
                      value={selectedRestaurantId || ""}
                      onValueChange={setSelectedRestaurantId}
                    >
                      <SelectTrigger className="w-full bg-white text-black border-0">
                        <div className="flex items-center h-9">
                          <Store className="h-4 w-4 mr-2" />
                          <SelectValue placeholder="Select restaurant" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {userRestaurants.map((userRest) => (
                          <SelectItem
                            key={userRest.restaurant.id}
                            value={String(userRest.restaurant.id)}
                          >
                            <div className="flex items-start flex-col h-8 mt-1 mb-1">
                              <span className="font-semibold text-sm">
                                {userRest.restaurant.name}
                              </span>
                              <span className="text-xs text-muted-foreground font-semibold -mt-1">
                                {userRest.role.name}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarHeader>
          <SidebarContent className="px-2">
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      {item.icon && <item.icon className="h-4 w-4" />}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarRail />
        </Sidebar>
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">Home</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    {pathname === "/"
                      ? "Dashboard"
                      : pathname.split("/")[1].charAt(0).toUpperCase() +
                        pathname.split("/")[1].slice(1)}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4">
            <div className="grid auto-rows-min gap-4 md:grid-cols-3"></div>
            <div className="min-h-[60vh] flex-1 rounded-xl md:min-h-min bg-[#4a5842]">
              {children}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </section>
  );
}
