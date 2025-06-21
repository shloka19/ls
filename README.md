# Disaster Response Coordination Platform

A comprehensive disaster response platform built with the MERN stack, featuring real-time coordination, geospatial queries, external API integrations, and intelligent data processing.

## 🌟 Features

### Core Functionality
- **Disaster Management**: Full CRUD operations with ownership tracking and audit trails
- **Real-time Updates**: WebSocket-powered live updates for disasters, social media, and resources
- **Geospatial Queries**: Location-based resource discovery using PostGIS
- **Smart Location Extraction**: Google Gemini API extracts locations from disaster descriptions
- **Multi-source Geocoding**: Google Maps API with OpenStreetMap fallback
- **Social Media Monitoring**: Mock Twitter API integration with priority alert detection
- **Image Verification**: Gemini AI-powered authenticity checking
- **Official Updates**: Web scraping for government and relief organization updates
- **Intelligent Caching**: Supabase-based caching with TTL for external API responses

### Technical Architecture
- **Backend**: Node.js + Express.js with comprehensive REST APIs
- **Database**: Supabase (PostgreSQL) with geospatial extensions
- **Real-time**: Socket.IO for live updates
- **Frontend**: React with TypeScript and Tailwind CSS
- **External APIs**: Google Gemini, Google Maps/OpenStreetMap, Mock Social Media
- **Security**: Row Level Security (RLS), rate limiting, authentication

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase account
- Google Gemini API key (optional but recommended)
- Google Maps API key (optional, will use OpenStreetMap as fallback)

### Installation

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd disaster-response-platform
   npm install
   ```

2. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Run the migration script in `supabase/migrations/init_schema.sql` in your Supabase SQL editor
   - Get your project URL and anon key from Settings > API

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your actual API keys and configuration
   ```

4. **Start the development servers**
   ```bash
   npm run dev
   ```

   This starts both the backend server (port 3001) and frontend (port 5173).

## 🔧 API Documentation

### Disasters
- `GET /api/disasters` - List disasters (supports `?tag=flood` filtering)
- `POST /api/disasters` - Create disaster
- `PUT /api/disasters/:id` - Update disaster
- `DELETE /api/disasters/:id` - Delete disaster

### Social Media
- `GET /api/social-media/disasters/:id/social-media` - Get social reports
- `GET /api/social-media/mock-social-media` - Mock Twitter API endpoint

### Resources
- `GET /api/resources/disasters/:id/resources?lat=40.7128&lon=-74.0060` - Geospatial resource lookup
- `POST /api/resources/disasters/:id/resources` - Add resource

### Updates
- `GET /api/updates/disasters/:id/official-updates` - Official government/relief updates

### Verification
- `POST /api/verification/disasters/:id/verify-image` - Verify image authenticity
- `GET /api/verification/disasters/:id/reports` - Get reports
- `POST /api/verification/disasters/:id/reports` - Submit report

### Geocoding
- `POST /api/geocoding/geocode` - Extract location from description and geocode

## 🗄️ Database Schema

### Main Tables
- **disasters**: Core disaster records with geospatial location support
- **reports**: User-submitted reports with image verification status
- **resources**: Emergency resources with geospatial indexing
- **cache**: API response caching with TTL

### Key Features
- PostGIS extension for geospatial queries
- GIN indexes for array/JSONB columns  
- Row Level Security (RLS) policies
- Audit trail tracking in JSONB format
- Geospatial functions for nearby resource discovery

## 🔌 External Integrations

### Google Gemini API
- **Location Extraction**: Intelligently extracts location names from disaster descriptions
- **Image Verification**: Analyzes images for authenticity and disaster context
- **Caching**: All responses cached to minimize API usage

### Geocoding Services
- **Primary**: Google Maps Geocoding API
- **Fallback**: OpenStreetMap Nominatim service
- **Smart Fallback**: Automatically switches if primary service unavailable

### Social Media Monitoring
- **Mock Implementation**: Realistic Twitter-like data for testing
- **Priority Detection**: Identifies urgent alerts using keyword analysis
- **Real-time Updates**: WebSocket broadcasting of new reports

### Official Updates
- **Web Scraping**: Extracts updates from FEMA, Red Cross, and emergency management sites
- **Mock Data**: Government-style updates for demonstration
- **Caching**: Respects rate limits with intelligent caching

## 🔒 Security Features

- **Row Level Security**: Database-level access control
- **Rate Limiting**: API endpoint protection
- **Mock Authentication**: Hardcoded users for development (netrunnerX, reliefAdmin, citizen1)
- **Input Validation**: Comprehensive request validation
- **Error Handling**: Structured error responses with logging

## 📊 Real-time Features

### WebSocket Events
- `disaster_updated`: Broadcasts disaster create/update/delete
- `social_media_updated`: New social media reports
- `resources_updated`: Resource availability changes

### Live Dashboard
- Automatic updates without page refresh
- Real-time social media feed
- Live resource availability
- Instant disaster notifications

## 🧪 Testing the Platform

### Sample Data
The platform includes realistic sample data:
- **NYC Flood**: Manhattan flooding scenario
- **Social Reports**: Citizen reports with priority levels  
- **Resources**: Emergency shelters, medical stations, transportation
- **Official Updates**: FEMA, Red Cross, NYC Emergency Management

### Mock Authentication
Use these headers for API testing:
- `x-user-id: netrunnerX` (admin role)
- `x-user-id: reliefAdmin` (admin role)
- `x-user-id: citizen1` (contributor role)

### Testing Location Extraction
1. Use the "Test Location Extraction" feature in the UI
2. Enter descriptions like: "Heavy flooding reported in downtown Manhattan near Wall Street"
3. See extracted location and coordinates

## 🚀 Deployment

### Backend (Render)
1. Create new Web Service on Render
2. Connect your repository
3. Set environment variables
4. Deploy with build command: `npm install`
5. Start command: `npm run server`

### Frontend (Vercel)
1. Connect repository to Vercel
2. Set environment variables
3. Deploy with build command: `npm run build`

### Environment Variables for Production
Ensure all API keys and database credentials are set in your deployment platform.

## 🛠️ AI-Assisted Development

This project was built using AI coding tools (Cursor/Windsurf) for:
- Complex geospatial query generation
- API route scaffolding
- Database schema design
- Real-time WebSocket implementation
- External service integration patterns

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For questions or issues:
- Create an issue in the GitHub repository
- Check the API documentation above
- Review the sample data and testing instructions