<template>
  <div class="full-schedule">
    <button @click="toggleShow" class="toggle-btn">
      {{ showFullSchedule ? 'Скрыть полное расписание' : 'Показать полное расписание' }}
    </button>
    
    <div v-if="showFullSchedule" class="schedule-list">
      <div v-for="spec in specialistsSchedule" :key="spec.id" class="specialist-schedule">
        <h3>{{ spec.name }} - {{ spec.specialty }}</h3>
        <div v-for="(interval, date) in spec.schedule" :key="date" class="schedule-item">
          <router-link :to="{ name: 'DayRecords', params: { date } }" class="date-link">
            {{ formatDate(date) }}
          </router-link>
          - {{ formatInterval(interval) }}
        </div>
        <div v-if="Object.keys(spec.schedule).length === 0" class="no-schedule">
          Нет данных о расписании
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { db } from '../firebase';
import { collection, getDocs } from "firebase/firestore";

const router = useRouter();
const showFullSchedule = ref(false);
const allSpecialists = ref([]);

async function loadSpecialists() {
  const col = collection(db, "specialists");
  const snapshot = await getDocs(col);
  allSpecialists.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatInterval(interval) {
  if (!interval || interval.trim() === '') return 'не работает';
  const [start, end] = interval.split('-');
  return `с ${start} до ${end}`;
}

function toggleShow() {
  showFullSchedule.value = !showFullSchedule.value;
  if (showFullSchedule.value && allSpecialists.value.length === 0) {
    loadSpecialists();
  }
}

const specialistsSchedule = computed(() => {
  return allSpecialists.value
    .filter(spec => spec.schedule && Object.keys(spec.schedule).length > 0)
    .map(spec => ({
      id: spec.id,
      name: spec.name,
      specialty: spec.specialty,
      schedule: spec.schedule
    }))
    .sort((a, b) => a.name.localeCompare(b.name)); // Сортируем специалистов по имени
});
</script>

<style scoped>
.full-schedule {
  margin: 20px 0;
}

.toggle-btn {
  background-color: #2e7d32;
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  margin-bottom: 10px;
}

.toggle-btn:hover {
  background-color: #388e3c;
}

.schedule-list {
  background-color: white;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.specialist-schedule {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.specialist-schedule:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.schedule-item {
  margin: 5px 0;
  padding-left: 20px;
}

.no-schedule {
  color: #757575;
  font-style: italic;
  padding-left: 20px;
}

.date-link {
  color: #2e7d32;
  text-decoration: none;
  font-weight: 600;
}

.date-link:hover {
  text-decoration: underline;
}
</style>