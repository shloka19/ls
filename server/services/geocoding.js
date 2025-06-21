import axios from 'axios';
import { config } from '../config/config.js';
import { logger } from '../middleware/middleware.js';

export class GeocodingService {
  constructor(cacheService) {
    this.cache = cacheService;
  }

  async geocodeLocation(locationName) {
    const cacheKey = `geocode_${Buffer.from(locationName).toString('base64')}`;
    
    try {
      // Check cache first
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        logger('info', 'Geocoding cache hit');
        return cached;
      }

      // Try Google Maps first, fallback to Nominatim
      let result = await this.geocodeWithGoogle(locationName);
      if (!result) {
        result = await this.geocodeWithNominatim(locationName);
      }

      if (result) {
        // Cache the result
        await this.cache.set(cacheKey, result);
        logger('info', `Geocoded location: ${locationName} -> ${result.lat}, ${result.lng}`);
      }

      return result;
    } catch (error) {
      logger('error', `Geocoding error: ${error.message}`);
      return null;
    }
  }

  async geocodeWithGoogle(locationName) {
    try {
      if (!config.maps.googleApiKey || config.maps.googleApiKey === 'your-google-maps-api-key') {
        return null;
      }

      const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: {
          address: locationName,
          key: config.maps.googleApiKey
        }
      });

      if (response.data.results && response.data.results.length > 0) {
        const location = response.data.results[0].geometry.location;
        return { lat: location.lat, lng: location.lng };
      }
    } catch (error) {
      logger('error', `Google geocoding error: ${error.message}`);
    }
    return null;
  }

  async geocodeWithNominatim(locationName) {
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: locationName,
          format: 'json',
          limit: 1
        },
        headers: {
          'User-Agent': 'DisasterResponsePlatform/1.0'
        }
      });

      if (response.data && response.data.length > 0) {
        const location = response.data[0];
        return { lat: parseFloat(location.lat), lng: parseFloat(location.lon) };
      }
    } catch (error) {
      logger('error', `Nominatim geocoding error: ${error.message}`);
    }
    return null;
  }
}