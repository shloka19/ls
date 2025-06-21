export const config = {
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY
  },
  maps: {
    googleApiKey: process.env.GOOGLE_MAPS_API_KEY,
    mapboxToken: process.env.MAPBOX_TOKEN
  },
  twitter: {
    apiKey: process.env.TWITTER_API_KEY,
    apiSecret: process.env.TWITTER_API_SECRET
  }
};
