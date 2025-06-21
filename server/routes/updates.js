import express from 'express';
import { CacheService } from '../services/cache.js';
import { UpdatesService } from '../services/updates.js';
import { logger } from '../middleware/middleware.js';

const router = express.Router();

// GET /disasters/:id/official-updates - Get official updates for a disaster
router.get('/disasters/:id/official-updates', async (req, res) => {
  try {
    const disasterId = req.params.id;

    // Get disaster to verify it exists and get location
    const { data: disaster, error: disasterError } = await req.supabase
      .from('disasters')
      .select('location_name, title')
      .eq('id', disasterId)
      .single();

    if (disasterError || !disaster) {
      return res.status(404).json({ error: 'Disaster not found' });
    }

    const cache = new CacheService(req.supabase);
    const updatesService = new UpdatesService(cache);

    const updates = await updatesService.fetchOfficialUpdates(
      disasterId, 
      disaster.location_name || disaster.title
    );

    logger('info', `Retrieved ${updates.length} official updates for disaster ${disasterId}`);
    res.json({
      disaster_id: disasterId,
      updates,
      location: disaster.location_name,
      last_updated: new Date().toISOString()
    });
  } catch (error) {
    logger('error', `Official updates fetch error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

export default router;