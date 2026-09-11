<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const etapeActuelle = ref(0);

const moodChoisi = ref(null);
const noteChoisie = ref(null);
const dureeChoisie = ref(null);

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
  { value: 'court', label: "Court (moins d'1h40)" },
  { value: 'normal', label: 'Normal (1h41 à 2h30)' },
  { value: 'long', label: 'Long (plus de 2h30)' }
];

const etapes = [
  { titre: 'Ton mood ce soir ?', options: moods, modele: moodChoisi },
  { titre: 'T\'attends quoi niveau qualité ?', options: notes, modele: noteChoisie },
  { titre: 'Combien de temps t\'as devant toi ?', options: durees, modele: dureeChoisie }
];

const etape = computed(() => etapes[etapeActuelle.value]);
const derniereEtape = computed(() => etapeActuelle.value === etapes.length - 1);
const peutAvancer = computed(() => etape.value.modele.value !== null);

function choisir(valeur) {
  etape.value.modele.value = valeur;
}

function suivant() {
  if (!peutAvancer.value) return;
  if (derniereEtape.value) {
    commencerRecherche();
  } else {
    etapeActuelle.value++;
  }
}

function precedent() {
  if (etapeActuelle.value > 0) etapeActuelle.value--;
}

function commencerRecherche() {
  const note = tranchesNote[noteChoisie.value];
  const duree = tranchesDuree[dureeChoisie.value];

  router.push({
    name: 'resultats',
    query: {
      mood: moodChoisi.value,
      noteMin: note.min,
      noteMax: note.max,
      dureeMin: duree.min,
      dureeMax: duree.max
    }
  });
}
</script>

<template>
  <div class="ecran">
    <div class="progression">
      <span
        v-for="(e, i) in etapes"
        :key="i"
        class="point"
        :class="{ actif: i === etapeActuelle, fait: i < etapeActuelle }"
      />
    </div>

    <h1 class="titre">{{ etape.titre }}</h1>

    <div class="options">
      <button
        v-for="opt in etape.options"
        :key="opt.value"
        class="option"
        :class="{ selectionne: etape.modele.value === opt.value }"
        @click="choisir(opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>

    <div class="nav">
      <button v-if="etapeActuelle > 0" class="btn-retour" @click="precedent">← Retour</button>
      <button
        class="btn-suivant"
        :disabled="!peutAvancer"
        @click="suivant"
      >
        {{ derniereEtape ? 'Trouver mon film' : 'Suivant' }}
      </button>
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
  padding: 24px 20px 32px;
  font-family: 'Helvetica Neue', Arial, sans-serif;
  box-sizing: border-box;
}

.progression {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-bottom: 40px;
}

.point {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #2c3440;
  transition: background 0.2s;
}

.point.actif {
  background: #00e054;
}

.point.fait {
  background: #456;
}

.titre {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.3;
  margin-bottom: 32px;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

.option {
  background: #1c2228;
  border: 1px solid #2c3440;
  color: #9ab;
  border-radius: 8px;
  padding: 16px;
  font-size: 16px;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.option:active {
  transform: scale(0.98);
}

.option.selectionne {
  border-color: #00e054;
  color: #ffffff;
  background: #1a2620;
}

.nav {
  display: flex;
  gap: 12px;
  margin-top: 32px;
}

.btn-retour {
  background: transparent;
  border: none;
  color: #678;
  font-size: 14px;
  padding: 14px 8px;
  cursor: pointer;
}

.btn-suivant {
  flex: 1;
  background: #00e054;
  border: none;
  color: #14181c;
  font-weight: 700;
  font-size: 16px;
  padding: 14px;
  border-radius: 8px;
  cursor: pointer;
}

.btn-suivant:disabled {
  background: #2c3440;
  color: #678;
  cursor: not-allowed;
}
</style>