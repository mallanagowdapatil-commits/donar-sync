import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'Authentication token required. Please log in.',
      code: 'AUTH_REQUIRED'
    });
  }

  // Explicitly reject known mock tokens from broken client fallbacks
  if (token.startsWith('mock-') || token.includes('mock-jwt')) {
    return res.status(401).json({
      error: 'Invalid session token. Please re-authenticate.',
      code: 'INVALID_TOKEN'
    });
  }

  jwt.verify(token, config.jwtSecret, (err, decodedUser) => {
    if (err) {
      const isExpired = err.name === 'TokenExpiredError';
      return res.status(403).json({
        error: isExpired ? 'Your session has expired. Please log in again.' : 'Invalid authentication token.',
        code: isExpired ? 'TOKEN_EXPIRED' : 'FORBIDDEN'
      });
    }

    req.user = decodedUser;
    next();
  });
}

export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.', code: 'AUTH_REQUIRED' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access forbidden: Requires one of [${allowedRoles.join(', ')}] role privileges.`,
        code: 'ROLE_UNAUTHORIZED'
      });
    }

    next();
  };
}

export function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token || token.startsWith('mock-')) {
    req.user = null;
    return next();
  }

  jwt.verify(token, config.jwtSecret, (err, decodedUser) => {
    if (!err) {
      req.user = decodedUser;
    } else {
      req.user = null;
    }
    next();
  });
}
