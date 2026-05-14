const jwt = require('jsonwebtoken');
const { getDb } = require('../db/database');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Autenticação necessária', code: 'NO_TOKEN' });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { issuer: 'oktz-erp' });
    const db = getDb();
    const user = db.prepare(
      'SELECT id, name, email, role, department, is_active, must_change_password FROM users WHERE id = ?'
    ).get(decoded.userId);

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Usuário inativo ou não encontrado' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Sessão expirada', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Token inválido', code: 'INVALID_TOKEN' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permissão insuficiente para esta ação' });
    }
    next();
  };
}

function auditLog(action, resource) {
  return (req, res, next) => {
    const db = getDb();
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode < 400 && req.user) {
        try {
          db.prepare(`
            INSERT INTO audit_logs (user_id, action, resource, resource_id, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(
            req.user.id,
            action,
            resource,
            body?.id || req.params?.id || null,
            req.ip,
            req.headers['user-agent']?.substring(0, 250) || null,
          );
        } catch (_) {}
      }
      return originalJson(body);
    };
    next();
  };
}

module.exports = { authenticate, authorize, auditLog };
