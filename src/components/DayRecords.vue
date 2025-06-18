<template>
    <div style="max-width: 900px; margin: 20px auto;">
      <HeaderMenu />
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <button @click="goBack">Назад</button>
        <h2>Записи на {{ formattedDate }}</h2>
        <button @click="createRecord">Создать новую запись</button>
      </div>
  
      <div v-if="loading">Загрузка...</div>
      <div v-else>
        <div v-for="spec in specialistsWithRecords" :key="spec.id" style="margin-top: 20px;">
          <h3 v-if="spec.records.length != 0">{{ spec.name }} - {{ spec.specialty }}</h3>
          <!-- <div v-if="spec.records.length === 0">Нет записей</div> -->
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
  const specialists = ref([]);
  const records = ref([]);
  const showConfirm = ref(false);
  const recordToDelete = ref(null);
  
  async function loadSpecialists() {
    const col = collection(db, "specialists");
    const snapshot = await getDocs(col);
    specialists.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
  
  async function loadRecords() {
    const col = collection(db, "records");
    const q = query(col, where("date", "==", dateParam));
    const snapshot = await getDocs(q);
    records.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
  
  const specialistsWithRecords = computed(() => {
    return specialists.value.map(spec => {
      return {
        ...spec,
        records: records.value.filter(r => r.specialistId === spec.id)
          .sort((a,b) => a.time.localeCompare(b.time))
      };
    });
  });
  
  function goBack() {
    router.push({ name: 'Schedule' });
  }
  
  function createRecord() {
    router.push({ name: 'AddRecord', params: { date: dateParam } });
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
