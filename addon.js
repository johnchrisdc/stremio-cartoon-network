const { addonBuilder } = require("stremio-addon-sdk");
const axios = require("axios");
require("dotenv").config();

// Configuration constants
const CONFIG = {
  TMDB_API_KEY: process.env.TMDB_API_KEY,
  TMDB_BASE_URL: "https://api.themoviedb.org/3",
  IMAGE_BASE_URL: "https://image.tmdb.org/t/p",
  ITEMS_PER_PAGE: 20,
  MAX_CAST_MEMBERS: 5,
};

// Validate environment variables
if (!CONFIG.TMDB_API_KEY) {
  throw new Error("TMDB_API_KEY environment variable is required");
}

// Create axios instance with default configuration
const tmdbClient = axios.create({
  baseURL: CONFIG.TMDB_BASE_URL,
  params: {
    api_key: CONFIG.TMDB_API_KEY,
  },
  timeout: 10000, // 10 second timeout
});

const manifest = {
  id: "org.cartoon_network",
  version: "1.0.0",
  name: "Cartoon Network",
  description: "The Cartoon Network Stremio Addon lets you stream a wide range of Cartoon Network shows directly within Stremio. It’s a community-made, unofficial addon.",
  types: ["movie", "series"],
  catalogs: [
    {
      type: "movie",
      id: "cartoon_network_movie",
      name: "Cartoon Network",
      extra: [{ name: "skip", isRequired: false }],
    },
    {
      type: "series",
      id: "cartoon_network_series",
      name: "Cartoon Network",
      extra: [{ name: "skip", isRequired: false }],
    },
  ],
  resources: ["catalog", "meta"],
  idPrefixes: ["tmdb"],
  logo: "https://raw.githubusercontent.com/johnchrisdc/stremio-cartoon-network/refs/heads/main/potato-inc.png",
  stremioAddonsConfig: {
    issuer: "https://stremio-addons.net",
    signature: "eyJhbGciOiJkaXIiLCJlbmMiOiJBMTI4Q0JDLUhTMjU2In0..OCazw3GP0SIkE3Htmo9H1w.3p6AhQCXb8-sIxbD4sSmMbW-aCkIvNDEduDB6rViiDBiGOuHYGMMG8G6JByATbBkMXziLlttduL3qTrDWZB4FyUYZ84p-8pL8gRKkHdqOn_z58OUz0WSRMts-XrO58_K.SFb81L0ZYkbQVSj5iNOByQ"
  }
};

// Helper functions
const getImageUrl = (path, size = "w500") =>
  path ? `${CONFIG.IMAGE_BASE_URL}/${size}${path}` : null;

const extractTmdbId = (id) => {
  const match = id.match(/^tmdb:(\d+)$/);
  if (!match) throw new Error(`Invalid TMDB ID format: ${id}`);
  return match[1];
};

const handleApiError = (error, context) => {
  const errorDetails = {
    message: error.message,
    context,
    timestamp: new Date().toISOString(),
    status: error.response?.status,
    data: error.response?.data,
  };

  console.error(JSON.stringify(errorDetails));

  if (error.response?.status === 429) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  throw new Error(`Error in ${context}: ${error.message}`);
};

// Create addon builder
const builder = new addonBuilder(manifest);

// Catalog handler
builder.defineCatalogHandler(async ({ type, id, extra }) => {
  console.log("defineCatalogHandler: " + type);
  try {
    const page = extra.skip
      ? Math.floor(extra.skip / CONFIG.ITEMS_PER_PAGE) + 1
      : 1;

    if (type === "movie") {
      const { data } = await tmdbClient.get("/discover/movie", {
        params: {
          page,
          sort_by: "popularity.desc",
          with_companies: "7899"
        },
      });

      const metas = data.results.map((movie) => ({
        id: `tmdb:${movie.id}`,
        type: "movie",
        name: movie.title,
        poster: getImageUrl(movie.poster_path),
        background: getImageUrl(movie.backdrop_path, "original"),
        posterShape: "regular",
        imdbRating: movie.vote_average,
        year: movie.release_date
          ? new Date(movie.release_date).getFullYear()
          : null,
        description: movie.overview,
      }));

      return { metas };
    } else if (type === "series") {
      const { data } = await tmdbClient.get("/discover/tv", {
        params: {
          page,
          sort_by: "popularity.desc",
          with_companies: "7899"
        },
      });

      const metas = data.results.map((movie) => ({
        id: `tmdb:${movie.id}`,
        type: "series",
        name: movie.title,
        poster: getImageUrl(movie.poster_path),
        background: getImageUrl(movie.backdrop_path, "original"),
        posterShape: "regular",
        imdbRating: movie.vote_average,
        year: movie.release_date
          ? new Date(movie.release_date).getFullYear()
          : null,
        description: movie.overview,
      }));

      return { metas };
    }

  } catch (error) {
    handleApiError(error, "catalog");
  }
});

// Meta handler
builder.defineMetaHandler(async ({ type, id }) => {
  try {
    const tmdbId = extractTmdbId(id);

    if (type === "movie") {
      const [movieDetails, credits] = await Promise.all([
        tmdbClient.get(`/movie/${tmdbId}`),
        tmdbClient.get(`/movie/${tmdbId}/credits`),
      ]);

      const movie = movieDetails.data;
      const cast = credits.data.cast
        .slice(0, CONFIG.MAX_CAST_MEMBERS)
        .map((actor) => actor.name)
        .join(", ");

      const director =
        credits.data.crew.find((member) => member.job === "Director")?.name ??
        "Unknown";

      return {
        id: `tmdb:${movie.id}`,
        type: "movie",
        name: movie.title,
        description: movie.overview,
        poster: getImageUrl(movie.poster_path),
        background: getImageUrl(movie.backdrop_path, "original"),
        genres: movie.genres.map((genre) => genre.name).join(", "),
        cast,
        director,
        year: movie.release_date
          ? new Date(movie.release_date).getFullYear()
          : null,
        runtime: movie.runtime,
        language: movie.original_language,
        country: movie.production_countries?.[0]?.name,
      };
    } else if (type === "series") {
      const [movieDetails, credits] = await Promise.all([
        tmdbClient.get(`/tv/${tmdbId}`),
        tmdbClient.get(`/tv/${tmdbId}/credits`),
      ]);

      const movie = movieDetails.data;
      const cast = credits.data.cast
        .slice(0, CONFIG.MAX_CAST_MEMBERS)
        .map((actor) => actor.name)
        .join(", ");

        
      const director =
        credits.data.crew.find((member) => member.job === "Director")?.name ??
        "Unknown";

      return {
        id: `tmdb:${movie.id}`,
        type: "series",
        name: movie.title,
        description: movie.overview,
        poster: getImageUrl(movie.poster_path),
        background: getImageUrl(movie.backdrop_path, "original"),
        genres: movie.genres.map((genre) => genre.name).join(", "),
        cast,
        director,
        year: movie.release_date
          ? new Date(movie.release_date).getFullYear()
          : null,
        runtime: movie.runtime,
        language: movie.original_language,
        country: movie.production_countries?.[0]?.name,
      };
    }

    
  } catch (error) {
    handleApiError(error, "meta");
  }
});

// Error handling for uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

module.exports = builder.getInterface();
