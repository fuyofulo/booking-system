// Base API URL - can be configured based on environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000";

// User URLs
export const USER_URLS = {
  SIGN_UP: `${API_BASE_URL}/api/v1/user/signup`,
  SIGN_IN: `${API_BASE_URL}/api/v1/user/signin`,
  GET_USER: `${API_BASE_URL}/api/v1/user/me`,
};

// General URLs
export const GENERAL_URLS = {
  CHECK_EMAIL: `${API_BASE_URL}/api/v1/general/check-email`,
};

// Restaurant URLs
export const RESTAURANT_URLS = {
  CREATE: `${API_BASE_URL}/api/v1/restaurant/create`,
};

// Role URLs
export const ROLE_URLS = {
  CREATE_ROLE: `${API_BASE_URL}/api/v1/roles/create`,
  GET_ROLES: `${API_BASE_URL}/api/v1/roles/getRoles`,
  UPDATE_ROLE: `${API_BASE_URL}/api/v1/roles/update`,
  CHANGE_ROLE: `${API_BASE_URL}/api/v1/roles/change`,
};

export const RESTAURANT_USER_URLS = {
  GET_STAFF: (restaurantId: number) =>
    `${API_BASE_URL}/api/v1/restaurantUser/getAll/${restaurantId}`,
  CHANGE_ROLE: `${API_BASE_URL}/api/v1/restaurantUser/changeRole`,
  ADD_STAFF: `${API_BASE_URL}/api/v1/restaurantUser/create`,
};

// Table URLs
export const TABLE_URLS = {
  CREATE: `${API_BASE_URL}/api/v1/tables/create`,
  GET_ALL: `${API_BASE_URL}/api/v1/tables`,
  GET_BY_ID: (id: number) => `${API_BASE_URL}/api/v1/tables/${id}`,
  UPDATE: (id: number) => `${API_BASE_URL}/api/v1/tables/${id}`,
  DELETE: (id: number) => `${API_BASE_URL}/api/v1/tables/${id}`,
};

// Booking URLs
export const BOOKING_URLS = {
  CREATE: `${API_BASE_URL}/api/v1/bookings/book`,
  GET_ALL: `${API_BASE_URL}/api/v1/bookings`,
  GET_BY_ID: (id: number) => `${API_BASE_URL}/api/v1/bookings/${id}`,
  BOOKED: `${API_BASE_URL}/api/v1/bookings/booked`,
  AVAILABLE: `${API_BASE_URL}/api/v1/bookings/available`,
  GET_TIMESLOTS: `${API_BASE_URL}/api/v1/bookings/timeslots`,
  GET_BOOKINGS_BY_DATE: `${API_BASE_URL}/api/v1/bookings/by-date`,
};

// TimeSlot URLs
export const TIMESLOT_URLS = {
  UPDATE_ONE: `${API_BASE_URL}/api/v1/timeslot/update-one`,
  BATCH_UPDATE: `${API_BASE_URL}/api/v1/timeslot/batch-update`,
  GET_BY_TABLE_DATE: (tableId: number, date: string) =>
    `${API_BASE_URL}/api/v1/timeslot/table/${tableId}/date/${date}`,
};

// Menu URLs
export const MENU_URLS = {
  CREATE_MENU: `${API_BASE_URL}/api/v1/menu/create`,
  GET_MENUS: `${API_BASE_URL}/api/v1/menu/getMenus`,
  GET_DISHES: `${API_BASE_URL}/api/v1/menu/getDishes`,
  CREATE_DISH: `${API_BASE_URL}/api/v1/menu/dish/create`,
  UPDATE_MENU: `${API_BASE_URL}/api/v1/menu/update-menu`,
  UPDATE_DISH: `${API_BASE_URL}/api/v1/menu/update-dish`,
};

// Dish URLs
export const DISH_URLS = {
  CREATE: `${API_BASE_URL}/api/v1/dishes`,
  GET_ALL: `${API_BASE_URL}/api/v1/dishes`,
  GET_BY_ID: (id: number) => `${API_BASE_URL}/api/v1/dishes/${id}`,
  UPDATE: (id: number) => `${API_BASE_URL}/api/v1/dishes/${id}`,
  DELETE: (id: number) => `${API_BASE_URL}/api/v1/dishes/${id}`,
  GET_BY_MENU: (menuId: number) =>
    `${API_BASE_URL}/api/v1/dishes/menu/${menuId}`,
};

// Order URLs
export const ORDER_URLS = {
  CREATE: `${API_BASE_URL}/api/v1/orders/create`,
  GET_ALL: `${API_BASE_URL}/api/v1/orders`,
  GET_BY_ID: (id: number) => `${API_BASE_URL}/api/v1/orders/${id}`,
  UPDATE_ITEM_STATUS: `${API_BASE_URL}/api/v1/orders/update-item-status`,
  GET_BY_BOOKING: (bookingId: number) =>
    `${API_BASE_URL}/api/v1/orders/booking/${bookingId}`,
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
