import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api'
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const auth = {
  login: (password) => api.post('/upload/auth', { password })
};

export const courses = {
  list: () => api.get('/courses'),
  get: (id) => api.get(`/courses/${id}`),
  create: (data) => api.post('/upload/course', data)
};

export const videos = {
  upload: (formData, onProgress) => api.post('/upload/video', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress
  })
};