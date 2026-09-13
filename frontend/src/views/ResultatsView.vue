<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';

const route = useRoute();
const router = useRouter();

const films = ref([]);
const indexActuel = ref(0);
const erreur = ref(null);
const chargementEnCours = ref(false);
const nombreCote = ref(0);
const panneauOuvert = ref(false);

const SEUIL_RECHARGE = 15;
const RESERVE_CIBLE = 25;
const SEUIL_SWIPE = 100;
const DEUX_JOURS_MS = 2 * 24 * 60 * 60 * 1000;

const enTrain = ref(false);
const deltaX = ref(0);
const deltaY = ref(0);
const origineX = ref(0);
const origineY = ref(0);
const directionSortie = ref(null);

// --- Panneau de filtres ---
const tranchesNote = {
  peuImporte: { min: 0, max: 5 },
  mauvais: { min: 0, max: 2.8 },
  moyen: { min: 2.9, max: 4 },
  bon: { min: 4, max: 5 }
};

const tranchesDuree = {
  peuImporte: { min: null, max: null },
  court: { min: null, max: 100 },
  normal: { min: 100, max: 150 },
  long: { min: 150, max: null }
};

const seuilsPopu = {
  peuImporte: null,
  connus: 20,
  tresPopulaires: 50
};

function retrouverClePartirValeurs(table, min, max) {
  const trouve = Object.entries(table).find(([, v]) => String(v.min) === String(min) && String(v.max) === String(max));
  return trouve ? trouve[0] : 'peuImporte';
}

function retrouverClePopu(popuMin) {
  const trouve = Object.entries(seuilsPopu).find(([, v]) => String(v) === String(popuMin));
  return trouve ? trouve[0] : 'peuImporte';
}

const moods = [
  { value: 'peuImporte', label: 'Peu importe' },
  { value: 'marrant', label: 'Marrant' },
  { value: 'flippant', label: 'Flippant' },
  { value: 'emouvant', label: 'Émouvant' },
  { value: 'reflexion', label: 'Qui fait réfléchir' },
  { value: 'adrenaline', label: 'Adrénaline' },
  { value: 'feelgood', label: 'Feel-good' }
];

const notes = [
  { value: 'peuImporte', label: 'Peu importe' },
  { value: 'mauvais', label: 'Une grosse merde pour rire' },
  { value: 'moyen', label: 'Un truc sympa, sans prise de tête' },
  { value: 'bon', label: 'Un truc vraiment bien' }
];

const durees = [
  { value: 'peuImporte', label: 'Peu importe' },
  { value: 'court', label: "Court (< 1h40)" },
  { value: 'normal', label: 'Normal (1h40-2h30)' },
  { value: 'long', label: 'Long (> 2h30)' }
];

const plateformesDisponibles = [
  { value: 'Netflix', label: 'Netflix' },
  { value: 'Disney Plus', label: 'Disney+' },
  { value: 'Amazon Prime Video', label: 'Prime Video' },
  { value: 'Apple TV Plus', label: 'Apple TV+' },
  { value: 'Canal+', label: 'Canal+' },
  { value: 'Paramount Plus', label: 'Paramount+' },
  { value: 'Max', label: 'Max (ex HBO)' },
  { value: 'MUBI', label: 'Mubi' },
  { value: 'Crunchyroll', label: 'Crunchyroll' }
];

const decenniesDisponibles = [
  { value: 1970, label: '70s' },
  { value: 1980, label: '80s' },
  { value: 1990, label: '90s' },
  { value: 2000, label: '2000s' },
  { value: 2010, label: '2010s' },
  { value: 2020, label: '2020s' }
];

const popularites = [
  { value: 'peuImporte', label: 'Peu importe' },
  { value: 'connus', label: 'Films connus' },
  { value: 'tresPopulaires', label: 'Uniquement les plus populaires' }
];

const moodPanneau = ref(route.query.mood || 'peuImporte');
const notePanneau = ref(retrouverClePartirValeurs(tranchesNote, route.query.noteMin, route.query.noteMax));
const dureePanneau = ref(retrouverClePartirValeurs(tranchesDuree, route.query.dureeMin, route.query.dureeMax));
const plateformesPanneau = ref(route.query.plateformes ? route.query.plateformes.split(',').filter(Boolean) : []);
const decenniesPanneau = ref(route.query.decennies ? route.query.decennies.split(',').map(Number).filter(Boolean) : []);
const popuPanneau = ref(retrouverClePopu(route.query.popuMin));

function togglePlateformePanneau(valeur) {
  const index = plateformesPanneau.value.indexOf(valeur);
  if (index === -1) {
    plateformesPanneau.value.push(valeur);
  } else {
    plateformesPanneau.value.splice(index, 1);
  }
}

function toggleDecenniePanneau(valeur) {
  const index = decenniesPanneau.value.indexOf(valeur);
  if (index === -1) {
    decenniesPanneau.value.push(valeur);
  } else {
    decenniesPanneau.value.splice(index, 1);
  }
}

async function appliquerFiltres() {
  const note = tranchesNote[notePanneau.value];
  const duree = tranchesDuree[dureePanneau.value];

  await router.replace({
    name: 'resultats',
    query: {
      mood: moodPanneau.value,
      noteMin: note.min,
      noteMax: note.max,
      dureeMin: duree.min,
      dureeMax: duree.max,
      plateformes: plateformesPanneau.value.join(','),
      decennies: decenniesPanneau.value.join(','),
      popuMin: seuilsPopu[popuPanneau.value]
    }
  });

  panneauOuvert.value = false;
  films.value = [];
  indexActuel.value = 0;
  erreur.value = null;
  await chargerPremierLot();
}

// --- Logique existante ---
function lireCoteValide() {
  const brut = localStorage.getItem('moviefinder_cote');
  const liste = brut ? JSON.parse(brut) : [];
  const maintenant = Date.now();
  const valides = liste.filter(f => maintenant - f.aimeLe < DEUX_JOURS_MS);

  if (valides.length !== liste.length) {
    localStorage.setItem('moviefinder_cote', JSON.stringify(valides));
  }

  return valides;
}

function ajouterAuCote(film) {
  const liste = lireCoteValide();
  if (liste.some(f => f.id === film.id)) return;

  liste.push({
    id: film.id,
    title: film.title,
    year: film.year,
    posterUrl: film.posterUrl,
    aimeLe: Date.now()
  });

  localStorage.setItem('moviefinder_cote', JSON.stringify(liste));
  nombreCote.value = liste.length;
}

function criteresRecherche() {
  return {
    mood: route.query.mood,
    noteMin: route.query.noteMin,
    noteMax: route.query.noteMax,
    dureeMin: route.query.dureeMin,
    dureeMax: route.query.dureeMax,
    plateformes: route.query.plateformes,
    decennies: route.query.decennies,
    popuMin: route.query.popuMin,
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
      if (response.data.length === 0) break;
      films.value = [...films.value, ...response.data];
    }
  } catch (e) {
    console.log('Pas de nouveau lot disponible pour le moment');
  } finally {
    chargementEnCours.value = false;
  }
}

async function chargerPremierLot() {
  try {
    const response = await axios.get('http://localhost:3000/lot-de-films', {
      params: criteresRecherche()
    });
    films.value = response.data;
    chargerLotSiBesoin();
  } catch (e) {
    erreur.value = 'Aucun film ne correspond à ces critères. Essaie d\'élargir tes filtres.';
  }
}

function filmSuivant(aime) {
  if (aime) {
    ajouterAuCote(films.value[indexActuel.value]);
  }
  if (indexActuel.value < films.value.length - 1) {
    indexActuel.value++;
  }
  chargerLotSiBesoin();
}

function passer() {
  animerSortie('gauche', () => filmSuivant(false));
}

function aimer() {
  animerSortie('droite', () => filmSuivant(true));
}

function animerSortie(direction, callback) {
  directionSortie.value = direction;
  setTimeout(() => {
    directionSortie.value = null;
    deltaX.value = 0;
    deltaY.value = 0;
    callback();
  }, 250);
}

function debuterDrag(event) {
  enTrain.value = true;
  const point = event.touches ? event.touches[0] : event;
  origineX.value = point.clientX;
  origineY.value = point.clientY;
}

function bougerDrag(event) {
  if (!enTrain.value) return;
  const point = event.touches ? event.touches[0] : event;
  deltaX.value = point.clientX - origineX.value;
  deltaY.value = point.clientY - origineY.value;
}

function terminerDrag() {
  if (!enTrain.value) return;
  enTrain.value = false;

  if (deltaX.value > SEUIL_SWIPE) {
    aimer();
  } else if (deltaX.value < -SEUIL_SWIPE) {
    passer();
  } else {
    deltaX.value = 0;
    deltaY.value = 0;
  }
}

function formatDuree(minutes) {
  if (!minutes) return 'Durée non précisée';
  const heures = Math.floor(minutes / 60);
  const minutesRestantes = minutes % 60;
  return `${heures}h${minutesRestantes.toString().padStart(2, '0')}`;
}

function allerAuCote() {
  router.push({ name: 'cote' });
}

function normaliserPlateforme(nom) {
  const n = nom.toLowerCase();
  if (n.includes('netflix')) return 'Netflix';
  if (n.includes('disney')) return 'Disney+';
  if (n.includes('amazon') || n.includes('prime')) return 'Prime Video';
  if (n.includes('apple')) return 'Apple TV+';
  if (n.includes('paramount')) return 'Paramount+';
  if (n.includes('max')) return 'Max';
  if (n.includes('canal')) return 'Canal+';
  if (n.includes('mubi')) return 'Mubi';
  if (n.includes('crunchyroll')) return 'Crunchyroll';
  return nom;
}

const platformsAffiches = computed(() => {
  if (!films.value[indexActuel.value]) return [];
  const brut = films.value[indexActuel.value].platforms || [];
  const normalisees = brut.map(normaliserPlateforme);
  return [...new Set(normalisees)].slice(0, 3); // Set = supprime les doublons après normalisation
});

onMounted(async () => {
  nombreCote.value = lireCoteValide().length;
  await chargerPremierLot();
});
</script>

<template>
  <div class="ecran">
    <div class="barre-haut">
      <button class="btn-reglages" @click="panneauOuvert = true">⚙</button>
    </div>

    <div v-if="erreur" class="message-erreur">
      <p>{{ erreur }}</p>
    </div>

    <div v-else-if="films.length > 0" class="zone-cards">
      <div
        class="card"
        :class="{
          'sort-gauche': directionSortie === 'gauche',
          'sort-droite': directionSortie === 'droite'
        }"
        :style="{
          transform: `translate(${deltaX}px, ${deltaY}px) rotate(${deltaX / 20}deg)`,
          transition: enTrain ? 'none' : 'transform 0.3s ease'
        }"
        @mousedown="debuterDrag"
        @mousemove="bougerDrag"
        @mouseup="terminerDrag"
        @mouseleave="terminerDrag"
        @touchstart="debuterDrag"
        @touchmove="bougerDrag"
        @touchend="terminerDrag"
      >
        <div class="badge-like" :style="{ opacity: deltaX > 20 ? Math.min(deltaX / SEUIL_SWIPE, 1) : 0 }">J'AIME</div>
        <div class="badge-pass" :style="{ opacity: deltaX < -20 ? Math.min(-deltaX / SEUIL_SWIPE, 1) : 0 }">PASSE</div>

        <img class="poster" :src="films[indexActuel].posterUrl" alt="affiche du film" draggable="false" />

        <div class="infos">
          <h1 class="titre">{{ films[indexActuel].title }}</h1>
          <p class="meta">{{ films[indexActuel].year }} · {{ formatDuree(films[indexActuel].runtime) }}</p>
          <p class="genres">{{ films[indexActuel].genres.join(' · ') }}</p>
          <div v-if="platformsAffiches.length > 0" class="plateformes-card">
            <span v-for="p in platformsAffiches" :key="p" class="badge-plateforme">{{ p }}</span>
          </div>
          <p class="synopsis">{{ films[indexActuel].overview }}</p>
        </div>
      </div>

      <div class="boutons">
        <button class="btn-passer" @click="passer">✕</button>
        <button class="btn-aimer" @click="aimer">♥</button>
      </div>

      <button v-if="nombreCote > 0" class="lien-cote" @click="allerAuCote">
        ♥ {{ nombreCote }} film{{ nombreCote > 1 ? 's' : '' }} de côté
      </button>
    </div>

    <div v-else class="chargement">
      <p>Chargement...</p>
    </div>

    <div v-if="panneauOuvert" class="overlay" @click.self="panneauOuvert = false">
      <div class="panneau">
        <h2 class="titre-panneau">Filtres</h2>

        <p class="label-section">Mood</p>
        <div class="options-panneau">
          <button
            v-for="opt in moods"
            :key="opt.value"
            class="chip"
            :class="{ selectionne: moodPanneau === opt.value }"
            @click="moodPanneau = opt.value"
          >{{ opt.label }}</button>
        </div>

        <p class="label-section">Note</p>
        <div class="options-panneau">
          <button
            v-for="opt in notes"
            :key="opt.value"
            class="chip"
            :class="{ selectionne: notePanneau === opt.value }"
            @click="notePanneau = opt.value"
          >{{ opt.label }}</button>
        </div>

        <p class="label-section">Durée</p>
        <div class="options-panneau">
          <button
            v-for="opt in durees"
            :key="opt.value"
            class="chip"
            :class="{ selectionne: dureePanneau === opt.value }"
            @click="dureePanneau = opt.value"
          >{{ opt.label }}</button>
        </div>

        <p class="label-section">Époque</p>
        <div class="options-panneau">
          <button
            v-for="opt in decenniesDisponibles"
            :key="opt.value"
            class="chip"
            :class="{ selectionne: decenniesPanneau.includes(opt.value) }"
            @click="toggleDecenniePanneau(opt.value)"
          >{{ opt.label }}</button>
        </div>

        <p class="label-section">Popularité</p>
        <div class="options-panneau">
          <button
            v-for="opt in popularites"
            :key="opt.value"
            class="chip"
            :class="{ selectionne: popuPanneau === opt.value }"
            @click="popuPanneau = opt.value"
          >{{ opt.label }}</button>
        </div>

        <p class="label-section">Plateformes</p>
        <div class="options-panneau">
          <button
            v-for="opt in plateformesDisponibles"
            :key="opt.value"
            class="chip"
            :class="{ selectionne: plateformesPanneau.includes(opt.value) }"
            @click="togglePlateformePanneau(opt.value)"
          >{{ opt.label }}</button>
        </div>

        <button class="btn-appliquer" @click="appliquerFiltres">Appliquer</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ecran {
  min-height: 100vh;
  background: #14181c;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 16px 32px;
  font-family: 'Helvetica Neue', Arial, sans-serif;
  box-sizing: border-box;
}

.barre-haut {
  width: 100%;
  max-width: 420px;
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.btn-reglages {
  background: #1c2228;
  border: 1px solid #2c3440;
  color: #9ab;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-size: 18px;
  cursor: pointer;
}

.message-erreur,
.chargement {
  margin-top: 40vh;
  color: #9ab;
  text-align: center;
}

.zone-cards {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 420px;
}

.card {
  position: relative;
  width: 100%;
  height: 70vh;
  max-height: 640px;
  background: #1c2228;
  border: 1px solid #2c3440;
  border-radius: 16px;
  overflow: hidden;
  cursor: grab;
  user-select: none;
  touch-action: none;
  display: flex;
  flex-direction: column;
}

.card.sort-gauche {
  transform: translate(-600px, 0) rotate(-30deg) !important;
  opacity: 0;
}

.card.sort-droite {
  transform: translate(600px, 0) rotate(30deg) !important;
  opacity: 0;
}

.poster {
  width: 100%;
  height: 55%;
  flex-shrink: 0;
  object-fit: cover;
  object-position: top;
  display: block;
  pointer-events: none;
}

.infos {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

.titre {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 4px;
}

.meta {
  color: #9ab;
  font-size: 14px;
  margin: 0 0 8px;
}

.genres {
  color: #00e054;
  font-size: 13px;
  font-weight: 600;
  margin: 0 0 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.plateformes-card {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.badge-plateforme {
  background: #2c3440;
  color: #ccd;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 6px;
}

.synopsis {
  font-size: 14px;
  line-height: 1.5;
  color: #ccd;
  margin: 0;
}

.badge-like,
.badge-pass {
  position: absolute;
  top: 24px;
  z-index: 2;
  font-size: 22px;
  font-weight: 800;
  padding: 6px 14px;
  border-radius: 8px;
  border: 3px solid;
  transform: rotate(-15deg);
  pointer-events: none;
}

.badge-like {
  right: 20px;
  color: #00e054;
  border-color: #00e054;
  transform: rotate(15deg);
}

.badge-pass {
  left: 20px;
  color: #ff4444;
  border-color: #ff4444;
}

.boutons {
  display: flex;
  gap: 24px;
  margin-top: 24px;
  flex-shrink: 0;
}

.btn-passer,
.btn-aimer {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: none;
  font-size: 26px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-passer {
  background: #1c2228;
  border: 2px solid #ff4444;
  color: #ff4444;
}

.btn-aimer {
  background: #1c2228;
  border: 2px solid #00e054;
  color: #00e054;
}

.lien-cote {
  margin-top: 16px;
  background: none;
  border: none;
  color: #9ab;
  font-size: 14px;
  cursor: pointer;
  text-decoration: underline;
}

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 10;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.panneau {
  width: 100%;
  max-width: 420px;
  background: #1c2228;
  border-radius: 0 0 16px 16px;
  padding: 20px;
  max-height: 85vh;
  overflow-y: auto;
  animation: glisser 0.25s ease;
}

@keyframes glisser {
  from { transform: translateY(-100%); }
  to { transform: translateY(0); }
}

.titre-panneau {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 16px;
}

.label-section {
  color: #9ab;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 16px 0 8px;
}

.options-panneau {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  background: #14181c;
  border: 1px solid #2c3440;
  color: #9ab;
  border-radius: 20px;
  padding: 8px 14px;
  font-size: 13px;
  cursor: pointer;
}

.chip.selectionne {
  border-color: #00e054;
  color: #ffffff;
  background: #1a2620;
}

.btn-appliquer {
  width: 100%;
  background: #00e054;
  border: none;
  color: #14181c;
  font-weight: 700;
  font-size: 16px;
  padding: 14px;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 24px;
}
</style>