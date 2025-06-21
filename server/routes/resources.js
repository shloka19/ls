import express from 'express';
import { logger } from '../middleware/middleware.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// GET /disasters/:id/resources - Get resources near a disaster location
router.get('/disasters/:id/resources', async (req, res) => {
  try {
    const disasterId = req.params.id;
    const { lat, lon, radius = 10 } = req.query; // radius in km

    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    // Get disaster to verify it exists
    const { data: disaster, error: disasterError } = await req.supabase
      .from('disasters')
      .select('*')
      .eq('id', disasterId)
      .single();

    if (disasterError || !disaster) {
      return res.status(404).json({ error: 'Disaster not found' });
    }

    // Geospatial query to find resources within radius
    const { data: resources, error } = await req.supabase
      .rpc('find_nearby_resources', {
        target_disaster_id: disasterId,
        center_lat: parseFloat(lat),
        center_lon: parseFloat(lon),
        radius_km: parseFloat(radius)
      });

    if (error) {
      logger('error', `Geospatial query error: ${error.message}`);
      // Fallback to regular query if geospatial function fails
      const { data: fallbackResources } = await req.supabase
        .from('resources')
        .select('*')
        .eq('disaster_id', disasterId);

      return res.json({
        disaster_id: disasterId,
        resources: fallbackResources || [],
        search_params: { lat, lon, radius },
        note: 'Geospatial search unavailable, showing all resources'
      });
    }

    // Emit real-time update
    req.io.to(`disaster_${disasterId}`).emit('resources_updated', {
      disaster_id: disasterId,
      resources,
      location: { lat, lon }
    });

    logger('info', `Found ${resources?.length || 0} resources near disaster ${disasterId}`);
    res.json({
      disaster_id: disasterId,
      resources: resources || [],
      search_params: { lat, lon, radius },
      last_updated: new Date().toISOString()
    });
  } catch (error) {
    logger('error', `Resources fetch error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// POST /disasters/:id/resources - Add a new resource
router.post('/disasters/:id/resources', async (req, res) => {
  try {
    const disasterId = req.params.id;
    const { name, location_name, type, lat, lon } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }

    // Verify disaster exists
    const { data: disaster, error: disasterError } = await req.supabase
      .from('disasters')
      .select('id')
      .eq('id', disasterId)
      .single();

    if (disasterError || !disaster) {
      return res.status(404).json({ error: 'Disaster not found' });
    }

    const newResource = {
      id: uuidv4(),
      disaster_id: disasterId,
      name,
      location_name: location_name || '',
      type,
      created_at: new Date().toISOString()
    };

    // Add geospatial data if coordinates provided
    if (lat && lon) {
      newResource.location = `POINT(${lon} ${lat})`;
    }

    const { data, error } = await req.supabase
      .from('resources')
      .insert([newResource])
      .select();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Emit real-time update
    req.io.to(`disaster_${disasterId}`).emit('resources_updated', {
      disaster_id: disasterId,
      action: 'create',
      resource: data[0]
    });

    logger('info', `Resource created: ${name} for disaster ${disasterId}`);
    res.status(201).json(data[0]);
  } catch (error) {
    logger('error', `Resource creation error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

export default router;