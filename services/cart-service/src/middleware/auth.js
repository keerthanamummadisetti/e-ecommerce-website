const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'superSecuredAndReallyLongSecretKeyForShopNowJWTTokenValidation2026';

const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  // If target userId starts with guest:, allow it to proceed without token
  const targetUserId = req.params.userId;
  if (targetUserId && targetUserId.startsWith('guest:')) {
    req.isGuest = true;
    return next();
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Missing or malformed Authorization header.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      userId: decoded.userId,
      email: decoded.sub || decoded.email,
      role: decoded.role
    };

    // Ensure the user is only modifying their own cart
    if (targetUserId && targetUserId !== decoded.userId && decoded.role !== 'ADMIN') {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Access denied to other user cart.' });
    }
    
    req.isGuest = false;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid or expired access token.' });
  }
};

module.exports = {
  authenticate
};
