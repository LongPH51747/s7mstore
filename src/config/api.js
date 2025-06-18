// API Base URL
export const API_BASE_URL = 'https://480b-2405-4802-492-4fb0-8dad-c240-2e60-f214.ngrok-free.app/api';

// API Endpoints
export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN_GOOGLE: `${API_BASE_URL}/auth/login-google`,
    LOGIN_EMAIL: `${API_BASE_URL}/auth/login-email`,
    LOGIN_USERNAME: `${API_BASE_URL}/auth/login-username`,
    REGISTER: `${API_BASE_URL}/auth/register`,
  },
  
  // Product endpoints
  PRODUCTS: {
    GET_ALL: `${API_BASE_URL}/products/get-all-products`,
    GET_ALL_LIMIT: `${API_BASE_URL}/products/get-all-products-limit`,
    GET_BY_ID: (id) => `${API_BASE_URL}/products/get-product/${id}`,
    GET_BY_CATEGORY: (category) => `${API_BASE_URL}/products/get-products-by-category/${category}`,
    SEARCH: `${API_BASE_URL}/products/search-product`,
  },
  
  // Category endpoints
  CATEGORIES: {
    GET_ALL: `${API_BASE_URL}/categories/get-all-categories`,
    GET_BY_ID: (id) => `${API_BASE_URL}/categories/get-category/${id}`,
  },
  
  // Cart endpoints
  CART: {
    GET_BY_USER_ID: `${API_BASE_URL}/cart/getByUserId`,
    ADD_TO_CART: `${API_BASE_URL}/cart/addToCart`,
    UPDATE_QUANTITY: (id) => `${API_BASE_URL}/cart/updateQuantity/cartItemId/${id}`,
    DELETE_CART_ITEM: (id) => `${API_BASE_URL}/cart/deleteCartItem/${id}`,
  },
  
  // Order endpoints
  ORDERS: {
    GET_BY_USER_ID: `${API_BASE_URL}/order/getByUserId`,
    GET_ORDER_DETAIL: `${API_BASE_URL}/order/getOrderDetail`,
  },
  
  // Banner endpoints
  BANNERS: {
    GET_ALL: `${API_BASE_URL}/banner/get-all-banner`,
  },
  
  // User endpoints
  USERS: {
    GET_PROFILE: `${API_BASE_URL}/users/profile`,
    UPDATE_PROFILE: `${API_BASE_URL}/users/update-profile`,
  },
};

// API Headers
export const API_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// API Timeout
export const API_TIMEOUT = 10000; // 10 seconds 