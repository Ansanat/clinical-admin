<template>
  <div style="max-width: 700px; margin: 20px auto;">
    <HeaderMenu />
    <h1>{{ isEdit ? 'Редактировать специалиста' : 'Добавить специалиста' }}</h1>

    <form @submit.prevent="saveSpecialist">
      <label>Фамилия Имя Отчество</label>
      <br />
      <input style="width: 400px;" v-model="form.name" required />
      <br />
      <label>Специальность</label>
      <br />
      <input style="width: 400px;" v-model="form.specialty" required />
      <br />
      <h3>Услуги</h3>
      <div v-for="(service, idx) in form.services" :key="idx" style="margin-bottom: 10px;">
        <label>Название</label>
        <input v-model="service.name" required style="margin-left: 10px;" />
        <label style="margin-left: 10px;">Время (HH:MM)</label>
        <input type="time" v-model="service.duration" required style="margin-left: 10px;" />
        <button type="button" @click="removeService(idx)" style="margin-left: 10px;">Удалить услугу</button>
      </div>
      <button type="button" @click="addService">Добавить услугу</button>

      <h3>Расписание по датам</h3>
      <div>
        <label for="date-picker">Добавить дату расписания:</label>
        <input id="date-picker" type="date" v-model="newDate" :min="minDate" />
        <button type="button" @click="addDate" :disabled="!newDate || form.schedule[newDate] !== undefined">
          Добавить
        </button>
      </div>

      <div v-if="Object.keys(form.schedule).length === 0" style="margin-top: 10px;">
        Расписание не задано.
      </div>

      <div v-for="(interval, date) in sortedSchedule" :key="date" style="margin-top: 10px;">
        <label :for="'interval-' + date">{{ formatDate(date) }}</label>
        <input
          :id="'interval-' + date"
          v-model="form.schedule[date]"
          placeholder="например 10:00-16:00"
          @input="validateInterval(date)"
          style="margin-left: 10px; width: 150px;"
        />
        <button type="button" @click="removeDate(date)" style="margin-left: 10px;">Удалить</button>
        <p v-if="errors[date]" class="error-message" style="margin: 4px 0 0 0;">{{ errors[date] }}</p>
      </div>

      <div style="margin-top: 20px;">
        <button type="submit">Сохранить</button>
        <button type="button" @click="cancel">Отмена</button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { doc, getDoc, setDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import HeaderMenu from './HeaderMenu.vue';

const router = useRouter();
const route = useRoute();

const isEdit = ref(false);
const form = reactive({
  name: '',
  specialty: '',
  services: [],
  // Расписание теперь объект с ключами - датами в формате 'YYYY-MM-DD'
  schedule: {}
});

const errors = reactive({});

const newDate = ref('');
const minDate = new Date().toISOString().slice(0, 10); // сегодня

function addService() {
  form.services.push({ name: '', duration: '00:30' });
}

function removeService(idx) {
  form.services.splice(idx, 1);
}

function addDate() {
  if (!newDate.value) return;
  if (form.schedule[newDate.value] !== undefined) return; // уже есть
  form.schedule[newDate.value] = '';
  errors[newDate.value] = '';
  newDate.value = '';
}

function removeDate(date) {
  delete form.schedule[date];
  delete errors[date];
}

function validateInterval(date) {
  const val = form.schedule[date];
  if (!val) {
    errors[date] = '';
    return;
  }
  const regex = /^([0-1]\d|2[0-3]):([0-5]\d)-([0-1]\d|2[0-3]):([0-5]\d)$/;
  if (!regex.test(val)) {
    errors[date] = 'Неверный формат интервала. Пример: 10:00-16:00';
  } else {
    const [start, end] = val.split('-');
    if (start >= end) {
      errors[date] = 'Начало интервала должно быть меньше конца';
    } else {
      errors[date] = '';
    }
  }
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

const sortedSchedule = computed(() => {
  // Сортируем даты по возрастанию
  return Object.keys(form.schedule)
    .sort((a, b) => (a > b ? 1 : -1))
    .reduce((acc, key) => {
      acc[key] = form.schedule[key];
      return acc;
    }, {});
});

async function loadSpecialist(id) {
  const docRef = doc(db, 'specialists', id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    form.name = data.name;
    form.specialty = data.specialty;
    form.services = data.services || [];
    // Поддержка старого формата расписания по дням недели:
    if (data.schedule && typeof data.schedule === 'object' && !Array.isArray(data.schedule)) {
      // Если ключи - дни недели, преобразуем в пустой объект (пользователь должен будет заново задать даты)
      // Либо если в базе уже есть даты в формате YYYY-MM-DD, используем как есть
      const keys = Object.keys(data.schedule);
      const isOldFormat = keys.every(k =>
        ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].includes(k)
      );
      if (isOldFormat) {
        form.schedule = {};
      } else {
        form.schedule = data.schedule;
      }
    } else {
      form.schedule = {};
    }
  }
}

async function saveSpecialist() {
  // Проверяем ошибки в расписании
  let hasErrors = false;
  Object.keys(form.schedule).forEach(date => {
    validateInterval(date);
    if (errors[date]) hasErrors = true;
  });
  if (hasErrors) return;

  const dataToSave = JSON.parse(JSON.stringify(form)); // глубокое копирование

  if (isEdit.value) {
    const docRef = doc(db, 'specialists', route.params.id);
    await setDoc(docRef, dataToSave);
  } else {
    const colRef = collection(db, 'specialists');
    await addDoc(colRef, dataToSave);
  }
  router.push({ name: 'Specialists' });
}

function cancel() {
  router.push({ name: 'Specialists' });
}

onMounted(() => {
  if (route.params.id) {
    isEdit.value = true;
    loadSpecialist(route.params.id);
  } else {
    // При добавлении сразу одна услуга по умолчанию
    form.services = [{ name: '', duration: '00:30' }];
    form.schedule = {};
  }
});
</script>

<style scoped>
.error-message {
  color: red;
  font-size: 0.9em;
}
</style>
