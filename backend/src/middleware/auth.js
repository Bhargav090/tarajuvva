const jwt = require('jsonwebtoken');

function invalidTokenResponse(res, err) {
  const expired = err?.name === 'TokenExpiredError';
  return res.status(401).json({
    success: false,
    code: expired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
    message: expired ? 'Session expired' : 'Invalid token',
  });
}

const authenticateAdmin = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Access denied' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin access required' });
    req.admin = decoded;
    next();
  } catch (err) {
    invalidTokenResponse(res, err);
  }
};

const authenticateUser = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Login required' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    invalidTokenResponse(res, err);
  }
};

// Optional auth — attaches user if token present, continues either way
const optionalAuth = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (token) {
    try { req.user = jwt.verify(token, process.env.JWT_SECRET); } catch {}
  }
  next();
};

module.exports = { authenticateAdmin, authenticateUser, optionalAuth, invalidTokenResponse };
