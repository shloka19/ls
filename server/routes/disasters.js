import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateUser, logger } from '../middleware/middleware.js';
import { CacheService } from '../services/cache.js';

const router = express.Router();

// GET /disasters - List disasters with optional filtering
router.get('/', async (req, res) => {
  try {
    const { tag, limit = 50, offset = 0 } = req.query;
    let query = req.supabase.from('disasters').select('*');

    if (tag) {
      query = query.contains('tags', [tag]);
    }

    query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    logger('info', `Retrieved ${data.length} disasters`);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /disasters/:id - Get specific disaster
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('disasters')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Disaster not found' });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /disasters - Create new disaster
router.post('/', authenticateUser, async (req, res) => {
  try {
    const { title, location_name, description, tags = [] } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const newDisaster = {
      id: uuidv4(),
      title,
      location_name: location_name || '',
      description,
      tags,
      owner_id: req.user.id,
      created_at: new Date().toISOString(),
      audit_trail: [{
        action: 'create',
        user_id: req.user.id,
        timestamp: new Date().toISOString()
      }]
    };

    const { data, error } = await req.supabase
      .from('disasters')
      .insert([newDisaster])
      .select();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Emit real-time update
    req.io.emit('disaster_updated', { action: 'create', disaster: data[0] });
    
    logger('info', `Disaster created: ${title} by ${req.user.id}`);
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /disasters/:id - Update disaster
router.put('/:id', authenticateUser, async (req, res) => {
  try {
    const { title, location_name, description, tags } = req.body;
    const disasterId = req.params.id;

    // Get existing disaster to check ownership
    const { data: existing, error: fetchError } = await req.supabase
      .from('disasters')
      .select('*')
      .eq('id', disasterId)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Disaster not found' });
    }

    // Check ownership or admin role
    if (existing.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Prepare update data
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (location_name !== undefined) updateData.location_name = location_name;
    if (description !== undefined) updateData.description = description;
    if (tags !== undefined) updateData.tags = tags;

    // Add to audit trail
    const newAuditEntry = {
      action: 'update',
      user_id: req.user.id,
      timestamp: new Date().toISOString(),
      changes: Object.keys(updateData)
    };
    updateData.audit_trail = [...existing.audit_trail, newAuditEntry];

    const { data, error } = await req.supabase
      .from('disasters')
      .update(updateData)
      .eq('id', disasterId)
      .select();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Emit real-time update
    req.io.emit('disaster_updated', { action: 'update', disaster: data[0] });
    
    logger('info', `Disaster updated: ${disasterId} by ${req.user.id}`);
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /disasters/:id - Delete disaster
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    const disasterId = req.params.id;

    // Get existing disaster to check ownership
    const { data: existing, error: fetchError } = await req.supabase
      .from('disasters')
      .select('*')
      .eq('id', disasterId)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Disaster not found' });
    }

    // Check ownership or admin role
    if (existing.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { error } = await req.supabase
      .from('disasters')
      .delete()
      .eq('id', disasterId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Emit real-time update
    req.io.emit('disaster_updated', { action: 'delete', disaster: existing });
    
    logger('info', `Disaster deleted: ${disasterId} by ${req.user.id}`);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;