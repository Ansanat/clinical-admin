import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { auth, signInWithEmailAndPassword, signOut } from '../firebase';

// Хранит состояние авторизации и пользователя
export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  const error = ref(null);

  const isAuthenticated = computed(() => user.value !== null);

  // Авторизация с фиксированным логином/паролем
  async function login(loginInput, passwordInput) {
    error.value = null;
    try {
      // Проверяем вручную логин и пароль, т.к. Firebase Auth Email/Password требует email
      // Для простоты используем жесткую проверку
      if (loginInput === 'admin' && passwordInput === 'клиниказдоровьяискитим2010') {
        // В реальном проекте можно авторизоваться через Firebase Custom Token или анонимно
        user.value = { login: 'admin' };
      } else {
        throw new Error('Неверный логин или пароль');
      }
    } catch (e) {
      error.value = e.message;
      user.value = null;
    }
  }

  function logout() {
    user.value = null;
  }

  return { user, error, isAuthenticated, login, logout };
});
