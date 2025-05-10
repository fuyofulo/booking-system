"use client";

import { useState, useEffect } from "react";
import { useRestaurant } from "@/context/RestaurantContext";
import { useToast } from "@/components/ToastContext";
import { BOOKING_URLS, TABLE_URLS } from "@/lib/api-urls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
  CalendarIcon,
  Clock,
  UserRound,
  Phone,
  Search,
  CalendarRange,
  Check,
  Plus,
  Loader2,
  BookOpen,
  AlarmClock,
  CheckCircle2,
  Filter,
  SortAsc,
  BookOpenCheck,
  CalendarDays,
  X,
  BookMarked,
  CalendarCheck,
} from "lucide-react";
import {
  format,
  isToday,
  addDays,
  parseISO,
  isAfter,
  isBefore,
  startOfDay,
} from "date-fns";
import Link from "next/link";

// Time conversion utilities
const slotIndexToTime = (slotIndex: number) => {
  const hour = Math.floor(slotIndex / 2);
  const minute = slotIndex % 2 === 0 ? "00" : "30";

  let displayHour = hour % 12;
  if (displayHour === 0) displayHour = 12; // 0 hour is 12 in 12-hour format
  const amPm = hour < 12 ? "am" : "pm";

  return `${displayHour}:${minute}${amPm}`;
};

// Format slot indices to time range
const formatSlotIndices = (slotIndices: number[]) => {
  if (!slotIndices || slotIndices.length === 0) return "No time selected";

  // Sort the indices
  const sortedIndices = [...slotIndices].sort((a, b) => a - b);

  // If it's a consecutive range
  if (
    sortedIndices.length > 1 &&
    sortedIndices[sortedIndices.length - 1] - sortedIndices[0] + 1 ===
      sortedIndices.length
  ) {
    return `${slotIndexToTime(sortedIndices[0])} - ${slotIndexToTime(sortedIndices[sortedIndices.length - 1] + 1)}`;
  }

  // If it's disconnected times
  return sortedIndices.map((idx) => slotIndexToTime(idx)).join(", ");
};

// Common booking times with their slot indices
const COMMON_BOOKING_TIMES = [
  { name: "Breakfast (8:00am - 10:00am)", slots: [16, 17, 18, 19] },
  { name: "Lunch (12:00pm - 2:00pm)", slots: [24, 25, 26, 27] },
  { name: "Dinner (6:00pm - 9:00pm)", slots: [36, 37, 38, 39, 40, 41] },
  { name: "Late Dinner (8:00pm - 10:30pm)", slots: [40, 41, 42, 43, 44, 45] },
];

interface Table {
  tableId: number;
  tableName: string;
  capacity: number;
  availableSlots: number[];
}

interface Booking {
  id: number;
  tableId: number;
  tableName: string;
  capacity: number;
  date: string;
  slotIndices: number[];
  customerName: string;
  customerPhone: string | null;
  createdAt: string;
}

export default function BookingsPage() {
  const { selectedRestaurant } = useRestaurant();
  const { addToast } = useToast();

  // State for viewing bookings
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("upcoming");

  // State for creating bookings
  const [tables, setTables] = useState<Table[]>([]);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [createBookingModalOpen, setCreateBookingModalOpen] = useState(false);
  const [bookingDate, setBookingDate] = useState<Date>(new Date());
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<number[]>([]);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);

  // Fetch all bookings for the restaurant
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
      filterBookings(data.bookings || [], searchTerm, activeTab);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      addToast("Failed to fetch bookings", "error");
    } finally {
      setIsLoadingBookings(false);
    }
  };

  // Filter bookings based on active tab and search term
  const filterBookings = (
    bookingsToFilter: Booking[],
    term: string,
    tab: string
  ) => {
    // First filter by tab
    let filtered = [...bookingsToFilter];
    const today = startOfDay(new Date());

    if (tab === "upcoming") {
      filtered = filtered.filter((booking) => {
        const bookingDate = parseISO(booking.date);
        return isAfter(bookingDate, today) || isToday(bookingDate);
      });
    } else if (tab === "past") {
      filtered = filtered.filter((booking) => {
        const bookingDate = parseISO(booking.date);
        return isBefore(bookingDate, today) && !isToday(bookingDate);
      });
    } else if (tab === "today") {
      filtered = filtered.filter((booking) => {
        const bookingDate = parseISO(booking.date);
        return isToday(bookingDate);
      });
    }

    // Then filter by search term
    if (term) {
      const lowerTerm = term.toLowerCase();
      filtered = filtered.filter(
        (booking) =>
          booking.customerName.toLowerCase().includes(lowerTerm) ||
          booking.tableName.toLowerCase().includes(lowerTerm) ||
          (booking.customerPhone && booking.customerPhone.includes(lowerTerm))
      );
    }

    // Sort by date and then by table name
    filtered.sort((a, b) => {
      const dateComparison = a.date.localeCompare(b.date);
      if (dateComparison !== 0) return dateComparison;
      return a.tableName.localeCompare(b.tableName);
    });

    setFilteredBookings(filtered);
  };

  // Fetch available tables for booking on selected date
  const fetchAvailableTables = async () => {
    if (!selectedRestaurant || !bookingDate) return;

    setIsLoadingTables(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        addToast("You are not logged in", "error");
        return;
      }

      const formattedDate = format(bookingDate, "yyyy-MM-dd");
      const response = await fetch(
        `${BOOKING_URLS.AVAILABLE}?restaurantId=${selectedRestaurant.restaurant.id}&date=${formattedDate}`,
        {
          headers: {
            Authorization: token,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch available tables");
      }

      const data = await response.json();
      setTables(data.tables || []);

      // Clear any previously selected table if it's no longer available
      if (selectedTableId) {
        const tableStillAvailable = data.tables.some(
          (table: Table) => table.tableId === selectedTableId
        );
        if (!tableStillAvailable) {
          setSelectedTableId(null);
          setSelectedTimeSlots([]);
        }
      }
    } catch (error) {
      console.error("Error fetching available tables:", error);
      addToast("Failed to fetch available tables", "error");
    } finally {
      setIsLoadingTables(false);
    }
  };

  // Create a new booking
  const handleCreateBooking = async () => {
    if (
      !selectedRestaurant ||
      !selectedTableId ||
      !customerName ||
      selectedTimeSlots.length === 0
    ) {
      addToast("Please fill in all required fields", "error");
      return;
    }

    setIsCreatingBooking(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        addToast("You are not logged in", "error");
        return;
      }

      const formattedDate = format(bookingDate, "yyyy-MM-dd");
      const response = await fetch(BOOKING_URLS.CREATE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          tableId: selectedTableId,
          restaurantId: selectedRestaurant.restaurant.id,
          date: formattedDate,
          slotIndices: selectedTimeSlots,
          customerName,
          customerPhone: customerPhone || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create booking");
      }

      addToast("Booking created successfully", "success");
      setCreateBookingModalOpen(false);
      resetBookingForm();
      fetchBookings();
    } catch (error) {
      console.error("Error creating booking:", error);
      addToast(
        error instanceof Error ? error.message : "Failed to create booking",
        "error"
      );
    } finally {
      setIsCreatingBooking(false);
    }
  };

  // Reset the booking form
  const resetBookingForm = () => {
    setBookingDate(new Date());
    setSelectedTableId(null);
    setCustomerName("");
    setCustomerPhone("");
    setSelectedTimeSlots([]);
  };

  // Handle common time selection
  const handleCommonTimeSelect = (slots: number[]) => {
    const selectedTable = tables.find(
      (table) => table.tableId === selectedTableId
    );

    if (selectedTable) {
      // Filter out slots that aren't available for this table
      const availableSlots = slots.filter((slot) =>
        selectedTable.availableSlots.includes(slot)
      );

      if (availableSlots.length === 0) {
        addToast(
          "None of these times are available for the selected table",
          "error"
        );
      } else if (availableSlots.length < slots.length) {
        addToast(
          "Only some of these times are available and have been selected",
          "info"
        );
        setSelectedTimeSlots(availableSlots);
      } else {
        setSelectedTimeSlots(slots);
      }
    } else {
      addToast("Please select a table first", "error");
    }
  };

  // Check if a time slot is available for the selected table
  const isSlotAvailable = (slotIndex: number) => {
    if (!selectedTableId) return false;

    const selectedTable = tables.find(
      (table) => table.tableId === selectedTableId
    );
    return selectedTable?.availableSlots.includes(slotIndex) || false;
  };

  // Handle individual time slot selection
  const handleTimeSlotToggle = (slotIndex: number) => {
    if (!selectedTableId) {
      addToast("Please select a table first", "error");
      return;
    }

    if (!isSlotAvailable(slotIndex)) {
      addToast("This time slot is not available", "error");
      return;
    }

    setSelectedTimeSlots((prev) => {
      if (prev.includes(slotIndex)) {
        return prev.filter((index) => index !== slotIndex);
      } else {
        return [...prev, slotIndex].sort((a, b) => a - b);
      }
    });
  };

  // Effect to fetch bookings when restaurant changes
  useEffect(() => {
    if (selectedRestaurant) {
      fetchBookings();
    }
  }, [selectedRestaurant]);

  // Effect to fetch available tables when booking date changes
  useEffect(() => {
    if (createBookingModalOpen) {
      fetchAvailableTables();
    }
  }, [bookingDate, createBookingModalOpen]);

  // Effect to filter bookings when search term or active tab changes
  useEffect(() => {
    filterBookings(bookings, searchTerm, activeTab);
  }, [searchTerm, activeTab, bookings]);

  // If no restaurant is selected, show a message
  if (!selectedRestaurant) {
    return (
      <div className="p-4 space-y-4 w-full">
        <div className="px-6 py-2">
          <h1 className="text-2xl font-bold text-white">Booking Management</h1>
          <p className="text-white/80 mt-1 px-1">
            Please select a restaurant from the sidebar to manage bookings
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
                bookings
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

  // Check if current user has permission to manage slots
  const canManageSlots = selectedRestaurant.role.canManageSlots;

  return (
    <div className="p-4 space-y-4 w-full">
      {/* Header with title and add booking button */}
      <div className="px-6 py-2 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Bookings Management</h1>
          <p className="text-white/80 mt-1 px-1">
            View and manage restaurant reservations
          </p>
        </div>

        {canManageSlots && (
          <div className="mt-2 md:mt-0 w-full md:w-auto">
            <Button
              className="bg-white hover:bg-white/90 text-black py-2 px-4 w-full md:w-auto font-medium rounded-2xl"
              onClick={() => setCreateBookingModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Booking
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
                defaultValue="upcoming"
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full lg:w-auto"
              >
                <TabsList className="bg-white/10 w-full lg:w-auto">
                  <TabsTrigger
                    value="upcoming"
                    className="data-[state=active]:bg-white data-[state=active]:text-[#4a5842]"
                  >
                    Upcoming
                  </TabsTrigger>
                  <TabsTrigger
                    value="today"
                    className="data-[state=active]:bg-white data-[state=active]:text-[#4a5842]"
                  >
                    Today
                  </TabsTrigger>
                  <TabsTrigger
                    value="past"
                    className="data-[state=active]:bg-white data-[state=active]:text-[#4a5842]"
                  >
                    Past
                  </TabsTrigger>
                  <TabsTrigger
                    value="all"
                    className="data-[state=active]:bg-white data-[state=active]:text-[#4a5842]"
                  >
                    All
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/70" />
                  <Input
                    placeholder="Search bookings..."
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
              </div>
            </div>

            {/* Bookings table */}
            {isLoadingBookings ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-white" />
                <p className="text-white">Loading bookings...</p>
              </div>
            ) : filteredBookings.length > 0 ? (
              <div className="rounded-lg overflow-hidden">
                <Table className="border-collapse">
                  <TableHeader className="bg-white/10">
                    <TableRow>
                      <TableHead className="text-white font-medium">
                        Customer
                      </TableHead>
                      <TableHead className="text-white font-medium">
                        Table
                      </TableHead>
                      <TableHead className="text-white font-medium">
                        Date
                      </TableHead>
                      <TableHead className="text-white font-medium">
                        Time
                      </TableHead>
                      <TableHead className="text-white font-medium text-right">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings.map((booking) => {
                      const bookingDate = parseISO(booking.date);
                      const isPast =
                        isBefore(bookingDate, startOfDay(new Date())) &&
                        !isToday(bookingDate);
                      const isUpcoming =
                        isAfter(bookingDate, startOfDay(new Date())) ||
                        isToday(bookingDate);

                      return (
                        <TableRow
                          key={booking.id}
                          className="border-t border-white/10"
                        >
                          <TableCell className="py-4">
                            <div className="flex flex-col">
                              <span className="font-medium text-white flex items-center">
                                <UserRound className="h-4 w-4 mr-2 text-white/70" />
                                {booking.customerName}
                              </span>
                              {booking.customerPhone && (
                                <span className="text-white/70 text-sm flex items-center mt-1">
                                  <Phone className="h-3 w-3 mr-1" />
                                  {booking.customerPhone}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Badge
                                variant="outline"
                                className="bg-white/10 text-white border-white/30"
                              >
                                {booking.tableName}
                              </Badge>
                              <span className="text-white/70 text-xs ml-2">
                                ({booking.capacity}{" "}
                                {booking.capacity === 1 ? "seat" : "seats"})
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <CalendarDays className="h-4 w-4 mr-2 text-white/70" />
                              <span>
                                {format(parseISO(booking.date), "MMM d, yyyy")}
                                {isToday(parseISO(booking.date)) && (
                                  <Badge className="ml-2 bg-blue-500 text-white text-xs">
                                    Today
                                  </Badge>
                                )}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-2 text-white/70" />
                              <span>
                                {formatSlotIndices(booking.slotIndices)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {isPast ? (
                              <Badge className="bg-gray-500 text-white">
                                Completed
                              </Badge>
                            ) : (
                              <Badge className="bg-green-500 text-white">
                                Upcoming
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 bg-white/5 rounded-lg">
                <BookMarked className="h-12 w-12 text-white/30 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">
                  No bookings found
                </h3>
                <p className="text-white/70 max-w-md mx-auto mb-6">
                  {searchTerm
                    ? "No bookings match your search criteria. Try a different search term."
                    : activeTab === "upcoming"
                      ? "No upcoming bookings yet. Create a new booking to get started."
                      : activeTab === "today"
                        ? "No bookings scheduled for today."
                        : activeTab === "past"
                          ? "No past bookings found."
                          : "No bookings found. Create a new booking to get started."}
                </p>
                {canManageSlots && (
                  <Button
                    onClick={() => setCreateBookingModalOpen(true)}
                    className="bg-white hover:bg-white/90 text-[#4a5842]"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Booking
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Booking Modal */}
      <Dialog
        open={createBookingModalOpen}
        onOpenChange={setCreateBookingModalOpen}
      >
        <DialogContent className="bg-white text-black sm:max-w-[600px] md:max-w-[750px] lg:max-w-[900px] p-6 overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl">Create New Booking</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left column - Date and Customer Info */}
            <div>
              <div className="space-y-4">
                <div>
                  <Label className="mb-2 block">Select Date</Label>
                  <div className="border rounded-md overflow-hidden flex justify-center">
                    <Calendar
                      mode="single"
                      selected={bookingDate}
                      onSelect={(date) => date && setBookingDate(date)}
                      disabled={(date) => date < startOfDay(new Date())}
                      className="mx-auto"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="customerPhone">Phone Number (optional)</Label>
                  <Input
                    id="customerPhone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Enter phone number"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Right column - Table and Time Selection */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="table" className="mb-2 block">
                  Select Table
                </Label>
                <Select
                  value={selectedTableId?.toString() || ""}
                  onValueChange={(value) => {
                    setSelectedTableId(Number(value));
                    setSelectedTimeSlots([]);
                  }}
                >
                  <SelectTrigger id="table" className="w-full">
                    <SelectValue placeholder="Select a table" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingTables ? (
                      <div className="flex items-center justify-center py-2">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span>Loading tables...</span>
                      </div>
                    ) : tables.length > 0 ? (
                      tables.map((table) => (
                        <SelectItem
                          key={table.tableId}
                          value={table.tableId.toString()}
                        >
                          {table.tableName} ({table.capacity}{" "}
                          {table.capacity === 1 ? "seat" : "seats"}) -{" "}
                          {table.availableSlots.length} available slots
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-center text-sm text-gray-500">
                        No available tables for this date
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-2 block">Available Time Slots</Label>

                {selectedTableId ? (
                  <div className="border rounded-md p-4 bg-gray-50 min-h-[300px]">
                    {isLoadingTables ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin mr-3" />
                        <span>Loading available slots...</span>
                      </div>
                    ) : (
                      <>
                        {/* Individual time slots */}
                        <div>
                          <p className="text-sm font-medium mb-2">
                            Available Time Slots:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {tables
                              .find((t) => t.tableId === selectedTableId)
                              ?.availableSlots.map((slotIndex) => (
                                <Button
                                  key={slotIndex}
                                  variant={
                                    selectedTimeSlots.includes(slotIndex)
                                      ? "default"
                                      : "outline"
                                  }
                                  size="sm"
                                  className={
                                    selectedTimeSlots.includes(slotIndex)
                                      ? "bg-[#4a5842] hover:bg-[#4a5842]/90"
                                      : "border-gray-200 hover:bg-gray-50"
                                  }
                                  onClick={() =>
                                    handleTimeSlotToggle(slotIndex)
                                  }
                                >
                                  {slotIndexToTime(slotIndex)}
                                </Button>
                              ))}

                            {tables.find((t) => t.tableId === selectedTableId)
                              ?.availableSlots.length === 0 && (
                              <p className="text-sm text-gray-500">
                                No available time slots for this date and table.
                              </p>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="border rounded-md p-4 bg-gray-50 flex items-center justify-center min-h-[300px]">
                    <p className="text-gray-500">
                      Please select a date and table to view available slots
                    </p>
                  </div>
                )}
              </div>

              {selectedTimeSlots.length > 0 && (
                <div className="p-3 bg-[#4a5842]/10 rounded-md border border-[#4a5842]/20">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-[#4a5842]">
                      Selected time:
                    </span>
                    <span className="text-[#4a5842]">
                      {formatSlotIndices(selectedTimeSlots)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6 pt-4 border-t">
            <div className="flex flex-col sm:flex-row-reverse gap-3 w-full">
              <Button
                type="button"
                className="bg-[#4a5842] hover:bg-[#4a5842]/90 text-white w-full sm:w-auto"
                disabled={
                  isCreatingBooking ||
                  !selectedTableId ||
                  !customerName ||
                  selectedTimeSlots.length === 0
                }
                onClick={handleCreateBooking}
              >
                {isCreatingBooking ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating Booking...
                  </>
                ) : (
                  <>
                    <CalendarCheck className="h-4 w-4 mr-2" />
                    Create Booking
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
