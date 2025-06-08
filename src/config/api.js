// API Base URL
export const API_BASE_URL = 'http://192.168.1.117:3000/api';

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
    GET_BY_ID: (id) => `${API_BASE_URL}/products/get-product/${id}`,
    GET_BY_CATEGORY: (category) => `${API_BASE_URL}/products/get-products-by-category/${category}`,
  },
  
  // Category endpoints
  CATEGORIES: {
    GET_ALL: `${API_BASE_URL}/categories/get-all-categories`,
    GET_BY_ID: (id) => `${API_BASE_URL}/categories/get-category/${id}`,
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