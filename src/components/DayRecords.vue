<template>
  <div style="max-width: 900px; margin: 20px auto;">
    <HeaderMenu />
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <button @click="goBack">Назад</button>
      <h2>Записи на {{ formattedDate }}</h2>
      <!-- Кнопка "Создать новую запись" убрана -->
    </div>

    <div v-if="loading">Загрузка...</div>
    <div v-else>
      <div v-if="specialistsWithRecords.length === 0">Нет специалистов, работающих в этот день.</div>
      <div v-for="spec in specialistsWithRecords" :key="spec.id" style="margin-top: 20px;">
        <h3>
          {{ spec.name }} - {{ spec.specialty }}
          <button @click="createRecord(spec.id)" style="margin-left: 10px;">Добавить запись</button>
        </h3>
        <!-- Добавляем строку с расписанием -->
        <div class="schedule-interval" style="font-size: 15px; margin-bottom: 30px;">
          {{ formatSchedule(spec.schedule?.[dateParam]) }}
        </div>

        <div v-if="spec.records.length === 0"><em>Записей нет</em></div>
        <div v-for="record in spec.records" :key="record.id" class="card">
          <p><strong>Услуга:</strong> {{ record.serviceName }}</p>
          <p><strong>Время:</strong> {{ record.time }}</p>
          <p><strong>Пациент:</strong> {{ record.patientName }}</p>
          <p><strong>Телефон:</strong> {{ record.patientPhone }}</p>
          <button @click="editRecord(record.id)">Редактировать</button>
          <button @click="confirmDelete(record)">Удалить</button>
        </div>
      </div>
    </div>

    <ConfirmDialog
      v-if="showConfirm"
      :message="'Вы точно хотите удалить запись?'"
      @ok="deleteRecord"
      @cancel="showConfirm = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import HeaderMenu from './HeaderMenu.vue';
import ConfirmDialog from './ConfirmDialog.vue';
import { db } from '../firebase';
import { collection, getDocs, query, where, doc, deleteDoc } from "firebase/firestore";

const router = useRouter();
const route = useRoute();

const dateParam = route.params.date; // yyyy-mm-dd
const loading = ref(true);
const allSpecialists = ref([]);
const records = ref([]);
const showConfirm = ref(false);
const recordToDelete = ref(null);

// Форматируем интервал расписания из "13:00-16:00" в "С 13:00 до 16:00"
function formatSchedule(interval) {
  if (!interval || interval.trim() === '') return 'Не работает';
  const [start, end] = interval.split('-');
  return `С ${start} до ${end}`;
}

// Загружаем специалистов, у которых в расписании есть выбранная дата
async function loadSpecialists() {
  const col = collection(db, "specialists");
  const snapshot = await getDocs(col);
  allSpecialists.value = snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(spec => spec.schedule && spec.schedule[dateParam] && spec.schedule[dateParam].length > 0);
}

async function loadRecords() {
  const col = collection(db, "records");
  const q = query(col, where("date", "==", dateParam));
  const snapshot = await getDocs(q);
  records.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Группируем записи по специалистам
const specialistsWithRecords = computed(() => {
  return allSpecialists.value.map(spec => {
    return {
      ...spec,
      records: records.value
        .filter(r => r.specialistId === spec.id)
        .sort((a,b) => a.time.localeCompare(b.time))
    };
  });
});

function goBack() {
  router.push({ name: 'Schedule' });
}

function createRecord(specialistId) {
  router.push({ name: 'AddRecord', params: { date: dateParam, specialistId } });
}

function editRecord(id) {
  router.push({ name: 'EditRecord', params: { id } });
}

function confirmDelete(record) {
  recordToDelete.value = record;
  showConfirm.value = true;
}

async function deleteRecord() {
  if (!recordToDelete.value) return;
  showConfirm.value = false;
  const docRef = doc(db, "records", recordToDelete.value.id);
  await deleteDoc(docRef);
  await loadRecords();
  recordToDelete.value = null;
}

const formattedDate = computed(() => {
  const d = new Date(dateParam);
  return d.toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' });
});

onMounted(async () => {
  await loadSpecialists();
  await loadRecords();
  loading.value = false;
});
</script>

<style scoped>
.card {
  border: 1px solid #ccc;
  padding: 10px;
  margin-bottom: 10px;
}
</style>

