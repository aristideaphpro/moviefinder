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

app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});