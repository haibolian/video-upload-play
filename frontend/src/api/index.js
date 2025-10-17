import axios from 'axios';

const api = axios.create({
  baseURL: 'http://192.168.31.39:3000/api'
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
  list: (params) => api.get('/courses', { params }),
  get: (id) => api.get(`/courses/${id}`),
  create: (data) => api.post('/upload/course', data),
  update: (id, data) => api.put(`/upload/course/${id}`, data),
  delete: (id) => api.delete(`/upload/course/${id}`),
  uploadCover: (courseId, file) => {
    const formData = new FormData();
    formData.append('cover', file);
    return api.post(`/upload/course/${courseId}/cover`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

export const videos = {
  upload: (formData, onProgress) => api.post('/upload/video', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress
  }),
  update: (videoId, data) => api.put(`/upload/video/${videoId}`, data),
  delete: (videoId) => api.delete(`/upload/video/${videoId}`)
};