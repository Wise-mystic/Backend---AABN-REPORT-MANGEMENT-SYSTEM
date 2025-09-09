export function requireRole(minRole) {
  const order = { 'member': 1, 'manager': 2, 'admin': 3 };
  return (req, res, next) => {
    const role = req.membership?.role || 'member';
    if (order[role] >= order[minRole]) return next();
    return res.status(403).json({ success: false, error: 'forbidden', message: 'Insufficient role' });
  };
}


