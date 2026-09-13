require('dotenv').config();
const axios = require('axios');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const CONCURRENCE = 25;

async function recupererPopularite(id) {
  try {
    const reponse = await axios.get(`https://api.themoviedb.org/3/movie/${id}`, {
      headers: { Authorization: `Bearer ${process.env.TMDB_TOKEN}` },
      timeout: 10000
    });
    return reponse.data.popularity;
  } catch (e) {
    return null;
  }
}

async function main() {
  const { rows } = await pool.query('SELECT id FROM films');
  const ids = rows.map(r => r.id);
  console.log(`${ids.length} films à mettre à jour`);

  let traites = 0;

  for (let i = 0; i < ids.length; i += CONCURRENCE) {
    const lot = ids.slice(i, i + CONCURRENCE);

    await Promise.all(lot.map(async (id) => {
      const popularity = await recupererPopularite(id);
      if (popularity !== null) {
        await pool.query('UPDATE films SET popularity = $1 WHERE id = $2', [popularity, id]);
      }
    }));

    traites += lot.length;
    if (traites % 1000 === 0) {
      console.log(`${traites} / ${ids.length} traités`);
    }
  }

  console.log('Mise à jour popularité terminée !');
  await pool.end();
}

main();