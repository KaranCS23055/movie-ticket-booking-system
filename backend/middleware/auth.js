const { findUserById } = require('../db');

/**
 * Encodes session payload to base64 token string
 * @param {Object} user
 * @returns {string} Token
 */
function generateToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    issuedAt: Date.now()
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * Decodes base64 token
 * @param {string} token
 * @returns {Object|null}
 */
function verifyToken(token) {
  try {
    const raw = Buffer.from(token, 'base64').toString('utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.userId) return null;
    return parsed;
  } catch (err) {
    return null;
  }
}

/**
 * Authentication middleware
 * Checks Bearer token in Authorization header or x-user-id fallback
 */
async function authenticate(req, res, next) {
  let token = null;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers['x-auth-token']) {
    token = req.headers['x-auth-token'];
  }

  let userId = null;
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      userId = decoded.userId;
    }
  } else if (req.headers['x-user-id']) {
    // Convenient fallback for automated tests and Postman
    userId = req.headers['x-user-id'];
  }

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized. Please provide a valid authentication token.'
    });
  }

  try {
    const user = await findUserById(userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid authentication session. User not found.'
      });
    }

    // Attach safe user object without password
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Authentication check failed due to server error.'
    });
  }
}

/**
 * Admin role authorization middleware
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden. Admin privileges required to perform this action.'
    });
  }
  next();
}

module.exports = {
  generateToken,
  verifyToken,
  authenticate,
  requireAdmin
};
