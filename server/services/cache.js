import { logger } from '../middleware/middleware.js';

export class CacheService {
  constructor(supabase) {
    this.supabase = supabase;
  }

  async get(key) {
    try {
      const { data, error } = await this.supabase
        .from('cache')
        .select('value, expires_at')
        .eq('key', key)
        .single();

      if (error || !data) return null;

      // Check if cache is expired
      if (new Date() > new Date(data.expires_at)) {
        await this.delete(key);
        return null;
      }

      return data.value;
    } catch (error) {
      logger('error', `Cache get error: ${error.message}`);
      return null;
    }
  }

  async set(key, value, ttlHours = 1) {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + ttlHours);

      const { error } = await this.supabase
        .from('cache')
        .upsert({
          key,
          value,
          expires_at: expiresAt.toISOString()
        });

      if (error) {
        logger('error', `Cache set error: ${error.message}`);
      }
    } catch (error) {
      logger('error', `Cache set error: ${error.message}`);
    }
  }

  async delete(key) {
    try {
      await this.supabase
        .from('cache')
        .delete()
        .eq('key', key);
    } catch (error) {
      logger('error', `Cache delete error: ${error.message}`);
    }
  }
}