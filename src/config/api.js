// API Base URL
export const API_BASE_URL = 'https://ca2d-2405-4803-fdc0-2b00-c07f-6315-e4c5-1d56.ngrok-free.app/api';

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
    CREATE_ORDER: (userId) => `${API_BASE_URL}/order/create/userId/${userId}`,
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

  // Address endpoints
  ADDRESS: {
    GET_BY_USER_ID: (userId) => `${API_BASE_URL}/address/getAddressByUserId/${userId}`,
    CREATE: (userId) => `${API_BASE_URL}/address/create/userId/${userId}`,
    DELETE: (addressId) => `${API_BASE_URL}/address/deleteAddress/${addressId}`,
    UPDATE: (addressId) => `${API_BASE_URL}/address/update/${addressId}`,
  },
};

// API Headers
export const API_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// API Timeout
export const API_TIMEOUT = 10000; // 10 seconds 