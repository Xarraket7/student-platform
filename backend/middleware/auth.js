const jwt = require('jsonwebtoken');
require('dotenv').config();

const SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_this';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name, avatar: user.avatar },
    SECRET,
    { expiresIn: '7d' }
  );
}

function verifyToken(req, res, next) {
  const token = req.cookies?.token;
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    req.user = null;
    next();
  }
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Необходимо авторизоваться' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ только для администратора' });
  }
  next();
}

module.exports = { generateToken, verifyToken, requireAuth, requireAdmin, SECRET };
