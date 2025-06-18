<template>
    <header>
      <nav>
        <router-link to="/schedule" exact>Расписание</router-link>
        <router-link to="/specialists">Специалисты</router-link>
        <button @click="logout" style="float: right;">Выйти</button>
      </nav>
    </header>
  </template>
  
  <script setup>
  import { useAuthStore } from '../store';
  import { useRouter } from 'vue-router';
  
  const authStore = useAuthStore();
  const router = useRouter();
  
  function logout() {
    authStore.logout();
    router.push({ name: 'Auth' });
  }
  </script>
