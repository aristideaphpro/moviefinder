require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
    res.send('Backend MovieFinder en ligne !');
});

app.get('/test-film', async (req, res) => {
    try {
        const response = await axios.get('https://api.themoviedb.org/3/movie/157336', {
            headers: {
                Authorization: `Bearer ${process.env.TMDB_TOKEN}`
            },
            params: {
                language: 'fr-FR'
            }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de l\'appel à TMDB' });
    }
});

app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});