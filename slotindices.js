/**
 * Time to Slot Indices Converter Utility
 *
 * This script helps convert time ranges to slot indices for the restaurant booking system.
 * Each slot represents a 30-minute period, with 48 slots in a day (0-47).
 *
 * Usage examples:
 * node slotindices.js "10:00am to 2:00pm"
 * node slotindices.js "9:30am to 11:00am"
 * node slotindices.js "6:00pm to 9:00pm"
 * node slotindices.js "10:00pm to 2:00am" (spans midnight)
 */

// Function to convert a time string (e.g., "10:00am") to a slot index (0-47)
function timeToSlotIndex(timeStr) {
  // Parse the time string
  let time = timeStr.trim().toLowerCase();
  let isPM = time.includes("pm");

  // Remove am/pm and split hours and minutes
  time = time.replace(/am|pm/g, "");
  let [hours, minutes] = time.split(":").map((part) => parseInt(part, 10));

  // Convert to 24-hour format
  if (isPM && hours !== 12) {
    hours += 12;
  } else if (!isPM && hours === 12) {
    hours = 0; // 12am is hour 0 in 24-hour time
  }

  // Calculate slot index
  // Each hour has 2 slots (0 and 30 minutes)
  let slotIndex = hours * 2;

  // Add 1 if minutes are 30
  if (minutes === 30) {
    slotIndex += 1;
  }

  return slotIndex;
}

// Function to get all slot indices between two times
function getSlotIndicesBetween(startTimeStr, endTimeStr) {
  // Get slot indices for start and end times
  const startSlotIndex = timeToSlotIndex(startTimeStr);
  const endSlotIndex = timeToSlotIndex(endTimeStr);

  // Create array of all slot indices between (inclusive)
  const slotIndices = [];

  // Handle crossing midnight
  if (endSlotIndex <= startSlotIndex) {
    // We're crossing midnight, so go from start to midnight (47)
    for (let i = startSlotIndex; i < 48; i++) {
      slotIndices.push(i);
    }
    // Then from midnight (0) to end
    for (let i = 0; i < endSlotIndex; i++) {
      slotIndices.push(i);
    }
  } else {
    // Normal case (no midnight crossing)
    for (let i = startSlotIndex; i < endSlotIndex; i++) {
      slotIndices.push(i);
    }
  }

  return slotIndices;
}

// Function to convert a slot index back to a readable time (for verification)
function slotIndexToTime(slotIndex) {
  const hour = Math.floor(slotIndex / 2);
  const minute = slotIndex % 2 === 0 ? "00" : "30";

  // Format in 12-hour with am/pm
  let displayHour = hour % 12;
  if (displayHour === 0) displayHour = 12; // 0 hour is 12 in 12-hour format
  const amPm = hour < 12 ? "am" : "pm";

  return `${displayHour}:${minute}${amPm}`;
}

// Main function to process command line input
function processTimeRange(timeRangeStr) {
  // Extract start and end times
  const [startTime, endTime] = timeRangeStr.split(" to ");

  if (!startTime || !endTime) {
    console.error('Invalid time range format. Use format: "10:00am to 2:00pm"');
    return;
  }

  // Get slot indices
  const slotIndices = getSlotIndicesBetween(startTime, endTime);

  // Print results
  console.log(`\nTime Range: ${startTime} to ${endTime}`);
  console.log(`Slot Indices: [${slotIndices.join(", ")}]`);
  console.log("\nSlot Index to Time Mapping:");
  slotIndices.forEach((index) => {
    console.log(`  ${index}: ${slotIndexToTime(index)}`);
  });

  return slotIndices;
}

// Get time range from command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  // Interactive mode with examples if no arguments
  console.log("No time range provided. Here are some example slot indices:");
  console.log("-----------------------------------------------------------");
  processTimeRange("10:00am to 12:00pm");
  console.log("-----------------------------------------------------------");
  processTimeRange("6:00pm to 8:30pm");
  console.log("-----------------------------------------------------------");
  console.log("Example across midnight:");
  processTimeRange("10:00pm to 2:00am");
  console.log("-----------------------------------------------------------");
  console.log("\nTo use this script, run:");
  console.log('node slotindices.js "10:00am to 2:00pm"');
} else {
  processTimeRange(args[0]);
}

// Export functions for potential use in other scripts
module.exports = {
  timeToSlotIndex,
  getSlotIndicesBetween,
  slotIndexToTime,
};
