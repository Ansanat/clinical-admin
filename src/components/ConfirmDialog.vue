<template>
    <div class="modal-bg">
      <div class="modal-content">
        <p>{{ message }}</p>
        <div style="text-align: right; margin-top: 20px;">
          <button @click="$emit('ok')">Ок</button>
          <button @click="$emit('cancel')">Отмена</button>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  defineProps({
    message: String
  });
  </script>
  