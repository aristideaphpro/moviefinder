<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const filmsCote = ref([]);

const DEUX_JOURS_MS = 2 * 24 * 60 * 60 * 1000;

function chargerCote() {
  const brut = localStorage.getItem('moviefinder_cote');
  const liste = brut ? JSON.parse(brut) : [];
  const maintenant = Date.now();
  const valides = liste.filter(f => maintenant - f.aimeLe < DEUX_JOURS_MS);

  if (valides.length !== liste.length) {
    localStorage.setItem('moviefinder_cote', JSON.stringify(valides));
  }

  filmsCote.value = valides;
}

function retirer(id) {
  const nouvelleListe = filmsCote.value.filter(f => f.id !== id);
  localStorage.setItem('moviefinder_cote', JSON.stringify(nouvelleListe));
  filmsCote.value = nouvelleListe;
}

function retour() {
  router.back();
}

onMounted(chargerCote);
</script>

<template>
  <div class="ecran">
    <div class="entete">
      <button class="btn-retour" @click="retour">← Retour</button>
      <h1 class="titre-page">Mis de côté</h1>
    </div>

    <p class="note-expiration">Conservés 2 jours</p>

    <div v-if="filmsCote.length === 0" class="vide">
      <p>Aucun film de côté pour l'instant.</p>
    </div>

    <div v-else class="liste">
      <div v-for="film in filmsCote" :key="film.id" class="ligne-film">
        <img :src="film.posterUrl" :alt="film.title" class="mini-poster" />
        <div class="info-film">
          <p class="titre-film">{{ film.title }}</p>
          <p class="annee-film">{{ film.year }}</p>
        </div>
        <button class="btn-retirer" @click="retirer(film.id)">✕</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ecran {
  min-height: 100vh;
  background: #14181c;
  color: #ffffff;
  padding: 24px 16px 32px;
  font-family: 'Helvetica Neue', Arial, sans-serif;
  box-sizing: border-box;
}

.entete {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 4px;
}

.btn-retour {
  background: none;
  border: none;
  color: #9ab;
  font-size: 14px;
  cursor: pointer;
}

.titre-page {
  font-size: 22px;
  font-weight: 700;
  margin: 0;
}

.note-expiration {
  color: #678;
  font-size: 13px;
  margin: 0 0 24px;
}

.vide {
  color: #9ab;
  text-align: center;
  margin-top: 60px;
}

.liste {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 420px;
}

.ligne-film {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #1c2228;
  border: 1px solid #2c3440;
  border-radius: 10px;
  padding: 8px;
}

.mini-poster {
  width: 48px;
  height: 72px;
  object-fit: cover;
  border-radius: 6px;
  flex-shrink: 0;
}

.info-film {
  flex: 1;
}

.titre-film {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 2px;
}

.annee-film {
  font-size: 13px;
  color: #9ab;
  margin: 0;
}

.btn-retirer {
  background: none;
  border: none;
  color: #ff4444;
  font-size: 18px;
  cursor: pointer;
  padding: 8px;
}
</style>