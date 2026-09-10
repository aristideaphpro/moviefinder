require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();
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
  marrant: {
    genres: [35],
    keywords: [322268, 320420, 8201, 9253]
  },
  flippant: {
    genres: [27, 53],
    keywords: [315058, 288394, 272553, 6152]
  },
  emouvant: {
    genres: [18],
    keywords: [365954, 156924, 6054, 6203]
  },
  reflexion: {
    genres: [878, 9648],
    keywords: [212737, 4565, 295182, 378084]
  },
  adrenaline: {
    genres: [28, 12],
    keywords: [3713, 10051, 10349, 779]
  },
  feelgood: {
    genres: [10749, 16],
    keywords: [275276, 334465, 18035, 335803]
  }
};

app.get('/', (req, res) => {
    res.send('Backend MovieFinder en ligne !');
});

app.get('/test-film', async (req, res) => {
  try {
    const genre = req.query.genre || '35';
    let films = [];
    let tentatives = 0;

    while (films.length === 0 && tentatives < 5) {
      const pageAleatoire = Math.floor(Math.random() * 100) + 1;

      const response = await axios.get('https://api.themoviedb.org/3/discover/movie', {
        headers: {
          Authorization: `Bearer ${process.env.TMDB_TOKEN}`
        },
        params: {
          language: 'fr-FR',
          with_genres: genre,
          page: pageAleatoire,
          'vote_count.gte': 20,
          'vote_average.gte': 1
        }
      });

      films = response.data.results;
      tentatives++;
    }

    if (films.length === 0) {
      return res.status(404).json({ error: 'Aucun film trouvé après plusieurs essais' });
    }

    const indexAleatoire = Math.floor(Math.random() * films.length);
    const film = films[indexAleatoire];

    const filmFormate = {
      id: film.id,
      title: film.title,
      year: film.release_date.slice(0, 4),
      overview: film.overview,
      posterUrl: `https://image.tmdb.org/t/p/w500${film.poster_path}`,
      genres: film.genre_ids.map(id => genresTMDB[id]),
      rating: film.vote_average / 2
    };

    res.json(filmFormate);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de l\'appel à TMDB' });
  }
});

app.get('/film-par-mood', async (req, res) => {
  try {
    const moodChoisi = req.query.mood;
    const mood = moodsTMDB[moodChoisi];

    if (!mood) {
      return res.status(400).json({ error: 'Mood inconnu' });
    }

    const genresString = mood.genres.join('|');
    const keywordsString = mood.keywords.join('|');

    const pageAleatoire = Math.floor(Math.random() * 50) + 1;

    const [reponseGenres, reponseKeywords] = await Promise.all([
      axios.get('https://api.themoviedb.org/3/discover/movie', {
        headers: { Authorization: `Bearer ${process.env.TMDB_TOKEN}` },
        params: {
          language: 'fr-FR',
          with_genres: genresString,
          page: pageAleatoire,
          'vote_count.gte': 20,
          'vote_average.gte': 1
        }
      }),
      axios.get('https://api.themoviedb.org/3/discover/movie', {
        headers: { Authorization: `Bearer ${process.env.TMDB_TOKEN}` },
        params: {
          language: 'fr-FR',
          with_keywords: keywordsString,
          page: pageAleatoire,
          'vote_count.gte': 20,
          'vote_average.gte': 1
        }
      })
    ]);

    const films = [...reponseGenres.data.results, ...reponseKeywords.data.results];

    if (films.length === 0) {
      return res.status(404).json({ error: 'Aucun film trouvé pour ce mood' });
    }

    const indexAleatoire = Math.floor(Math.random() * films.length);
    const film = films[indexAleatoire];

    const filmFormate = {
      id: film.id,
      title: film.title,
      year: film.release_date.slice(0, 4),
      overview: film.overview,
      posterUrl: `https://image.tmdb.org/t/p/w500${film.poster_path}`,
      genres: film.genre_ids.map(id => genresTMDB[id]),
      rating: film.vote_average / 2
    };

    res.json(filmFormate);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de l\'appel à TMDB' });
  }
});

app.get('/test-keyword', async (req, res) => {
  try {
    const response = await axios.get('https://api.themoviedb.org/3/search/keyword', {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_TOKEN}`
      },
      params: {
        query: req.query.q
      }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la recherche du mot-clé' });
  }
});

app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});