import axios from 'axios';
import * as cheerio from 'cheerio';
import { logger } from '../middleware/middleware.js';

export class UpdatesService {
  constructor(cacheService) {
    this.cache = cacheService;
  }

  async fetchOfficialUpdates(disasterId, location) {
    const cacheKey = `official_updates_${disasterId}_${location}`;
    
    try {
      // Check cache first
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        logger('info', 'Official updates cache hit');
        return cached;
      }

      // Mock official updates - in production, scrape FEMA, Red Cross, etc.
      const updates = await this.generateMockOfficialUpdates(location);
      
      // Cache the result
      await this.cache.set(cacheKey, updates);
      
      logger('info', `Fetched ${updates.length} official updates`);
      return updates;
    } catch (error) {
      logger('error', `Official updates fetch error: ${error.message}`);
      return [];
    }
  }

  async generateMockOfficialUpdates(location) {
    // Mock data representing scraped official sources
    return [
      {
        id: 'fema_1',
        source: 'FEMA',
        title: 'Flood Warning Extended for NYC Area',
        content: 'The National Weather Service has extended the flood warning for New York City through Thursday evening. Residents in low-lying areas should remain vigilant.',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        url: 'https://www.fema.gov/disaster/current',
        priority: 'high'
      },
      {
        id: 'redcross_1',
        source: 'American Red Cross',
        title: 'Emergency Shelters Open Across NYC',
        content: 'The American Red Cross has opened additional emergency shelters in Manhattan, Brooklyn, and Queens. Transportation to shelters is available.',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        url: 'https://www.redcross.org/local/new-york',
        priority: 'medium'
      },
      {
        id: 'nyc_emergency_1',
        source: 'NYC Emergency Management',
        title: 'Travel Advisory: Avoid Flooded Streets',
        content: 'NYC residents are advised to avoid travel on flooded streets. Several subway lines are experiencing delays due to water on tracks.',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        url: 'https://www1.nyc.gov/site/em/index.page',
        priority: 'medium'
      }
    ];
  }

  async scrapeWebsite(url) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DisasterBot/1.0)'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Generic scraping logic - would need to be customized per site
      const updates = [];
      $('article, .news-item, .update-item').each((i, elem) => {
        const title = $(elem).find('h1, h2, h3, .title').first().text().trim();
        const content = $(elem).find('p, .content, .summary').first().text().trim();
        
        if (title && content) {
          updates.push({
            id: `scraped_${i}`,
            source: url,
            title,
            content: content.substring(0, 500) + (content.length > 500 ? '...' : ''),
            timestamp: new Date().toISOString(),
            url,
            priority: 'medium'
          });
        }
      });

      return updates;
    } catch (error) {
      logger('error', `Web scraping error for ${url}: ${error.message}`);
      return [];
    }
  }
}