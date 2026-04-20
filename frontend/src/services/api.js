/**
 * API Service for Office Supply Management System
 * Centralized API calls with error handling
 */

const API_BASE_URL = 'http://localhost:5000/api';

/**
 * Generic fetch wrapper with error handling
 */
async function fetchAPI(endpoint, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
}

// Authentication APIs
export const authAPI = {
  login: (username, password) =>
    fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
};

// Inventory APIs
export const inventoryAPI = {
  getAll: () => fetchAPI('/inventory'),
  getById: (id) => fetchAPI(`/inventory/${id}`),
  getByCategory: (category) => fetchAPI(`/inventory/category/${category}`),
};

// Request APIs
export const requestAPI = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return fetchAPI(`/requests${params ? `?${params}` : ''}`);
  },
  
  getById: (id) => fetchAPI(`/requests/${id}`),
  
  create: (requestData) =>
    fetchAPI('/requests', {
      method: 'POST',
      body: JSON.stringify(requestData),
    }),
  
  approve: (requestId, adminId) =>
    fetchAPI(`/requests/${requestId}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ adminId }),
    }),
  
  reject: (requestId, adminId, rejectionReason) =>
    fetchAPI(`/requests/${requestId}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ adminId, rejectionReason }),
    }),
};

export default { authAPI, inventoryAPI, requestAPI };
