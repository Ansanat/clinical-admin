<template>
    <div style="max-width: 700px; margin: 20px auto;">
      <HeaderMenu />
      <h1>{{ isEdit ? 'Редактировать специалиста' : 'Добавить специалиста' }}</h1>
  
      <form @submit.prevent="saveSpecialist">
        <label>Имя Фамилия Отчество</label>
        <input v-model="form.name" required />
  
        <label>Специальность</label>
        <input v-model="form.specialty" required />
  
        <h3>Услуги</h3>
        <div v-for="(service, idx) in form.services" :key="idx" style="margin-bottom: 10px;">
          <label>Название</label>
          <input v-model="service.name" required />
          <label>Время (HH:MM)</label>
          <input type="time" v-model="service.duration" required />
          <button type="button" @click="removeService(idx)">Удалить услугу</button>
        </div>
        <button type="button" @click="addService">Добавить услугу</button>
  
        <h3>Расписание</h3>
        <div v-for="day in daysOfWeek" :key="day.key" style="margin-bottom: 8px;">
          <label>{{ day.label }}</label>
          <input v-model="form.schedule[day.key]" placeholder="например 10:00-16:00 или пусто" @input="validateInterval(day.key)" />
          <p v-if="errors[day.key]" class="error-message">{{ errors[day.key] }}</p>
        </div>
  
        <div style="margin-top: 20px;">
          <button type="submit">Сохранить</button>
          <button type="button" @click="cancel">Отмена</button>
        </div>
      </form>
    </div>
  </template>
  
  <script setup>
  import { ref, reactive, onMounted } from 'vue';
  import { useRouter, useRoute } from 'vue-router';
  import { db } from '../firebase';
  import { doc, getDoc, setDoc, addDoc, collection } from "firebase/firestore";
  import HeaderMenu from './HeaderMenu.vue';
  
  const router = useRouter();
  const route = useRoute();
  
  const isEdit = ref(false);
  const form = reactive({
    name: '',
    specialty: '',
    services: [],
    schedule: {
      monday: '',
      tuesday: '',
      wednesday: '',
      thursday: '',
      friday: '',
      saturday: '',
      sunday: ''
    }
  });
  
  const errors = reactive({});
  
  const daysOfWeek = [
    { key: 'monday', label: 'Понедельник' },
    { key: 'tuesday', label: 'Вторник' },
    { key: 'wednesday', label: 'Среда' },
    { key: 'thursday', label: 'Четверг' },
    { key: 'friday', label: 'Пятница' },
    { key: 'saturday', label: 'Суббота' },
    { key: 'sunday', label: 'Воскресенье' },
  ];
  
  function addService() {
    form.services.push({ name: '', duration: '00:30' });
  }
  
  function removeService(idx) {
    form.services.splice(idx, 1);
  }
  
  function validateInterval(dayKey) {
    const val = form.schedule[dayKey];
    if (!val) {
      errors[dayKey] = '';
      return;
    }
    const regex = /^([0-1]\d|2[0-3]):([0-5]\d)-([0-1]\d|2[0-3]):([0-5]\d)$/;
    if (!regex.test(val)) {
      errors[dayKey] = 'Неверный формат интервала. Пример: 10:00-16:00';
    } else {
      // Проверим что начало меньше конца
      const [start, end] = val.split('-');
      if (start >= end) {
        errors[dayKey] = 'Начало интервала должно быть меньше конца';
      } else {
        errors[dayKey] = '';
      }
    }
  }
  
  async function loadSpecialist(id) {
    const docRef = doc(db, 'specialists', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      form.name = data.name;
      form.specialty = data.specialty;
      form.services = data.services || [];
      form.schedule = data.schedule || {
        monday: '',
        tuesday: '',
        wednesday: '',
        thursday: '',
        friday: '',
        saturday: '',
        sunday: ''
      };
    }
  }
  
  async function saveSpecialist() {
    // Проверяем ошибки в расписании
    let hasErrors = false;
    daysOfWeek.forEach(day => {
      validateInterval(day.key);
      if (errors[day.key]) hasErrors = true;
    });
    if (hasErrors) return;
  
    if (isEdit.value) {
      const docRef = doc(db, 'specialists', route.params.id);
      await setDoc(docRef, JSON.parse(JSON.stringify(form)));
    } else {
      const colRef = collection(db, 'specialists');
      await addDoc(colRef, JSON.parse(JSON.stringify(form)));
    }
    router.push({ name: 'Specialists' });
  }
  
  function cancel() {
    router.push({ name: 'Specialists' });
  }
  
  onMounted(() => {
    if(route.params.id) {
      isEdit.value = true;
      loadSpecialist(route.params.id);
    } else {
      // При добавлении сразу одна услуга по умолчанию
      form.services = [{ name: '', duration: '00:30' }];
    }
  });
  </script>
  
  Найти еще