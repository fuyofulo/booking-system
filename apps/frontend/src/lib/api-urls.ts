// Base API URL - can be configured based on environment
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:7000/api/v1";

// User URLs
export const USER_URLS = {
  SIGN_UP: `${API_BASE_URL}/user/signup`,
  SIGN_IN: `${API_BASE_URL}/user/signin`,
  GET_USER: `${API_BASE_URL}/user/me`,
};

// General URLs
export const GENERAL_URLS = {
  CHECK_EMAIL: `${API_BASE_URL}/general/check-email`,
};

// Restaurant URLs
export const RESTAURANT_URLS = {
  CREATE: `${API_BASE_URL}/restaurant/create`,
};

// Role URLs
export const ROLE_URLS = {
  CREATE_ROLE: `${API_BASE_URL}/roles/create`,
  GET_ROLES: `${API_BASE_URL}/roles/getRoles`,
  UPDATE_ROLE: `${API_BASE_URL}/roles/update`,
  CHANGE_ROLE: `${API_BASE_URL}/roles/change`,
};

export const RESTAURANT_USER_URLS = {
  GET_STAFF: (restaurantId: number) =>
    `${API_BASE_URL}/restaurantUser/getAll/${restaurantId}`,
  CHANGE_ROLE: `${API_BASE_URL}/restaurantUser/changeRole`,
  ADD_STAFF: `${API_BASE_URL}/restaurantUser/create`,
};

// Table URLs
export const TABLE_URLS = {
  CREATE: `${API_BASE_URL}/tables/create`,
  GET_ALL: `${API_BASE_URL}/tables`,
  GET_BY_ID: (id: number) => `${API_BASE_URL}/tables/${id}`,
  UPDATE: (id: number) => `${API_BASE_URL}/tables/${id}`,
  DELETE: (id: number) => `${API_BASE_URL}/tables/${id}`,
};

// Booking URLs
export const BOOKING_URLS = {
  CREATE: `${API_BASE_URL}/bookings/book`,
  GET_ALL: `${API_BASE_URL}/bookings`,
  GET_BY_ID: (id: number) => `${API_BASE_URL}/bookings/${id}`,
  BOOKED: `${API_BASE_URL}/bookings/booked`,
  AVAILABLE: `${API_BASE_URL}/bookings/available`,
  GET_TIMESLOTS: `${API_BASE_URL}/bookings/timeslots`,
};

// TimeSlot URLs
export const TIMESLOT_URLS = {
  UPDATE_ONE: `${API_BASE_URL}/timeslot/update-one`,
  BATCH_UPDATE: `${API_BASE_URL}/timeslot/batch-update`,
  GET_BY_TABLE_DATE: (tableId: number, date: string) =>
    `${API_BASE_URL}/timeslot/table/${tableId}/date/${date}`,
};

// Menu URLs
export const MENU_URLS = {
  CREATE_MENU: `${API_BASE_URL}/menu/create`,
  GET_MENUS: `${API_BASE_URL}/menu/getMenus`,
  GET_DISHES: `${API_BASE_URL}/menu/getDishes`,
  CREATE_DISH: `${API_BASE_URL}/menu/dish/create`,
  UPDATE_MENU: `${API_BASE_URL}/menu/update-menu`,
  UPDATE_DISH: `${API_BASE_URL}/menu/update-dish`,
};

// Dish URLs
export const DISH_URLS = {
  CREATE: `${API_BASE_URL}/dishes`,
  GET_ALL: `${API_BASE_URL}/dishes`,
  GET_BY_ID: (id: number) => `${API_BASE_URL}/dishes/${id}`,
  UPDATE: (id: number) => `${API_BASE_URL}/dishes/${id}`,
  DELETE: (id: number) => `${API_BASE_URL}/dishes/${id}`,
  GET_BY_MENU: (menuId: number) => `${API_BASE_URL}/dishes/menu/${menuId}`,
};

// Order URLs
export const ORDER_URLS = {
  CREATE: `${API_BASE_URL}/orders`,
  GET_ALL: `${API_BASE_URL}/orders`,
  GET_BY_ID: (id: number) => `${API_BASE_URL}/orders/${id}`,
  UPDATE_ITEM_STATUS: `${API_BASE_URL}/orders/items/status`,
  GET_BY_TABLE: (tableId: number) => `${API_BASE_URL}/orders/table/${tableId}`,
  GET_BY_BOOKING: (bookingId: number) =>
    `${API_BASE_URL}/orders/booking/${bookingId}`,
};

// Export a combined object with all URLs for easy imports
export const API_URLS = {
  USER: USER_URLS,
  GENERAL: GENERAL_URLS,
  RESTAURANT: RESTAURANT_URLS,
  ROLE: ROLE_URLS,
  TABLE: TABLE_URLS,
  BOOKING: BOOKING_URLS,
  TIMESLOT: TIMESLOT_URLS,
  MENU: MENU_URLS,
  DISH: DISH_URLS,
  ORDER: ORDER_URLS,
};
