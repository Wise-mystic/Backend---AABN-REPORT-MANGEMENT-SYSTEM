import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export function authenticate(req, res, next) {
  const bearer = (req.headers.authorization || '').startsWith('Bearer ')
    ? (req.headers.authorization || '').slice(7)
    : null;
  const token = req.cookies?.token || bearer;
  if (!token) return res.status(401).json({ success: false, error: 'unauthorized', message: 'Missing token' });

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'unauthorized', message: 'Invalid token' });
  }
}

export function signJwtForUser(user) {
  const payload = { sub: user.id, role: user.role };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '24h' });
}


