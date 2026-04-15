import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId    = payload.sub;
    req.userEmail = payload.email;
    req.userRole  = payload.role;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const requireAdmin = (req, res, next) => {
  requireAuth(req, res, () => {
    if (req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  });
};
