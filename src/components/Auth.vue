<template>
    <div class="card" style="max-width: 400px; margin: 50px auto;">
      <h2>Авторизация</h2>
      <form @submit.prevent="handleLogin">
        <label>Логин</label>
        <input v-model="login" type="text" required />
        <label>Пароль</label>
        <input v-model="password" type="password" required />
        <button type="submit">Войти</button>
      </form>
      <p v-if="error" class="error-message">{{ error }}</p>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue';
  import { useAuthStore } from '../store';
  import { useRouter } from 'vue-router';
  
  const login = ref('');
  const password = ref('');
  const authStore = useAuthStore();
  const router = useRouter();
  
  const error = ref(null);
  
  async function handleLogin() {
    await authStore.login(login.value, password.value);
    if (authStore.isAuthenticated) {
      router.push({ name: 'Schedule' });
    } else {
      error.value = authStore.error;
    }
  }
  </script>
  