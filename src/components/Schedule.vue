<template>
    <div style="max-width: 900px; margin: 20px auto;">
      <HeaderMenu />
      <h1>Расписание</h1>

      <FullSchedule />
  
      <div class="calendar-header">
        <button @click="prevMonth" style="background-color: green">&lt;</button>
        <h2>{{ monthYear }}</h2>
        <button style="background-color: green" @click="nextMonth">&gt;</button>
      </div>
  
      <!-- Дни недели -->
      <div class="weekdays">
        <div v-for="day in weekDays" :key="day" class="weekday">{{ day }}</div>
      </div>
  
      <!-- Сетка календаря -->
      <div class="calendar">
        <!-- Пустые ячейки перед первым днём месяца -->
        <div
          v-for="n in firstDayOfMonth"
          :key="'empty-' + n"
          class="calendar-day empty"
        ></div>
  
        <!-- Дни месяца -->
        <div
          v-for="day in daysInMonth"
          :key="day.date"
          class="calendar-day"
          :class="{ today: day.isToday }"
          @click="openDay(day.date)"
        >
          <strong>{{ day.day }}</strong>
          <!-- Можно здесь вывести количество специалистов, если нужно -->
          <!-- <div class="specialists">{{ day.specialists.length }} специалистов</div> -->
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, onMounted } from 'vue';
  import HeaderMenu from './HeaderMenu.vue';
  import { useRouter } from 'vue-router';
  import { db } from '../firebase';
  import { collection, getDocs } from "firebase/firestore";
  import FullSchedule from './FullSchedule.vue';
  
  const router = useRouter();
  
  const currentYear = ref(new Date().getFullYear());
  const currentMonth = ref(new Date().getMonth()); // 0-11
  const specialists = ref([]);
  
  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  
  async function loadSpecialists() {
    try {
      const col = collection(db, "specialists");
      const snapshot = await getDocs(col);
      specialists.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error("Ошибка загрузки специалистов:", e);
    }
  }
  
  function getDaysInMonth(year, month) {
    const daysCount = new Date(year, month + 1, 0).getDate();
    const days = [];
    const todayStr = new Date().toISOString().slice(0,10);
  
    for (let day = 1; day <= daysCount; day++) {
      const dateObj = new Date(year, month, day, 12, 0, 0);
      const dateStr = dateObj.toISOString().slice(0,10);
  
      const workingSpecs = specialists.value.filter(spec => {
        const interval = spec.schedule?.[dateStr];
        return interval && interval.trim() !== '';
      });
  
      days.push({
        day,
        date: dateStr,
        specialists: workingSpecs,
        isToday: dateStr === todayStr
      });
    }
    return days;
  }
  
  // Чтобы сдвинуть первый день месяца под понедельник (0 = понедельник)
  const firstDayOfMonth = computed(() => {
    const firstDay = new Date(currentYear.value, currentMonth.value, 1).getDay();
    // JS: воскресенье=0, понедельник=1
    // Нужно чтобы понедельник=0, воскресенье=6
    return firstDay === 0 ? 6 : firstDay - 1;
  });
  
  const daysInMonth = computed(() => getDaysInMonth(currentYear.value, currentMonth.value));
  
  const monthYear = computed(() => {
    const date = new Date(currentYear.value, currentMonth.value);
    return date.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
  });
  
  function prevMonth() {
    if (currentMonth.value === 0) {
      currentMonth.value = 11;
      currentYear.value--;
    } else {
      currentMonth.value--;
    }
  }
  
  function nextMonth() {
    if (currentMonth.value === 11) {
      currentMonth.value = 0;
      currentYear.value++;
    } else {
      currentMonth.value++;
    }
  }
  
  function openDay(date) {
    router.push({ name: 'DayRecords', params: { date } });
  }
  
  onMounted(async () => {
    await loadSpecialists();
  });
  </script>
  
  <style scoped>
  .calendar-header {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }
  
  .calendar-header button {
    cursor: pointer;
    font-size: 18px;
    padding: 4px 12px;
    border-radius: 4px;
    border: 1px solid #ccc;
    background: white;
    transition: background-color 0.2s;
  }
  
  .calendar-header button:hover {
    background-color: #eee;
  }
  
  .weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    font-weight: 600;
    color: #444;
    border-bottom: 1px solid #ddd;
    padding-bottom: 6px;
    margin-bottom: 6px;
  }
  
  .weekday {
    text-align: center;
    user-select: none;
  }
  
  .calendar {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 8px;
  }
  
  .calendar-day {
    background-color: #81c784;
    border-radius: 6px;
    padding: 8px;
    min-height: 100px;
    cursor: pointer;
    user-select: none;
    display: flex;
    flex-direction: column;
    transition: background-color 0.2s;
  }
  
  .calendar-day:hover {
    background-color: #66bb6a;
  }
  
  .calendar-day.today {
    border: 2px solid #1b5e20;
  }
  
  .calendar-day.empty {
    background-color: transparent;
    cursor: default;
    pointer-events: none;
  }
  
  .specialists {
    margin-top: 6px;
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  </style>
  