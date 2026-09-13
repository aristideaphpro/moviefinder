require('dotenv').config();
const axios = require('axios');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const CONCURRENCE = 20;
const ANNEE_DEBUT = 1950;
const ANNEE_FIN = 2026;

async function recupererIdsAnnee(annee) {
  let ids = [];
  let page = 1;
  let totalPages = 1;

  do {
    let reponse;
    let tentatives = 0;

    while (!reponse && tentatives < 3) {
      try {
        reponse = await axios.get('https://api.themoviedb.org/3/discover/movie', {
          headers: { Authorization: `Bearer ${process.env.TMDB_TOKEN}` },
          params: {
            language: 'fr-FR',
            primary_release_year: annee,
            'vote_count.gte': 10,
            sort_by: 'popularity.desc',
            page
          },
          timeout: 10000
        });
      } catch (e) {
        tentatives++;
        console.log(`Erreur page ${page} année ${annee}, tentative ${tentatives}/3...`);
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    if (!reponse) {
      console.log(`Page ${page} année ${annee} abandonnée après 3 tentatives.`);
      break;
    }

    totalPages = Math.min(reponse.data.total_pages, 500);
    ids = ids.concat(reponse.data.results.map(f => f.id));
    page++;
  } while (page <= totalPages);

  return ids;
}

async function recupererTousLesIds() {
  const tousLesIds = new Set();

  for (let annee = ANNEE_DEBUT; annee <= ANNEE_FIN; annee++) {
    const ids = await recupererIdsAnnee(annee);
    ids.forEach(id => tousLesIds.add(id));
    console.log(`Année ${annee} : ${ids.length} films (total cumulé : ${tousLesIds.size})`);
  }

  return [...tousLesIds];
}

async function recupererDetailFilm(id) {
  try {
    const reponse = await axios.get(`https://api.themoviedb.org/3/movie/${id}`, {
      headers: { Authorization: `Bearer ${process.env.TMDB_TOKEN}` },
      params: {
        language: 'fr-FR',
        append_to_response: 'keywords,watch/providers'
      },
      timeout: 10000
    });
    return reponse.data;
  } catch (e) {
    return null;
  }
}

function extrairePlateformes(filmDetail) {
  const providersFR = filmDetail['watch/providers']?.results?.FR?.flatrate;
  if (!providersFR) return [];
  return providersFR.map(p => p.provider_name);
}

async function insererFilm(filmDetail) {
  if (!filmDetail || !filmDetail.release_date) return;

  const genreIds = filmDetail.genres.map(g => g.id);
  const keywordIds = (filmDetail.keywords?.keywords || []).map(k => k.id);
  const platforms = extrairePlateformes(filmDetail);
  const originCountries = filmDetail.origin_country || [];

  await pool.query(
    `INSERT INTO films (id, title, year, overview, poster_path, runtime, rating, genre_ids, keyword_ids, platforms, origin_countries, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
     ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title,
       year = EXCLUDED.year,
       overview = EXCLUDED.overview,
       poster_path = EXCLUDED.poster_path,
       runtime = EXCLUDED.runtime,
       rating = EXCLUDED.rating,
       genre_ids = EXCLUDED.genre_ids,
       keyword_ids = EXCLUDED.keyword_ids,
       platforms = EXCLUDED.platforms,
       origin_countries = EXCLUDED.origin_countries,
       updated_at = now()`,
    [
      filmDetail.id,
      filmDetail.title,
      parseInt(filmDetail.release_date.slice(0, 4)),
      filmDetail.overview,
      filmDetail.poster_path,
      filmDetail.runtime,
      filmDetail.vote_average / 2,
      genreIds,
      keywordIds,
      platforms,
      originCountries
    ]
  );
}

async function traiterParLots(ids) {
  let traites = 0;

  for (let i = 0; i < ids.length; i += CONCURRENCE) {
    const lot = ids.slice(i, i + CONCURRENCE);

    await Promise.all(lot.map(async (id) => {
      const detail = await recupererDetailFilm(id);
      await insererFilm(detail);
    }));

    traites += lot.length;
    if (traites % 200 === 0) {
      console.log(`${traites} / ${ids.length} films traités`);
    }
  }
}

async function main() {
  console.log('Étape 1 : récupération de la liste des films...');
  const ids = await recupererTousLesIds();
  console.log(`Total : ${ids.length} films uniques à synchroniser`);

  console.log('Étape 2 : récupération des détails et insertion en base...');
  await traiterParLots(ids);

  console.log('Synchro terminée !');
  await pool.end();
}

main();