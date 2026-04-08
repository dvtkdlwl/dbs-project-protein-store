// src/api.js
// Central Axios instance — automatically attaches JWT token to every request.

import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

// Attach token from localStorage before every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default API;
