<template>
    <div style="max-width: 700px; margin: 20px auto;">
      <HeaderMenu />
      <h1>{{ isEdit ? 'Редактировать запись' : 'Создать новую запись' }}</h1>
  
      <form @submit.prevent="saveRecord">
        <label>Дата</label>
        <input style="margin-left: 10px;" type="date" v-model="form.date" required />
        <br>
  
        <label>Специалист</label>
        <select style="margin-left: 10px;" v-model="form.specialistId" @change="onSpecialistChange" required>
          <option disabled value="">Выберите специалиста</option>
          <option v-for="spec in availableSpecialists" :key="spec.id" :value="spec.id">
            {{ spec.name }} - {{ spec.specialty }}
          </option>
        </select>
        <br>
  
        <label>Услуга</label>
        <select style="margin-left: 10px;" v-model="form.serviceName" @change="onServiceChange" required>
          <option disabled value="">Выберите услугу</option>
          <option v-for="service in availableServices" :key="service.name" :value="service.name">
            {{ service.name }} ({{ service.duration }})
          </option>
        </select>
        <br>
  
        <label>Время</label>
        <select style="margin-left: 10px;" v-model="form.time" required>
          <option disabled value="">Выберите время</option>
          <option v-for="slot in availableTimeSlots" :key="slot" :value="slot">{{ slot }}</option>
        </select>
        <p v-if="timeError" class="error-message">{{ timeError }}</p>
        <br>
  
        <label>ФИО пациента</label>
        <input style="margin-left: 10px;" v-model="form.patientName" required />
        <br>
  
        <label>Номер телефона пациента</label>
        <input style="margin-left: 10px;" v-model="form.patientPhone" type="tel" required />
  
        <div style="margin-top: 20px;">
          <button type="submit">Сохранить</button>
          <button type="button" @click="cancel">Отмена</button>
        </div>
      </form>
    </div>
  </template>
  
  <script setup>
  import { ref, reactive, watch, onMounted } from 'vue';
  import { useRouter, useRoute } from 'vue-router';
  import HeaderMenu from './HeaderMenu.vue';
  import { db } from '../firebase';
  import { collection, getDocs, doc, getDoc, addDoc, setDoc, query, where } from "firebase/firestore";
  
  const router = useRouter();
  const route = useRoute();
  
  const isEdit = ref(false);
  const form = reactive({
    date: '',
    specialistId: '',
    serviceName: '',
    time: '',
    patientName: '',
    patientPhone: ''
  });
  
  const allSpecialists = ref([]);
  const availableSpecialists = ref([]);
  const availableServices = ref([]);
  const availableTimeSlots = ref([]);
  const timeError = ref('');
  
  function parseInterval(interval) {
    // Возвращает [startMinutes, endMinutes]
    if (!interval) return null;
    const parts = interval.split('-');
    if(parts.length !== 2) return null;
    const [start, end] = parts;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return [sh*60 + sm, eh*60 + em];
  }
  
  function formatTime(minutes) {
    const h = Math.floor(minutes / 60).toString().padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }
  
  function getDurationInMinutes(durationStr) {
    // durationStr в формате HH:MM
    const [h,m] = durationStr.split(':').map(Number);
    return h*60 + m;
  }
  
  async function loadSpecialists() {
    const col = collection(db, "specialists");
    const snapshot = await getDocs(col);
    allSpecialists.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    filterSpecialistsByDate(form.date);
  }
  
  function filterSpecialistsByDate(date) {
    if(!date) {
      availableSpecialists.value = [];
      return;
    }
    availableSpecialists.value = allSpecialists.value.filter(spec => {
      const interval = spec.schedule?.[date];
      return interval && interval.trim() !== '';
    });
    if (!availableSpecialists.value.find(s => s.id === form.specialistId)) {
      form.specialistId = '';
      form.serviceName = '';
      availableServices.value = [];
      availableTimeSlots.value = [];
    }
  }
  
  function updateAvailableServices() {
    const spec = availableSpecialists.value.find(s => s.id === form.specialistId);
    if (spec) {
      availableServices.value = spec.services || [];
    } else {
      availableServices.value = [];
    }
    form.serviceName = '';
    availableTimeSlots.value = [];
    form.time = '';
  }
  
  async function loadRecordsForDate(date) {
    const col = collection(db, "records");
    const q = query(col, where("date", "==", date));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
  
  async function updateAvailableTimeSlots() {
    timeError.value = '';
    availableTimeSlots.value = [];
    if (!form.date || !form.specialistId || !form.serviceName) return;
  
    const spec = availableSpecialists.value.find(s => s.id === form.specialistId);
    if (!spec) return;
  
    const interval = spec.schedule?.[form.date];
    if (!interval) return;
  
    const [workStart, workEnd] = parseInterval(interval);
    const service = spec.services.find(s => s.name === form.serviceName);
    if (!service) return;
  
    const serviceDuration = getDurationInMinutes(service.duration);
  
    // Загружаем все записи этого специалиста на эту дату
    const records = await loadRecordsForDate(form.date);
    const busySlots = records
      .filter(r => r.specialistId === form.specialistId && r.id !== (route.params.id || ''))
      .map(r => {
        const [sh, sm] = r.time.split(':').map(Number);
        const start = sh*60 + sm;
        const duration = getDurationInMinutes(
          spec.services.find(s => s.name === r.serviceName)?.duration || '00:30'
        );
        return [start, start + duration];
      });
  
    // Проверяем все возможные слоты в рабочем интервале
    for(let start = workStart; start + serviceDuration <= workEnd; start += 5) { // шаг 5 минут
      const end = start + serviceDuration;
      // Проверка пересечений с busySlots
      const overlaps = busySlots.some(([bstart, bend]) => !(end <= bstart || start >= bend));
      if (!overlaps) {
        availableTimeSlots.value.push(`${formatTime(start)}`);
      }
    }
  
    if (availableTimeSlots.value.length === 0) {
      timeError.value = 'Для данной услуги на этот день нет времени.';
    }
  
    // Если выбранное время больше не доступно, сбросим
    if (!availableTimeSlots.value.includes(form.time)) {
      form.time = '';
    }
  }
  
  async function saveRecord() {
    timeError.value = '';
    if (!form.time) {
      timeError.value = 'Выберите время записи';
      return;
    }
  
    // Проверка, что время не занято другим администратором
    const records = await loadRecordsForDate(form.date);
    const spec = availableSpecialists.value.find(s => s.id === form.specialistId);
    const service = spec.services.find(s => s.name === form.serviceName);
    const serviceDuration = getDurationInMinutes(service.duration);
    const [sh, sm] = form.time.split(':').map(Number);
    const start = sh*60 + sm;
    const end = start + serviceDuration;
  
    const conflict = records.some(r => {
      if (r.id === (route.params.id || '')) return false;
      if (r.specialistId !== form.specialistId) return false;
      const rService = spec.services.find(s => s.name === r.serviceName);
      if (!rService) return false;
      const rDuration = getDurationInMinutes(rService.duration);
      const [rsh, rsm] = r.time.split(':').map(Number);
      const rStart = rsh*60 + rsm;
      const rEnd = rStart + rDuration;
      return !(end <= rStart || start >= rEnd);
    });
  
    if (conflict) {
      timeError.value = 'Это время уже занял другой администратор.';
      await updateAvailableTimeSlots();
      return;
    }
  
    // Проверка, что специалист работает в этот день
    const interval = spec.schedule?.[form.date];
    if (!interval || interval.trim() === '') {
      timeError.value = 'Специалист не работает в выбранный день.';
      return;
    }
  
    const dataToSave = {
      date: form.date,
      specialistId: form.specialistId,
      serviceName: form.serviceName,
      time: form.time,
      patientName: form.patientName,
      patientPhone: form.patientPhone
    };
  
    if (isEdit.value) {
      const docRef = doc(db, 'records', route.params.id);
      await setDoc(docRef, dataToSave);
    } else {
      const colRef = collection(db, 'records');
      await addDoc(colRef, dataToSave);
    }
  
    router.push({ name: 'DayRecords', params: { date: form.date } });
  }
  
  function cancel() {
    router.push({ name: 'DayRecords', params: { date: form.date } });
  }
  
  async function loadRecord(id) {
    const docRef = doc(db, 'records', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      form.date = data.date;
      form.specialistId = data.specialistId;
      form.serviceName = data.serviceName;
      form.time = data.time;
      form.patientName = data.patientName;
      form.patientPhone = data.patientPhone;
    }
  }
  
  function onSpecialistChange() {
    updateAvailableServices();
  }
  
  function onServiceChange() {
    updateAvailableTimeSlots();
  }
  
  watch(() => form.date, (newVal) => {
    filterSpecialistsByDate(newVal);
  });
  
  watch(() => form.specialistId, () => {
    updateAvailableServices();
  });
  
  watch(() => form.serviceName, () => {
    updateAvailableTimeSlots();
  });
  
  onMounted(async () => {
    if (!route.params.date && !route.params.id) {
      form.date = new Date().toISOString().slice(0,10);
    } else if (route.params.date) {
      form.date = route.params.date;
    }
  
    await loadSpecialists();
  
    if (route.params.id) {
      isEdit.value = true;
      await loadRecord(route.params.id);
    }
  });
  </script>
  
  <style scoped>
  .error-message {
    color: red;
    font-weight: 600;
    margin-top: 8px;
  }
  </style>

