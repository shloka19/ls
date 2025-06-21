import express from 'express';
import { CacheService } from '../services/cache.js';
import { GeminiService } from '../services/gemini.js';
import { GeocodingService } from '../services/geocoding.js';
import { logger } from '../middleware/middleware.js';

const router = express.Router();

// POST /geocode - Extract location and convert to coordinates
router.post('/geocode', async (req, res) => {
  try {
    const { description, location_name } = req.body;

    if (!description && !location_name) {
      return res.status(400).json({ error: 'Description or location_name is required' });
    }

    const cache = new CacheService(req.supabase);
    const geminiService = new GeminiService(cache);
    const geocodingService = new GeocodingService(cache);

    let locationToGeocode = location_name;

    // If we have a description but no location name, extract it with Gemini
    if (!locationToGeocode && description) {
      const locationResult = await geminiService.extractLocation(description);
      locationToGeocode = locationResult.location;
    }

    if (!locationToGeocode || locationToGeocode === 'Location extraction failed') {
      return res.status(422).json({ 
        error: 'Could not extract location from description',
        extracted_location: locationToGeocode
      });
    }

    // Geocode the location
    const coordinates = await geocodingService.geocodeLocation(locationToGeocode);

    if (!coordinates) {
      return res.status(422).json({ 
        error: 'Could not geocode location',
        location_name: locationToGeocode
      });
    }

    const result = {
      original_description: description,
      extracted_location: locationToGeocode,
      coordinates,
      timestamp: new Date().toISOString()
    };

    logger('info', `Geocoding completed: ${locationToGeocode} -> ${coordinates.lat}, ${coordinates.lng}`);
    res.json(result);
  } catch (error) {
    logger('error', `Geocoding endpoint error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

export default router;