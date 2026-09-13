require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();
app.use(cors());
const PORT = 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const genresTMDB = {
    28: "Action",
    12: "Aventure",
    16: "Animation",
    35: "Comédie",
    80: "Crime",
    99: "Documentaire",
    18: "Drame",
    10751: "Famille",
    14: "Fantastique",
    36: "Histoire",
    27: "Horreur",
    10402: "Musique",
    9648: "Mystère",
    10749: "Romance",
    878: "Science-Fiction",
    10770: "Téléfilm",
    53: "Thriller",
    10752: "Guerre",
    37: "Western"
};

const moodsTMDB = {
  marrant: { genres: [35], keywords: [322268, 320420, 8201, 9253] },
  flippant: { genres: [27, 53], keywords: [315058, 288394, 272553, 6152] },
  emouvant: { genres: [18], keywords: [365954, 156924, 6054, 6203] },
  reflexion: { genres: [878, 9648], keywords: [212737, 4565, 295182, 378084] },
  adrenaline: { genres: [28, 12], keywords: [3713, 10051, 10349, 779] },
  feelgood: { genres: [10749, 16], keywords: [275276, 334465, 18035, 335803] }
};

app.get('/', (req, res) => {
    res.send('Backend MovieFinder en ligne !');
});

app.get('/lot-de-films', async (req, res) => {
  try {
    const moodChoisi = req.query.mood;
    const moodEstLibre = !moodChoisi || moodChoisi === 'peuImporte';
    const mood = moodEstLibre ? null : moodsTMDB[moodChoisi];

    if (!moodEstLibre && !mood) {
      return res.status(400).json({ error: 'Mood inconnu' });
    }

    const dureeMax = req.query.dureeMax ? parseInt(req.query.dureeMax) : null;
    const dureeMin = req.query.dureeMin ? parseInt(req.query.dureeMin) : null;
    const noteMin = req.query.noteMin ? parseFloat(req.query.noteMin) : 0;
    const noteMax = req.query.noteMax ? parseFloat(req.query.noteMax) : 5;
    const idsExclus = req.query.exclure ? req.query.exclure.split(',').map(Number) : [];
    const plateformes = req.query.plateformes ? req.query.plateformes.split(',').filter(Boolean) : [];
    const decennies = req.query.decennies ? req.query.decennies.split(',').map(Number) : [];
    const popuMin = req.query.popuMin ? parseFloat(req.query.popuMin) : null;
    const tailleLot = 10;

    const conditions = ['rating >= $1', 'rating <= $2'];
    const valeurs = [noteMin, noteMax];

    if (dureeMin) {
      valeurs.push(dureeMin);
      conditions.push(`runtime >= $${valeurs.length}`);
    }
    if (dureeMax) {
      valeurs.push(dureeMax);
      conditions.push(`runtime <= $${valeurs.length}`);
    }
    if (idsExclus.length > 0) {
      valeurs.push(idsExclus);
      conditions.push(`id <> ALL($${valeurs.length})`);
    }
    if (!moodEstLibre) {
      valeurs.push(mood.genres);
      const indexGenres = valeurs.length;
      valeurs.push(mood.keywords);
      const indexKeywords = valeurs.length;
      conditions.push(`(genre_ids && $${indexGenres}::int[] OR keyword_ids && $${indexKeywords}::int[])`);
    }
    if (plateformes.length > 0) {
      valeurs.push(plateformes);
      conditions.push(`platforms && $${valeurs.length}::text[]`);
    }
    if (decennies.length > 0) {
      // Pour chaque décennie sélectionnée (ex. 1990), on construit "year >= 1990 AND year <= 1999"
      const conditionsDecennies = decennies.map(debut => {
        valeurs.push(debut);
        const indexDebut = valeurs.length;
        valeurs.push(debut + 9);
        const indexFin = valeurs.length;
        return `(year >= $${indexDebut} AND year <= $${indexFin})`;
      });
      conditions.push(`(${conditionsDecennies.join(' OR ')})`);
    }
    if (popuMin !== null) {
      valeurs.push(popuMin);
      conditions.push(`popularity >= $${valeurs.length}`);
    }

    const requete = `
      SELECT id, title, year, overview, poster_path, runtime, rating, genre_ids, platforms
      FROM films
      WHERE ${conditions.join(' AND ')}
      ORDER BY random()
      LIMIT ${tailleLot}
    `;

    const resultat = await pool.query(requete, valeurs);

    const lotFinal = resultat.rows.map(film => ({
      id: film.id,
      title: film.title,
      year: film.year,
      overview: film.overview,
      posterUrl: `https://image.tmdb.org/t/p/w500${film.poster_path}`,
      runtime: film.runtime,
      genres: (film.genre_ids || []).map(id => genresTMDB[id]).filter(Boolean),
      rating: parseFloat(film.rating),
      platforms: film.platforms || []
    }));

    res.json(lotFinal);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la lecture de la base' });
  }
});

app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});