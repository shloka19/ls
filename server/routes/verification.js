import express from 'express';
import { CacheService } from '../services/cache.js';
import { GeminiService } from '../services/gemini.js';
import { authenticateUser, logger } from '../middleware/middleware.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// POST /disasters/:id/verify-image - Verify image authenticity
router.post('/disasters/:id/verify-image', authenticateUser, async (req, res) => {
  try {
    const disasterId = req.params.id;
    const { image_url, content = '' } = req.body;

    // Verify disaster exists
    const { data: disaster, error: disasterError } = await req.supabase
      .from('disasters')
      .select('id')
      .eq('id', disasterId)
      .single();

    if (disasterError || !disaster) {
      return res.status(404).json({ error: 'Disaster not found' });
    }

    let verification = {
      status: 'not_provided',
      analysis: 'No image was provided for verification.'
    };

    if (image_url) {
      const cache = new CacheService(req.supabase);
      const geminiService = new GeminiService(cache);
      verification = await geminiService.verifyImage(image_url);
    }

    const newReport = {
      id: uuidv4(),
      disaster_id: disasterId,
      user_id: req.user.id,
      content: content || 'Report submitted',
      image_url: image_url || null,
      verification_status: verification.status,
      verification_analysis: verification.analysis,
      created_at: new Date().toISOString()
    };

    const { data, error } = await req.supabase
      .from('reports')
      .insert([newReport])
      .select();

    if (error) {
      logger('error', `Report creation error: ${error.message}`);
      return res.json({
        verification,
        note: 'Verification completed but report creation failed'
      });
    }

    logger('info', `Image verified: ${verification.status} for disaster ${disasterId}`);
    res.json({
      verification,
      report: data[0]
    });
  } catch (error) {
    logger('error', `Image verification error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// GET /disasters/:id/reports - Get reports for a disaster
router.get('/disasters/:id/reports', async (req, res) => {
  try {
    const disasterId = req.params.id;

    const { data, error } = await req.supabase
      .from('reports')
      .select('*')
      .eq('disaster_id', disasterId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    logger('info', `Retrieved ${data.length} reports for disaster ${disasterId}`);
    res.json({
      disaster_id: disasterId,
      reports: data,
      count: data.length
    });
  } catch (error) {
    logger('error', `Reports fetch error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// POST /disasters/:id/reports - Create a new report
router.post('/disasters/:id/reports', authenticateUser, async (req, res) => {
  try {
    const disasterId = req.params.id;
    const { content, image_url } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
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

    const newReport = {
      id: uuidv4(),
      disaster_id: disasterId,
      user_id: req.user.id,
      content,
      image_url: image_url || null,
      verification_status: 'pending',
      created_at: new Date().toISOString()
    };

    const { data, error } = await req.supabase
      .from('reports')
      .insert([newReport])
      .select();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    logger('info', `Report created for disaster ${disasterId} by ${req.user.id}`);
    res.status(201).json(data[0]);
  } catch (error) {
    logger('error', `Report creation error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

export default router;