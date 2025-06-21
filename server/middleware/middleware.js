export const logger = (level, message) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
};

export const errorHandler = (err, req, res, next) => {
  logger('error', `${err.message} - ${req.method} ${req.path}`);
  
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
};

export const authenticateUser = (req, res, next) => {
  // Mock authentication - hardcoded users
  const mockUsers = {
    'netrunnerX': { id: 'netrunnerX', role: 'admin' },
    'reliefAdmin': { id: 'reliefAdmin', role: 'admin' },
    'citizen1': { id: 'citizen1', role: 'contributor' }
  };

  const userId = req.headers['x-user-id'] || 'netrunnerX';
  const user = mockUsers[userId];

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.user = user;
  next();
};