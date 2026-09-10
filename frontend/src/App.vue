<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const films = ref([]);

onMounted(async () => {
  const response = await axios.get('http://localhost:3000/lot-de-films', {
    params: {
      mood: 'adrenaline',
      noteMin: 0,
      noteMax: 5
    }
  });
  films.value = response.data;
});
</script>

<template>
  <div v-if="films.length > 0">
    <img :src="films[0].posterUrl" alt="affiche du film" />
    <h1>{{ films[0].title }}</h1>
    <p>{{ films[0].overview }}</p>
  </div>
  <div v-else>
    <p>Chargement...</p>
  </div>
</template>