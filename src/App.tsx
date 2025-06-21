import React, { useState, useEffect } from 'react';
import { AlertTriangle, MapPin, Users, MessageCircle, Shield, Plus, Search, RefreshCw } from 'lucide-react';
import { io } from 'socket.io-client';

const API_BASE = 'http://localhost:3001/api';
const socket = io('http://localhost:3001');

interface Disaster {
  id: string;
  title: string;
  location_name: string;
  description: string;
  tags: string[];
  owner_id: string;
  created_at: string;
}

interface SocialMediaReport {
  id: string;
  user: string;
  content: string;
  timestamp: string;
  priority: string;
  location: string;
  keywords: string[];
}

interface Resource {
  id: string;
  name: string;
  location_name: string;
  type: string;
  availability_status: string;
  distance_km?: number;
}

interface OfficialUpdate {
  id: string;
  source: string;
  title: string;
  content: string;
  timestamp: string;
  priority: string;
}

function App() {
  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [selectedDisaster, setSelectedDisaster] = useState<Disaster | null>(null);
  const [socialReports, setSocialReports] = useState<SocialMediaReport[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [updates, setUpdates] = useState<OfficialUpdate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'disasters' | 'reports' | 'resources' | 'updates'>('disasters');

  // Form states
  const [newDisaster, setNewDisaster] = useState({
    title: '',
    location_name: '',
    description: '',
    tags: ''
  });
  const [newReport, setNewReport] = useState({
    content: '',
    image_url: ''
  });
  const [geocodeInput, setGeocodeInput] = useState('');

  useEffect(() => {
    loadDisasters();
    
    // Socket listeners
    socket.on('disaster_updated', (data) => {
      console.log('Disaster update received:', data);
      if (data.action === 'create') {
        setDisasters(prev => [data.disaster, ...prev]);
      } else if (data.action === 'update') {
        setDisasters(prev => prev.map(d => d.id === data.disaster.id ? data.disaster : d));
      } else if (data.action === 'delete') {
        setDisasters(prev => prev.filter(d => d.id !== data.disaster.id));
      }
    });

    socket.on('social_media_updated', (data) => {
      console.log('Social media update received:', data);
      setSocialReports(data.reports || []);
    });

    socket.on('resources_updated', (data) => {
      console.log('Resources update received:', data);
      if (data.resources) {
        setResources(data.resources);
      }
    });

    return () => {
      socket.off('disaster_updated');
      socket.off('social_media_updated');
      socket.off('resources_updated');
    };
  }, []);

  const loadDisasters = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE}/disasters`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Ensure data is an array
      if (Array.isArray(data)) {
        setDisasters(data);
      } else {
        console.error('API returned non-array data:', data);
        setDisasters([]);
        setError('Invalid data format received from server');
      }
    } catch (error) {
      console.error('Error loading disasters:', error);
      setError(`Failed to load disasters: ${error.message}`);
      setDisasters([]); // Ensure disasters is always an array
    } finally {
      setLoading(false);
    }
  };

  const createDisaster = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const response = await fetch(`${API_BASE}/disasters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'netrunnerX'
        },
        body: JSON.stringify({
          ...newDisaster,
          tags: newDisaster.tags.split(',').map(tag => tag.trim()).filter(Boolean)
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create disaster');
      }
      
      setNewDisaster({ title: '', location_name: '', description: '', tags: '' });
      // Disaster will be added via socket event
    } catch (error) {
      console.error('Error creating disaster:', error);
      setError(`Failed to create disaster: ${error.message}`);
    }
  };

  const selectDisaster = async (disaster: Disaster) => {
    setSelectedDisaster(disaster);
    socket.emit('join_disaster', disaster.id);
    
    // Load associated data
    await Promise.all([
      loadSocialReports(disaster.id),
      loadResources(disaster.id),
      loadUpdates(disaster.id)
    ]);
  };

  const loadSocialReports = async (disasterId: string) => {
    try {
      const response = await fetch(`${API_BASE}/social-media/disasters/${disasterId}/social-media`);
      if (response.ok) {
        const data = await response.json();
        setSocialReports(data.reports || []);
      }
    } catch (error) {
      console.error('Error loading social reports:', error);
    }
  };

  const loadResources = async (disasterId: string) => {
    try {
      // Mock coordinates for NYC
      const response = await fetch(`${API_BASE}/resources/disasters/${disasterId}/resources?lat=40.7128&lon=-74.0060`);
      if (response.ok) {
        const data = await response.json();
        setResources(data.resources || []);
      }
    } catch (error) {
      console.error('Error loading resources:', error);
    }
  };

  const loadUpdates = async (disasterId: string) => {
    try {
      const response = await fetch(`${API_BASE}/updates/disasters/${disasterId}/official-updates`);
      if (response.ok) {
        const data = await response.json();
        setUpdates(data.updates || []);
      }
    } catch (error) {
      console.error('Error loading updates:', error);
    }
  };

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDisaster) return;

    try {
      const response = await fetch(`${API_BASE}/verification/disasters/${selectedDisaster.id}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'citizen1'
        },
        body: JSON.stringify(newReport)
      });
      
      if (response.ok) {
        setNewReport({ content: '', image_url: '' });
        // Reload social reports to show the new report
        await loadSocialReports(selectedDisaster.id);
      }
    } catch (error) {
      console.error('Error submitting report:', error);
    }
  };

  const testGeocode = async () => {
    try {
      const response = await fetch(`${API_BASE}/geocoding/geocode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: geocodeInput
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`Location: ${data.extracted_location}\nCoordinates: ${data.coordinates?.lat}, ${data.coordinates?.lng}`);
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error testing geocode:', error);
      alert('Error testing geocode');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <h1 className="text-2xl font-bold text-gray-900">Disaster Response Platform</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Real-time Connected</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Disasters List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Active Disasters</h2>
                  <button
                    onClick={loadDisasters}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* Create Disaster Form */}
                <form onSubmit={createDisaster} className="mb-6 space-y-4">
                  <input
                    type="text"
                    placeholder="Disaster title"
                    value={newDisaster.title}
                    onChange={(e) => setNewDisaster({...newDisaster, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Location name"
                    value={newDisaster.location_name}
                    onChange={(e) => setNewDisaster({...newDisaster, location_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                  <textarea
                    placeholder="Description"
                    value={newDisaster.description}
                    onChange={(e) => setNewDisaster({...newDisaster, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    rows={3}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Tags (comma-separated)"
                    value={newDisaster.tags}
                    onChange={(e) => setNewDisaster({...newDisaster, tags: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create Disaster</span>
                  </button>
                </form>

                {/* Disasters List */}
                <div className="space-y-3">
                  {loading && (
                    <div className="text-center py-4">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                      <p className="text-gray-500 mt-2">Loading disasters...</p>
                    </div>
                  )}
                  
                  {!loading && disasters.length === 0 && (
                    <div className="text-center py-8">
                      <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No disasters found. Create one to get started.</p>
                    </div>
                  )}

                  {disasters.map((disaster) => (
                    <div
                      key={disaster.id}
                      onClick={() => selectDisaster(disaster)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                        selectedDisaster?.id === disaster.id 
                          ? 'border-red-500 bg-red-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <h3 className="font-medium text-gray-900 mb-1">{disaster.title}</h3>
                      {disaster.location_name && (
                        <div className="flex items-center text-sm text-gray-600 mb-2">
                          <MapPin className="h-3 w-3 mr-1" />
                          {disaster.location_name}
                        </div>
                      )}
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{disaster.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {disaster.tags?.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Geocoding Test */}
            <div className="mt-6 bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Location Extraction</h3>
              <div className="space-y-3">
                <textarea
                  placeholder="Enter disaster description to extract location..."
                  value={geocodeInput}
                  onChange={(e) => setGeocodeInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
                <button
                  onClick={testGeocode}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Search className="h-4 w-4" />
                  <span>Extract & Geocode</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel - Disaster Details */}
          <div className="lg:col-span-2">
            {selectedDisaster ? (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedDisaster.title}</h2>
                      {selectedDisaster.location_name && (
                        <div className="flex items-center text-gray-600 mb-2">
                          <MapPin className="h-4 w-4 mr-2" />
                          {selectedDisaster.location_name}
                        </div>
                      )}
                      <p className="text-gray-700">{selectedDisaster.description}</p>
                    </div>
                  </div>

                  {/* Tab Navigation */}
                  <div className="border-b border-gray-200 mb-6">
                    <nav className="flex space-x-8">
                      {[
                        { id: 'reports', label: 'Social Reports', icon: MessageCircle, count: socialReports.length },
                        { id: 'resources', label: 'Resources', icon: Users, count: resources.length },
                        { id: 'updates', label: 'Official Updates', icon: Shield, count: updates.length }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                            activeTab === tab.id
                              ? 'border-red-500 text-red-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <tab.icon className="h-4 w-4" />
                          <span>{tab.label}</span>
                          {tab.count > 0 && (
                            <span className="bg-gray-100 text-gray-600 px-2 py-1 text-xs rounded-full">
                              {tab.count}
                            </span>
                          )}
                        </button>
                      ))}
                    </nav>
                  </div>

                  {/* Tab Content */}
                  {activeTab === 'reports' && (
                    <div className="space-y-6">
                      {/* Submit Report Form */}
                      <form onSubmit={submitReport} className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-medium text-gray-900 mb-3">Submit Report</h3>
                        <div className="space-y-3">
                          <textarea
                            placeholder="Report details..."
                            value={newReport.content}
                            onChange={(e) => setNewReport({...newReport, content: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                            rows={3}
                            required
                          />
                          <input
                            type="url"
                            placeholder="Image URL (optional)"
                            value={newReport.image_url}
                            onChange={(e) => setNewReport({...newReport, image_url: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                          <button
                            type="submit"
                            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                          >
                            Submit Report
                          </button>
                        </div>
                      </form>

                      {/* Social Reports */}
                      <div className="space-y-4">
                        {socialReports.map((report) => (
                          <div key={report.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">@{report.user}</span>
                                <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(report.priority)}`}>
                                  {report.priority}
                                </span>
                              </div>
                              <span className="text-sm text-gray-500">
                                {new Date(report.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-gray-700 mb-2">{report.content}</p>
                            <div className="flex items-center text-sm text-gray-600">
                              <MapPin className="h-3 w-3 mr-1" />
                              {report.location}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'resources' && (
                    <div className="space-y-4">
                      {resources.map((resource) => (
                        <div key={resource.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-medium text-gray-900">{resource.name}</h3>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              resource.availability_status === 'available' ? 'bg-green-100 text-green-800' :
                              resource.availability_status === 'limited' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {resource.availability_status}
                            </span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600 mb-1">
                            <MapPin className="h-3 w-3 mr-1" />
                            {resource.location_name}
                            {resource.distance_km && (
                              <span className="ml-2 text-gray-500">
                                ({resource.distance_km.toFixed(1)} km away)
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            Type: {resource.type}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'updates' && (
                    <div className="space-y-4">
                      {updates.map((update) => (
                        <div key={update.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-blue-600">{update.source}</span>
                              <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(update.priority)}`}>
                                {update.priority}
                              </span>
                            </div>
                            <span className="text-sm text-gray-500">
                              {new Date(update.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <h3 className="font-medium text-gray-900 mb-2">{update.title}</h3>
                          <p className="text-gray-700">{update.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
                <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Disaster</h3>
                <p className="text-gray-600">Choose a disaster from the list to view details, reports, resources, and official updates.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;