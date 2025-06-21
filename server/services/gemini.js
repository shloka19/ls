import axios from 'axios';
import { logger } from '../middleware/middleware.js';

export class GeminiService {
  constructor(cacheService) {
    this.cache = cacheService;
    this.hfToken = process.env.GEMINI_API_KEY;
    this.textModel = 'dslim/bert-base-NER'; // Hugging Face model for NER
    this.imageModel = 'google/vit-base-patch16-224'; // Optional: change based on need
  }
  async extractLocation(description) {
    const cacheKey = `location_extract_${Buffer.from(description).toString('base64')}`;

    try {
      // Check cache first
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        logger('info', 'Location extraction cache hit');
        return cached;
      }

      // Call Hugging Face Inference API for NER
      const response = await axios.post(
        `https://api-inference.huggingface.co/models/${this.textModel}`,
        { inputs: description },
        {
          headers: {
            Authorization: `Bearer ${this.hfToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Extract GPE or LOC entities
      const entities = response.data;
      const locations = entities
        .filter(ent => ent.entity_group === 'LOC' || ent.entity_group === 'ORG' || ent.entity_group === 'PER' || ent.entity_group === 'MISC')
        .map(ent => ent.word)
        .filter(word => word !== '[CLS]' && word !== '[SEP]')
        .join(' ')
        .replace(/##/g, '');

      const result_data = { location: locations || 'Unknown' };

      // Cache the result
      await this.cache.set(cacheKey, result_data);
      logger('info', `Location extracted: ${result_data.location}`);
      return result_data;

    } catch (error) {
      logger('error', `HuggingFace location extraction error: ${error.message}`);
      return { location: 'Location extraction failed' };
    }
  }

  async verifyImage(imageUrl) {
    const cacheKey = `image_verify_${Buffer.from(imageUrl).toString('base64')}`;
  
    try {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        logger('info', 'Image verification cache hit');
        return cached;
      }
  
      // Get image as binary
      const imageResp = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  
      // Send image binary directly
      const response = await axios.post(
        `https://api-inference.huggingface.co/models/${this.imageModel}`,
        imageResp.data,
        {
          headers: {
            Authorization: `Bearer ${this.hfToken}`,
            'Content-Type': 'application/octet-stream'
          }
        }
      );
  
      const result_data = {
        status: 'analyzed',
        analysis: response.data
      };
  
      await this.cache.set(cacheKey, result_data);
      logger('info', `Image verification result: ${JSON.stringify(result_data.analysis)}`);
      return result_data;
  
    } catch (error) {
      logger('error', `HuggingFace image verification error: ${error.message}`);
      return {
        status: 'error',
        analysis: 'Image verification failed due to technical error'
      };
    }
  }
  
}
