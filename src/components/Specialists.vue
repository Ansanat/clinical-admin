<template>
    <div style="max-width: 900px; margin: 20px auto;">
      <HeaderMenu />
      <h1>Специалисты</h1>
  
      <div v-if="loading">Загрузка...</div>
      <div v-else>
        <div v-for="spec in specialists" :key="spec.id" class="card">
          <h3>{{ spec.name }}</h3>
          <p><strong>Специальность:</strong> {{ spec.specialty }}</p>
          <button @click="editSpecialist(spec.id)">Редактировать</button>
          <button @click="confirmDelete(spec)">Удалить</button>
        </div>
  
        <button @click="addSpecialist">Добавить специалиста</button>
      </div>
  
      <ConfirmDialog
        v-if="showConfirm"
        :message="confirmMessage"
        @ok="deleteSpecialist"
        @cancel="showConfirm = false"
      />
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue';
  import { useRouter } from 'vue-router';
  import { db } from '../firebase';
  import { collection, getDocs, doc, deleteDoc, query, where, writeBatch } from "firebase/firestore";
  import HeaderMenu from './HeaderMenu.vue';
  import ConfirmDialog from './ConfirmDialog.vue';
  
  const router = useRouter();
  const specialists = ref([]);
  const loading = ref(true);
  const showConfirm = ref(false);
  const confirmMessage = "Вы точно хотите удалить специалиста? Тогда все его записи будут стёрты из расписания.";
  const specialistToDelete = ref(null);
  
  async function loadSpecialists() {
    loading.value = true;
    const col = collection(db, "specialists");
    const snapshot = await getDocs(col);
    specialists.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    loading.value = false;
  }
  
  function addSpecialist() {
    router.push({ name: 'AddSpecialist' });
  }
  
  function editSpecialist(id) {
    router.push({ name: 'EditSpecialist', params: { id } });
  }
  
  function confirmDelete(spec) {
    specialistToDelete.value = spec;
    showConfirm.value = true;
  }
  
  async function deleteSpecialist() {
    showConfirm.value = false;
    if (!specialistToDelete.value) return;
    const specId = specialistToDelete.value.id;
  
    // Удаляем специалиста и все его записи
    const batch = writeBatch(db);
  
    const specRef = doc(db, "specialists", specId);
    batch.delete(specRef);
  
    // Удаляем записи с этим специалистом
    const recordsCol = collection(db, "records");
    const q = query(recordsCol, where("specialistId", "==", specId));
    const recordsSnap = await getDocs(q);
    recordsSnap.forEach(recordDoc => {
      batch.delete(recordDoc.ref);
    });
  
    await batch.commit();
  
    await loadSpecialists();
    specialistToDelete.value = null;
  }
  
  onMounted(() => {
    loadSpecialists();
  });
  </script>
