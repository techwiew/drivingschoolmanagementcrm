import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.PROD ? '/_/backend/api' : 'http://localhost:5000/api'
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
