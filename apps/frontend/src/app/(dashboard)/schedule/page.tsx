"use client";

import { useState, useEffect } from "react";
import { useRestaurant } from "@/context/RestaurantContext";
import { useToast } from "@/components/ToastContext";
import { TIMESLOT_URLS, TABLE_URLS, BOOKING_URLS } from "@/lib/api-urls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval
} from "date-fns";
import { Clock, Loader2, Save, Info } from "lucide-react";

// Time slot utilities
const slotIndexToTime = (slotIndex: number) => {
  const hour = Math.floor(slotIndex / 2);
  const minute = slotIndex % 2 === 0 ? "00" : "30";

  let displayHour = hour % 12;
  if (displayHour === 0) displayHour = 12; // 0 hour is 12 in 12-hour format
  const amPm = hour < 12 ? "am" : "pm";

  return `${displayHour}:${minute}${amPm}`;
};

const COMMON_HOURS = [
  { name: "Breakfast (8:00am - 10:00am)", slots: [16, 17, 18, 19] },
  { name: "Lunch (12:00pm - 2:00pm)", slots: [24, 25, 26, 27] },
  { name: "Dinner (6:00pm - 9:00pm)", slots: [36, 37, 38, 39, 40, 41] },
  { name: "Late Dinner (8:00pm - 10:30pm)", slots: [40, 41, 42, 43, 44, 45] },
];

// Days of week for multi-day selection
const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

interface Table {
  id: number;
  name: string;
  capacity: number;
  restaurantId: number;
}

// Enhanced structure to track both open and booked slots
interface DaySchedule {
  openSlots: number[];
  bookedSlots: {
    slotIndex: number;
    tableName: string;
    customerName: string;
  }[];
}

export default function SchedulePage() {
  const { selectedRestaurant } = useRestaurant();
  const { addToast } = useToast();

  const [tables, setTables] = useState<Table[]>([]);
  const [isLoadingTables, setIsLoadingTables] = useState(false);

  const [selectedTimeSlots, setSelectedTimeSlots] = useState<number[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [tabValue, setTabValue] = useState<string>("view");
  const [isOpen, setIsOpen] = useState<boolean>(true);

  // For displaying weekly schedule
  const [weeklySchedule, setWeeklySchedule] = useState<{
    [key: string]: DaySchedule;
  }>({});
  const [currentWeekDates, setCurrentWeekDates] = useState<Date[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);

  // For batch updates
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedDateMode, setSelectedDateMode] = useState<"single" | "range">(
    "single"
  );

  // Fetch all tables for the restaurant
  const fetchTables = async () => {
    if (!selectedRestaurant) return;

    setIsLoadingTables(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        addToast("You are not logged in", "error");
        return;
      }

      const response = await fetch(
        `${TABLE_URLS.GET_ALL}?restaurantId=${selectedRestaurant.restaurant.id}`,
        {
          headers: { Authorization: token },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch tables");
      }

      const data = await response.json();
      setTables(data.tables || []);
    } catch (error) {
      console.error("Error fetching tables:", error);
      addToast("Failed to fetch tables", "error");
    } finally {
      setIsLoadingTables(false);
    }
  };

  // Fetch schedule for the current week
  const fetchWeeklySchedule = async () => {
    if (!selectedRestaurant || !tables.length) return;

    setIsLoadingSchedule(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        addToast("You are not logged in", "error");
        return;
      }

      const startOfCurrentWeek = startOfWeek(new Date(), { weekStartsOn: 0 });
      const endOfCurrentWeek = endOfWeek(new Date(), { weekStartsOn: 0 });

      const datesOfWeek = eachDayOfInterval({
        start: startOfCurrentWeek,
        end: endOfCurrentWeek,
      });

      setCurrentWeekDates(datesOfWeek);

      const weeklyData: { [key: string]: DaySchedule } = {};

      // Initialize all days with empty arrays
      datesOfWeek.forEach((date) => {
        const dayName = DAYS_OF_WEEK[date.getDay()].label;
        weeklyData[dayName] = {
          openSlots: [],
          bookedSlots: [],
        };
      });

      // First, fetch all booked slots for the entire week at once
      const allBookedSlotsPromise = fetch(
        `${BOOKING_URLS.BOOKED}?restaurantId=${selectedRestaurant.restaurant.id}`,
        {
          headers: { Authorization: token },
        }
      ).then((response) => {
        if (!response.ok) {
          console.error("Failed to fetch booked slots");
          return null;
        }
        return response.json();
      });

      // Batch our requests for available slots to 3 days at a time to reduce API calls
      const batchSize = 3;
      const availableSlotsPromises = [];

      for (let i = 0; i < datesOfWeek.length; i += batchSize) {
        const dateBatch = datesOfWeek.slice(i, i + batchSize);

        // Process each date in the batch concurrently
        const batchPromises = dateBatch.map(async (date) => {
          const formattedDate = format(date, "yyyy-MM-dd");
          const dayName = DAYS_OF_WEEK[date.getDay()].label;

          try {
            const response = await fetch(
              `${BOOKING_URLS.GET_TIMESLOTS}?restaurantId=${selectedRestaurant.restaurant.id}&date=${formattedDate}`,
              {
                headers: { Authorization: token },
              }
            );

            if (!response.ok) {
              console.error(`Failed to fetch time slots for ${formattedDate}`);
              return;
            }

            const data = await response.json();

            // The response format is { tables: [{ tableId, tableName, capacity, timeSlots: [...] }] }
            // We need to extract all open slots across all tables
            if (data && data.tables && Array.isArray(data.tables)) {
              // Get all unique open slot indices across all tables
              const openSlotIndices = new Set<number>();

              data.tables.forEach((table: any) => {
                if (table.timeSlots && Array.isArray(table.timeSlots)) {
                  table.timeSlots
                    .filter((slot: any) => slot.isOpen === true)
                    .forEach((slot: any) => {
                      openSlotIndices.add(slot.slotIndex);
                    });
                }
              });

              // Convert to array and sort
              weeklyData[dayName].openSlots = Array.from(openSlotIndices).sort(
                (a, b) => a - b
              );

              // Log for debugging
              console.log(
                `${dayName} has ${weeklyData[dayName].openSlots.length} open slots`
              );
            }
          } catch (error) {
            console.error(`Error fetching slots for ${formattedDate}:`, error);
          }
        });

        availableSlotsPromises.push(Promise.all(batchPromises));
      }

      // Wait for all available slots fetches to complete
      await Promise.all(availableSlotsPromises);

      // Now handle the booked slots
      const bookedSlotsResponse = await allBookedSlotsPromise;

      if (bookedSlotsResponse && bookedSlotsResponse.bookings) {
        const bookings = bookedSlotsResponse.bookings;

        // Group bookings by date
        bookings.forEach((booking: any) => {
          // Convert booking date to JS Date to get day of week
          const bookingDate = new Date(booking.date);
          const dayOfWeek = bookingDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
          const dayName = DAYS_OF_WEEK[dayOfWeek].label;

          // Check if this booking is for the current week
          if (weeklyData[dayName]) {
            // Add each booked slot
            booking.slotIndices.forEach((slotIndex: number) => {
              weeklyData[dayName].bookedSlots.push({
                slotIndex,
                tableName: booking.tableName,
                customerName: booking.customerName,
              });
            });
          }
        });

        // Log booked slots for debugging
        Object.keys(weeklyData).forEach((day) => {
          console.log(
            `${day} has ${weeklyData[day].bookedSlots.length} booked slots`
          );
        });
      }

      setWeeklySchedule(weeklyData);
    } catch (error) {
      console.error("Error fetching weekly schedule:", error);
      addToast("Failed to fetch weekly schedule", "error");
    } finally {
      setIsLoadingSchedule(false);
    }
  };

  // Update time slots for selected dates using batch update
  const updateTimeSlots = async () => {
    if (
      !selectedRestaurant ||
      !tables.length ||
      selectedTimeSlots.length === 0
    ) {
      addToast("Please select time slots", "error");
      return;
    }

    setIsUpdating(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        addToast("You are not logged in", "error");
        return;
      }

      // Prepare dates array
      let selectedDates: string[] = [];

      if (selectedDateMode === "single") {
        // Single date mode
        selectedDates = [format(startDate, "yyyy-MM-dd")];
      } else if (selectedDateMode === "range" && endDate) {
        // Date range mode - include all dates in the range
        const dateRange = eachDayOfInterval({
          start: startDate,
          end: endDate,
        });

        // Include all dates in the range
        selectedDates = dateRange.map((date) => format(date, "yyyy-MM-dd"));
      }

      if (selectedDates.length === 0) {
        addToast("No dates selected", "error");
        setIsUpdating(false);
        return;
      }

      // Get all table IDs
      const tableIds = tables.map((table) => table.id);

      // Make the batch update request
      const response = await fetch(TIMESLOT_URLS.BATCH_UPDATE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          tableIds,
          dates: selectedDates,
          slotIndices: selectedTimeSlots,
          isOpen,
          restaurantId: selectedRestaurant.restaurant.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update time slots");
      }

      const data = await response.json();
      addToast(
        `Successfully updated ${data.stats.totalSlotsUpdated} time slots`,
        "success"
      );

      // Switch to view tab
      setTabValue("view");

      // Refresh the weekly schedule immediately
      fetchWeeklySchedule();

      // Additional message to inform user
      setTimeout(() => {
        addToast(
          "The schedule view will update to reflect your changes",
          "info"
        );
      }, 1000);
    } catch (error) {
      console.error("Error updating time slots:", error);
      addToast("Failed to update time slots", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  // Initial data fetching
  useEffect(() => {
    if (selectedRestaurant) {
      fetchTables();
    }
  }, [selectedRestaurant]);

  // Fetch weekly schedule once tables are loaded
  useEffect(() => {
    if (tables.length > 0) {
      fetchWeeklySchedule();
    }
  }, [tables]);

  // Handle common hour selection
  const handleCommonHourSelect = (slots: number[]) => {
    setSelectedTimeSlots(slots);
  };

  // Handle individual time slot selection
  const handleTimeSlotToggle = (slotIndex: number) => {
    setSelectedTimeSlots((prev) => {
      if (prev.includes(slotIndex)) {
        return prev.filter((index) => index !== slotIndex);
      } else {
        return [...prev, slotIndex].sort((a, b) => a - b);
      }
    });
  };

  // If no restaurant is selected, show a message
  if (!selectedRestaurant) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Restaurant Hours</h1>
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6">
            <p className="mb-4">
              Please select a restaurant from the sidebar to manage its
              operating hours.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user has permission to manage slots
  const canManageSlots = selectedRestaurant.role.canManageSlots;

  return (
    <div className="p-4 space-y-4 w-full">
      <div className="px-6 py-2 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Restaurant Hours</h1>
          <p className="text-white/80 mt-1 px-1">
            Set your restaurant's operating hours across all tables
          </p>
        </div>
      </div>

      <Tabs
        defaultValue="view"
        value={tabValue}
        onValueChange={setTabValue}
        className="px-6"
      >
        <TabsList className="bg-[#4a5842] text-white">
          <TabsTrigger
            value="view"
            className="data-[state=active]:bg-white data-[state=active]:text-[#4a5842]"
          >
            View Hours
          </TabsTrigger>
          {canManageSlots && (
            <TabsTrigger
              value="edit"
              className="data-[state=active]:bg-white data-[state=active]:text-[#4a5842]"
            >
              Edit Hours
            </TabsTrigger>
          )}
        </TabsList>

        {/* View hours tab */}
        <TabsContent value="view" className="mt-4">
          <Card className="rounded-3xl bg-[#4a5842] text-white">
            <CardContent className="p-6">
              <div className="bg-white p-4 rounded-xl text-black">
                <h3 className="font-medium mb-4 flex items-center text-xl">
                  <Clock className="h-5 w-5 mr-2" />
                  Restaurant Operating Hours
                </h3>

                {isLoadingSchedule || isLoadingTables ? (
                  <div className="flex items-center justify-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-[#4a5842]" />
                  </div>
                ) : (
                  <div className="space-y-6 mt-4">
                    {DAYS_OF_WEEK.map((day) => (
                      <div key={day.value} className="border rounded-md p-4">
                        <h4 className="font-medium text-lg mb-3 flex items-center justify-between">
                          <div>
                            {day.label}{" "}
                            {currentWeekDates[day.value] && (
                              <span className="text-sm font-normal text-gray-500">
                                (
                                {format(
                                  currentWeekDates[day.value],
                                  "MMM d, yyyy"
                                )}
                                )
                              </span>
                            )}
                            {weeklySchedule[day.label] &&
                              weeklySchedule[day.label].openSlots.length >
                                0 && (
                                <span className="text-sm font-normal text-green-600 ml-2">
                                  ({weeklySchedule[day.label].openSlots.length}{" "}
                                  open slots)
                                </span>
                              )}
                            {weeklySchedule[day.label] &&
                              weeklySchedule[day.label].bookedSlots.length >
                                0 && (
                                <span className="text-sm font-normal text-blue-600 ml-2">
                                  (
                                  {weeklySchedule[day.label].bookedSlots.length}{" "}
                                  booked slots)
                                </span>
                              )}
                          </div>

                          {/* Debug button, only visible in development */}
                          {process.env.NODE_ENV === "development" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                console.log(
                                  `Debug: ${day.label} slots:`,
                                  weeklySchedule[day.label].openSlots
                                );
                                console.log(
                                  `Debug: ${day.label} booked:`,
                                  weeklySchedule[day.label].bookedSlots
                                );

                                // If date exists, try a debug fetch
                                if (currentWeekDates[day.value]) {
                                  const formattedDate = format(
                                    currentWeekDates[day.value],
                                    "yyyy-MM-dd"
                                  );
                                  console.log(
                                    `Attempting debug fetch for ${formattedDate}`
                                  );

                                  // Print URL being fetched
                                  const url = `${BOOKING_URLS.GET_TIMESLOTS}?restaurantId=${selectedRestaurant.restaurant.id}&date=${formattedDate}`;
                                  console.log("Debug URL:", url);

                                  // Show a toast for the user
                                  addToast(
                                    `Debug info logged for ${day.label}`,
                                    "info"
                                  );
                                }
                              }}
                              className="text-xs"
                            >
                              Debug
                            </Button>
                          )}
                        </h4>

                        {/* No slots at all */}
                        {(!weeklySchedule[day.label] ||
                          (weeklySchedule[day.label].openSlots.length === 0 &&
                            weeklySchedule[day.label].bookedSlots.length ===
                              0)) && (
                          <p className="text-gray-500 italic">
                            Closed or no available slots
                          </p>
                        )}

                        {/* Available slots section */}
                        {weeklySchedule[day.label] &&
                          weeklySchedule[day.label].openSlots.length > 0 && (
                            <div className="mb-4">
                              <p className="text-sm font-medium text-green-700 mb-2">
                                Available Slots:
                              </p>
                              <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                                {weeklySchedule[day.label].openSlots
                                  .sort((a, b) => a - b)
                                  .map((slotIndex) => (
                                    <div
                                      key={`open-${slotIndex}`}
                                      className="text-xs px-1 py-1.5 rounded text-center bg-green-100 text-green-800"
                                      title="Open"
                                    >
                                      {slotIndexToTime(slotIndex)}
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}

                        {/* Booked slots section */}
                        {weeklySchedule[day.label] &&
                          weeklySchedule[day.label].bookedSlots.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-blue-700 mb-2">
                                Booked Slots:
                              </p>
                              <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                                {weeklySchedule[day.label].bookedSlots
                                  .sort((a, b) => a.slotIndex - b.slotIndex)
                                  .map((booking, idx) => (
                                    <div
                                      key={`booked-${booking.slotIndex}-${idx}`}
                                      className="text-xs px-1 py-1.5 rounded text-center bg-blue-100 text-blue-800"
                                      title={`Table: ${booking.tableName} | Customer: ${booking.customerName}`}
                                    >
                                      {slotIndexToTime(booking.slotIndex)}
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Edit hours tab */}
        {canManageSlots && (
          <TabsContent value="edit" className="mt-4">
            <Card className="rounded-3xl bg-[#4a5842] text-white">
              <CardContent className="p-6">
                <div className="bg-white p-4 rounded-xl mb-4 text-black">
                  <div className="flex items-center">
                    <Info className="h-5 w-5 mr-2 text-blue-600" />
                    <h3 className="font-medium">Operating Hours Setup</h3>
                  </div>
                  <p className="mt-1 text-sm">
                    Changes made here will apply to all tables ({tables.length}{" "}
                    tables total). You can set time slots as open or closed
                    across multiple dates.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left sidebar with date selection */}
                  <div>
                    <Card className="bg-white text-black rounded-xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                          Date Selection
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant={
                                selectedDateMode === "single"
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              onClick={() => setSelectedDateMode("single")}
                              className={
                                selectedDateMode === "single"
                                  ? "bg-[#4a5842]"
                                  : ""
                              }
                            >
                              Single Date
                            </Button>
                            <Button
                              variant={
                                selectedDateMode === "range"
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              onClick={() => setSelectedDateMode("range")}
                              className={
                                selectedDateMode === "range"
                                  ? "bg-[#4a5842]"
                                  : ""
                              }
                            >
                              Date Range
                            </Button>
                          </div>

                          <div className="border rounded-md overflow-hidden">
                            {selectedDateMode === "single" ? (
                              <Calendar
                                mode="single"
                                selected={startDate}
                                onSelect={(value: Date | undefined) => {
                                  if (value) setStartDate(value);
                                }}
                                className="mx-auto"
                              />
                            ) : (
                              <Calendar
                                mode="range"
                                selected={{
                                  from: startDate,
                                  to: endDate || undefined,
                                }}
                                onSelect={(range) => {
                                  if (range?.from) {
                                    setStartDate(range.from);
                                    setEndDate(range.to || null);
                                  }
                                }}
                                className="mx-auto"
                              />
                            )}
                          </div>

                          {/* Date selection summary */}
                          <div className="mt-4 text-sm p-2 bg-[#4a5842]/10 rounded-md">
                            <p className="font-medium mb-1">
                              Selected dates for changes:
                            </p>
                            {selectedDateMode === "single" ? (
                              <p>{format(startDate, "MMMM d, yyyy")}</p>
                            ) : (
                              <div>
                                {endDate ? (
                                  <>
                                    <p>
                                      From: {format(startDate, "MMMM d, yyyy")}
                                    </p>
                                    <p>To: {format(endDate, "MMMM d, yyyy")}</p>
                                    <p className="mt-1 text-xs">
                                      {
                                        eachDayOfInterval({
                                          start: startDate,
                                          end: endDate,
                                        }).length
                                      }{" "}
                                      days selected
                                    </p>
                                  </>
                                ) : (
                                  <p className="italic text-gray-500">
                                    Please select an end date to complete the
                                    range
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Time slot selection */}
                  <div className="md:col-span-2">
                    <Card className="bg-white text-black rounded-xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">
                          Select Operating Hours
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between mb-4">
                          <Label htmlFor="slot-status">
                            Set selected slots as:
                          </Label>
                          <div className="flex items-center space-x-2">
                            <span
                              className={
                                isOpen ? "text-gray-400" : "font-medium"
                              }
                            >
                              Closed
                            </span>
                            <Switch
                              id="slot-status"
                              checked={isOpen}
                              onCheckedChange={setIsOpen}
                            />
                            <span
                              className={
                                isOpen ? "font-medium" : "text-gray-400"
                              }
                            >
                              Open
                            </span>
                          </div>
                        </div>

                        <div className="mb-4 space-y-2">
                          <Label>Common Hours:</Label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {COMMON_HOURS.map((hour) => (
                              <Button
                                key={hour.name}
                                variant="outline"
                                className={
                                  hour.slots.every((slot) =>
                                    selectedTimeSlots.includes(slot)
                                  )
                                    ? "border-[#4a5842] bg-[#4a5842]/10"
                                    : ""
                                }
                                onClick={() =>
                                  handleCommonHourSelect(hour.slots)
                                }
                              >
                                {hour.name}
                              </Button>
                            ))}
                          </div>
                        </div>

                        <Separator className="my-4" />

                        <div className="space-y-4">
                          <Label>Individual Time Slots:</Label>
                          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                            {Array.from({ length: 48 }).map((_, index) => (
                              <div
                                key={index}
                                className={`rounded border p-1 text-center text-xs cursor-pointer transition-colors ${
                                  selectedTimeSlots.includes(index)
                                    ? "bg-[#4a5842] text-white"
                                    : "hover:bg-gray-100"
                                }`}
                                onClick={() => handleTimeSlotToggle(index)}
                              >
                                {slotIndexToTime(index)}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                          <Button
                            variant="default"
                            className="bg-[#4a5842] text-white hover:bg-[#4a5842]/90"
                            disabled={
                              isUpdating ||
                              selectedTimeSlots.length === 0 ||
                              (selectedDateMode === "range" && !endDate)
                            }
                            onClick={updateTimeSlots}
                          >
                            {isUpdating ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Updating...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4 mr-2" />
                                Save Hours{" "}
                                <span className="ml-1 text-xs">
                                  (
                                  {selectedDateMode === "single"
                                    ? "1 day"
                                    : endDate
                                      ? `${eachDayOfInterval({ start: startDate, end: endDate }).length} days`
                                      : ""}
                                  )
                                </span>
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
