import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    name: 'CourseList',
    component: () => import('../views/PlayView.vue')
  },
  {
    path: '/play/:courseId',
    name: 'Play',
    component: () => import('../views/PlayView.vue')
  },
  {
    path: '/upload',
    name: 'Upload',
    component: () => import('../views/UploadView.vue')
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;