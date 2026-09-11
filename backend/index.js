require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
app.use(cors());
const PORT = 3000;

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
    const dureeMax = req.query.dureeMax ? parseInt(req.query.dureeMax) : null;
    const dureeMin = req.query.dureeMin ? parseInt(req.query.dureeMin) : null;
    const filtreDureeActif = dureeMax !== null || dureeMin !== null;
    const noteMin = req.query.noteMin ? parseFloat(req.query.noteMin) * 2 : 0;
    const noteMax = req.query.noteMax ? parseFloat(req.query.noteMax) * 2 : 10;
    const tailleLot = 10;
    const idsExclus = req.query.exclure ? req.query.exclure.split(',').map(Number) : [];

    if (!moodEstLibre && !mood) {
      return res.status(400).json({ error: 'Mood inconnu' });
    }

    const pagesAleatoires = [];
    for (let i = 0; i < 3; i++) {
      pagesAleatoires.push(Math.floor(Math.random() * 50) + 1);
    }

    let appelsDiscover;

    if (moodEstLibre) {
      appelsDiscover = pagesAleatoires.map(page =>
        axios.get('https://api.themoviedb.org/3/discover/movie', {
          headers: { Authorization: `Bearer ${process.env.TMDB_TOKEN}` },
          params: {
            language: 'fr-FR',
            page: page,
            'vote_count.gte': 10,
            'vote_average.gte': noteMin,
            'vote_average.lte': noteMax
          }
        }).catch(() => null)
      );
    } else {
      const genresString = mood.genres.join('|');
      const keywordsString = mood.keywords.join('|');

      const appelsGenres = pagesAleatoires.map(page =>
        axios.get('https://api.themoviedb.org/3/discover/movie', {
          headers: { Authorization: `Bearer ${process.env.TMDB_TOKEN}` },
          params: {
            language: 'fr-FR',
            with_genres: genresString,
            page: page,
            'vote_count.gte': 10,
            'vote_average.gte': noteMin,
            'vote_average.lte': noteMax
          }
        }).catch(() => null)
      );

      const appelsKeywords = pagesAleatoires.map(page =>
        axios.get('https://api.themoviedb.org/3/discover/movie', {
          headers: { Authorization: `Bearer ${process.env.TMDB_TOKEN}` },
          params: {
            language: 'fr-FR',
            with_keywords: keywordsString,
            page: page,
            'vote_count.gte': 10,
            'vote_average.gte': noteMin,
            'vote_average.lte': noteMax
          }
        }).catch(() => null)
      );

      appelsDiscover = [...appelsGenres, ...appelsKeywords];
    }

    const toutesLesReponses = (await Promise.all(appelsDiscover)).filter(r => r !== null);

    let candidats = [];
    for (const reponse of toutesLesReponses) {
      candidats = [...candidats, ...reponse.data.results];
    }

    const idsVus = new Set();
    candidats = candidats.filter(film => {
      if (idsVus.has(film.id)) return false;
      if (idsExclus.includes(film.id)) return false;
      idsVus.add(film.id);
      return true;
    });

    if (candidats.length === 0) {
      return res.status(404).json({ error: 'Aucun film trouvé pour ces critères' });
    }

    candidats = candidats.sort(() => Math.random() - 0.5);

    let lotFinal = [];

    if (!filtreDureeActif) {
      // Pas de filtre durée : pas besoin d'appel détail, on utilise direct les données du discover
      lotFinal = candidats.slice(0, tailleLot).map(film => ({
        id: film.id,
        title: film.title,
        year: film.release_date ? film.release_date.slice(0, 4) : '',
        overview: film.overview,
        posterUrl: `https://image.tmdb.org/t/p/w500${film.poster_path}`,
        runtime: null,
        genres: film.genre_ids.map(id => genresTMDB[id]).filter(Boolean),
        rating: film.vote_average / 2
      }));
    } else {
      // Filtre durée actif : là on a besoin de l'appel détail pour connaître le runtime
      const candidatsAExaminer = candidats.slice(0, 15);

      const reponsesDetail = await Promise.all(
        candidatsAExaminer.map(candidat =>
          axios.get(`https://api.themoviedb.org/3/movie/${candidat.id}`, {
            headers: { Authorization: `Bearer ${process.env.TMDB_TOKEN}` },
            params: { language: 'fr-FR' }
          }).catch(() => null)
        )
      );

      for (const reponseDetail of reponsesDetail) {
        if (lotFinal.length >= tailleLot) break;
        if (!reponseDetail) continue;

        const filmDetail = reponseDetail.data;
        const runtime = filmDetail.runtime;

        const respecteMin = dureeMin ? runtime >= dureeMin : true;
        const respecteMax = dureeMax ? runtime <= dureeMax : true;

        if (respecteMin && respecteMax) {
          lotFinal.push({
            id: filmDetail.id,
            title: filmDetail.title,
            year: filmDetail.release_date.slice(0, 4),
            overview: filmDetail.overview,
            posterUrl: `https://image.tmdb.org/t/p/w500${filmDetail.poster_path}`,
            runtime: filmDetail.runtime,
            genres: filmDetail.genres.map(g => g.name),
            rating: filmDetail.vote_average / 2
          });
        }
      }
    }

    res.json(lotFinal);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de l\'appel à TMDB' });
  }
});

app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});