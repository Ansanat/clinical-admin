import { createRouter, createWebHistory } from 'vue-router';
import Auth from '../components/Auth.vue';
import Schedule from '../components/Schedule.vue';
import DayRecords from '../components/DayRecords.vue';
import Specialists from '../components/Specialists.vue';
import SpecialistForm from '../components/SpecialistForm.vue';
import RecordForm from '../components/RecordForm.vue';
import { useAuthStore } from '../store';

const routes = [
  { path: '/', name: 'Auth', component: Auth },
  { 
    path: '/schedule', 
    name: 'Schedule', 
    component: Schedule,
    meta: { requiresAuth: true }
  },
  { 
    path: '/schedule/:date', 
    name: 'DayRecords', 
    component: DayRecords,
    meta: { requiresAuth: true }
  },
  {
    path: '/specialists',
    name: 'Specialists',
    component: Specialists,
    meta: { requiresAuth: true }
  },
  {
    path: '/specialists/add',
    name: 'AddSpecialist',
    component: SpecialistForm,
    meta: { requiresAuth: true }
  },
  {
    path: '/specialists/edit/:id',
    name: 'EditSpecialist',
    component: SpecialistForm,
    meta: { requiresAuth: true }
  },
  {
    path: '/record/add/:date',
    name: 'AddRecord',
    component: RecordForm,
    meta: { requiresAuth: true }
  },
  {
    path: '/record/edit/:id',
    name: 'EditRecord',
    component: RecordForm,
    meta: { requiresAuth: true }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Простая защита маршрутов
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'Auth' });
  } else {
    next();
  }
});

export default router;
