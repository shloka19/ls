import express from 'express';
import { CacheService } from '../services/cache.js';
import { SocialMediaService } from '../services/socialMedia.js';
import { logger } from '../middleware/middleware.js';

const router = express.Router();

// GET /disasters/:id/social-media - Get social media reports for a disaster
router.get('/disasters/:id/social-media', async (req, res) => {
  try {
    const disasterId = req.params.id;
    const { tags } = req.query;

    // Get disaster to verify it exists
    const { data: disaster, error: disasterError } = await req.supabase
      .from('disasters')
      .select('tags')
      .eq('id', disasterId)
      .single();

    if (disasterError || !disaster) {
      return res.status(404).json({ error: 'Disaster not found' });
    }

    const cache = new CacheService(req.supabase);
    const socialMediaService = new SocialMediaService(cache);

    const searchTags = tags ? tags.split(',') : disaster.tags || [];
    const reports = await socialMediaService.fetchSocialMediaReports(disasterId, searchTags);

    // Detect priority alerts
    const priorityAlerts = await socialMediaService.detectPriorityAlerts(reports);

    // Emit real-time update if there are new reports
    if (reports.length > 0) {
      req.io.to(`disaster_${disasterId}`).emit('social_media_updated', {
        disaster_id: disasterId,
        reports,
        priority_alerts: priorityAlerts
      });
    }

    logger('info', `Retrieved ${reports.length} social media reports for disaster ${disasterId}`);
    res.json({
      disaster_id: disasterId,
      reports,
      priority_alerts: priorityAlerts,
      last_updated: new Date().toISOString()
    });
  } catch (error) {
    logger('error', `Social media fetch error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// GET /mock-social-media - Mock social media endpoint for testing
router.get('/mock-social-media', async (req, res) => {
  try {
    const { keywords = '', location = '' } = req.query;
    
    const cache = new CacheService(req.supabase);
    const socialMediaService = new SocialMediaService(cache);

    const tags = keywords ? keywords.split(',') : ['flood', 'emergency'];
    const reports = await socialMediaService.fetchSocialMediaReports('mock', tags);

    logger('info', `Mock social media endpoint accessed with keywords: ${keywords}`);
    res.json({
      source: 'mock_api',
      query: { keywords, location },
      reports,
      count: reports.length,
      last_updated: new Date().toISOString()
    });
  } catch (error) {
    logger('error', `Mock social media error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

export default router;