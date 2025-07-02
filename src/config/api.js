// API Base URL
export const API_BASE_URL = 'https://f948-2405-4802-4b8-c8d0-cc05-e6c0-506d-873a.ngrok-free.app';

// API Endpoints
export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN_GOOGLE: `${API_BASE_URL}/api/auth/login-google`,
    LOGIN_EMAIL: `${API_BASE_URL}/api/auth/login-email`,
    LOGIN_USERNAME: `${API_BASE_URL}/api/auth/login-username`,
    REGISTER: `${API_BASE_URL}/api/auth/register`,
  },
  // Product endpoints
  PRODUCTS: {
    GET_ALL: `${API_BASE_URL}/api/products/get-all-products`,
    GET_ALL_LIMIT: `${API_BASE_URL}/api/products/get-all-products-limit`,
    GET_BY_ID: (id) => `${API_BASE_URL}/api/products/get-product/${id}`,
    GET_BY_ID_FULL: (id) => `${API_BASE_URL}/api/products/get-products-by-id/id/${id}`,
    GET_BY_CATEGORY: (category) => `${API_BASE_URL}/api/products/get-products-by-category/${category}`,
    SEARCH: `${API_BASE_URL}/api/products/search-product`,
  },
  
  // Category endpoints
  CATEGORIES: {
    GET_ALL: `${API_BASE_URL}/api/categories/get-all-categories`,
    GET_BY_ID: (id) => `${API_BASE_URL}/api/categories/get-category/${id}`,
  },
  
  // Cart endpoints
  CART: {
    GET_BY_USER_ID: `${API_BASE_URL}/api/cart/getByUserId`,
    ADD_TO_CART: `${API_BASE_URL}/api/cart/addToCart`,
    UPDATE_QUANTITY: (id) => `${API_BASE_URL}/api/cart/updateQuantity/cartItemId/${id}`,
    DELETE_CART_ITEM: (id) => `${API_BASE_URL}/api/cart/deleteCartItem/${id}`,
  },
  
  // Order endpoints
  ORDERS: {
    GET_BY_USER_ID: `${API_BASE_URL}/api/order/getByUserId`,
    GET_ORDER_DETAIL: `${API_BASE_URL}/api/order/getOrderDetail`,
    CREATE_ORDER: (userId) => `${API_BASE_URL}/api/order/create/userId/${userId}`,
    UPDATE_STATUS: (orderId) => `${API_BASE_URL}/api/order/updateStatus/${orderId}`,
  },
  
  // Banner endpoints
  BANNERS: {
    GET_ALL: `${API_BASE_URL}/api/banner/get-all-banner`,
  },
  
  // User endpoints
  USERS: {
    GET_PROFILE: `${API_BASE_URL}/api/users/profile`,
    UPDATE_PROFILE: `${API_BASE_URL}/api/users/update-profile`,
    GET_BY_ID: (id) => `${API_BASE_URL}/api/users/get-by-id/id/${id}`,
  },

  // Address endpoints
  ADDRESS: {
    GET_BY_USER_ID: (userId) => `${API_BASE_URL}/api/address/getAddressByUserId/${userId}`,
    CREATE: (userId) => `${API_BASE_URL}/api/address/create/userId/${userId}`,
    DELETE: (addressId) => `${API_BASE_URL}/api/address/deleteAddress/${addressId}`,
    UPDATE: (addressId) => `${API_BASE_URL}/api/address/update/${addressId}`,
  },

  RATINGS: {
    CREATE: `${API_BASE_URL}/review/create-review`,
    GET_BY_PRODUCT: (productId) => `${API_BASE_URL}/ratings/product/${productId}`,
    GET_BY_USER: (userId) => `${API_BASE_URL}/ratings/user/${userId}`,
    UPDATE: (ratingId) => `${API_BASE_URL}/ratings/update/${ratingId}`,
    DELETE: (ratingId) => `${API_BASE_URL}/ratings/delete/${ratingId}`,
  },
};

// API Headers
export const API_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// API Timeout
export const API_TIMEOUT = 10000; // 10 seconds 