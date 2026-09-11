<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';

const route = useRoute();

const films = ref([]);
const indexActuel = ref(0);
const erreur = ref(null);
const chargementEnCours = ref(false);

const SEUIL_RECHARGE = 15;
const RESERVE_CIBLE = 25;

function criteresRecherche() {
  return {
    mood: route.query.mood,
    noteMin: route.query.noteMin,
    noteMax: route.query.noteMax,
    dureeMin: route.query.dureeMin,
    dureeMax: route.query.dureeMax,
    exclure: films.value.map(f => f.id).join(',')
  };
}

function filmsRestants() {
  return films.value.length - 1 - indexActuel.value;
}

async function chargerLotSiBesoin() {
  if (chargementEnCours.value) return;
  if (filmsRestants() >= SEUIL_RECHARGE) return;

  chargementEnCours.value = true;
  try {
    while (filmsRestants() < RESERVE_CIBLE) {
      const response = await axios.get('http://localhost:3000/lot-de-films', {
        params: criteresRecherche()
      });
      if (response.data.length === 0) break; // plus rien à trouver, on arrête
      films.value = [...films.value, ...response.data];
    }
  } catch (e) {
    console.log('Pas de nouveau lot disponible pour le moment');
  } finally {
    chargementEnCours.value = false;
  }
}

function filmSuivant() {
  if (indexActuel.value < films.value.length - 1) {
    indexActuel.value++;
  }
  chargerLotSiBesoin();
}

function filmPrecedent() {
  if (indexActuel.value > 0) indexActuel.value--;
}

function formatDuree(minutes) {
  if (!minutes) return 'Durée non précisée';
  const heures = Math.floor(minutes / 60);
  const minutesRestantes = minutes % 60;
  return `${heures}h${minutesRestantes.toString().padStart(2, '0')}`;
}

onMounted(async () => {
  try {
    const response = await axios.get('http://localhost:3000/lot-de-films', {
      params: criteresRecherche()
    });
    films.value = response.data;
    chargerLotSiBesoin(); // on lance direct le remplissage de la réserve en fond
  } catch (e) {
    erreur.value = 'Aucun film ne correspond à ces critères. Essaie d\'élargir tes filtres.';
  }
});
</script>

<template>
  <div v-if="erreur">
    <p>{{ erreur }}</p>
  </div>
  <div v-else-if="films.length > 0">
    <img :src="films[indexActuel].posterUrl" alt="affiche du film" />
    <h1>{{ films[indexActuel].title }}</h1>
    <p>{{ films[indexActuel].rating.toFixed(1) }} / 5 ⭐</p>
    <p>{{ films[indexActuel].overview }}</p>
    <p>{{ films[indexActuel].genres.join(', ') }}</p>
    <p>{{ formatDuree(films[indexActuel].runtime) }}</p>
    <button @click="filmPrecedent">◀ Précédent</button>
    <button @click="filmSuivant">Suivant ▶</button>
  </div>
  <div v-else>
    <p>Chargement...</p>
  </div>
</template>