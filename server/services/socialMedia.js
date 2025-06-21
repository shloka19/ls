import { logger } from '../middleware/middleware.js';

export class SocialMediaService {
  constructor(cacheService) {
    this.cache = cacheService;
  }

  async fetchSocialMediaReports(disasterId, tags = []) {
    const cacheKey = `social_media_${disasterId}_${tags.join('_')}`;
    
    try {
      // Check cache first
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        logger('info', 'Social media cache hit');
        return cached;
      }

      // Mock Twitter API data - replace with real API when available
      const mockReports = this.generateMockReports(tags);
      
      // Cache the result
      await this.cache.set(cacheKey, mockReports, 0.5); // 30 minutes TTL for social media
      
      logger('info', `Fetched ${mockReports.length} social media reports`);
      return mockReports;
    } catch (error) {
      logger('error', `Social media fetch error: ${error.message}`);
      return [];
    }
  }

  generateMockReports(tags) {
    const mockData = [
      {
        id: 'tweet_1',
        user: 'citizen1',
        content: '#floodrelief Need food in Lower East Side NYC. Shelter is full, people waiting outside.',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        priority: 'high',
        location: 'Lower East Side, NYC',
        keywords: ['food', 'shelter', 'need']
      },
      {
        id: 'tweet_2',
        user: 'helper_nyc',
        content: 'Offering free transportation to evacuation centers from Manhattan. DM for pickup #disasterhelp',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        priority: 'medium',
        location: 'Manhattan, NYC',
        keywords: ['transportation', 'evacuation', 'help']
      },
      {
        id: 'tweet_3',
        user: 'emergency_nyc',
        content: 'URGENT: Water levels rising in Brooklyn. Residents in flood zones please evacuate immediately #emergency',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        priority: 'urgent',
        location: 'Brooklyn, NYC',
        keywords: ['urgent', 'evacuation', 'emergency']
      },
      {
        id: 'tweet_4',
        user: 'medical_volunteer',
        content: 'Medical team available at Central Park emergency station. First aid and basic supplies #medicalhelp',
        timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        priority: 'medium',
        location: 'Central Park, NYC',
        keywords: ['medical', 'first aid', 'supplies']
      }
    ];

    // Filter based on tags if provided
    if (tags.length > 0) {
      return mockData.filter(report => 
        tags.some(tag => 
          report.keywords.some(keyword => 
            keyword.toLowerCase().includes(tag.toLowerCase())
          )
        )
      );
    }

    return mockData;
  }

  async detectPriorityAlerts(reports) {
    const urgentKeywords = ['urgent', 'sos', 'emergency', 'help', 'trapped', 'critical'];
    
    return reports.filter(report => {
      const content = report.content.toLowerCase();
      return urgentKeywords.some(keyword => content.includes(keyword));
    });
  }
}