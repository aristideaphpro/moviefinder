<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const moodChoisi = ref('adrenaline');
const noteChoisie = ref('mauvais');
const dureeChoisie = ref('peuImporte');

const tranchesNote = {
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
  <div>
    <h1>Quoi voir ce soir ?</h1>

    <h2>Mood</h2>
    <select v-model="moodChoisi">
      <option value="marrant">Marrant</option>
      <option value="flippant">Flippant</option>
      <option value="emouvant">Émouvant</option>
      <option value="reflexion">Qui fait réfléchir</option>
      <option value="adrenaline">Adrénaline</option>
      <option value="feelgood">Feel-good</option>
    </select>

    <h2>Note</h2>
    <label>
      <input type="radio" v-model="noteChoisie" value="mauvais" />
      Une grosse merde pour rire
    </label>
    <label>
      <input type="radio" v-model="noteChoisie" value="moyen" />
      Un truc sympa, sans prise de tête
    </label>
    <label>
      <input type="radio" v-model="noteChoisie" value="bon" />
      Un truc vraiment bien
    </label>

    <h2>Durée</h2>
    <label>
      <input type="radio" v-model="dureeChoisie" value="peuImporte" />
      Peu importe
    </label>
    <label>
      <input type="radio" v-model="dureeChoisie" value="court" />
      Court (moins d'1h40)
    </label>
    <label>
      <input type="radio" v-model="dureeChoisie" value="normal" />
      Normal (1h41 à 2h30)
    </label>
    <label>
      <input type="radio" v-model="dureeChoisie" value="long" />
      Long (plus de 2h30)
    </label>

    <button @click="commencerRecherche">Commencer à chercher mon film</button>
  </div>
</template>