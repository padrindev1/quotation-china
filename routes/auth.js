const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body } = require('express-validator');
const { getDb } = require('../db/database');
const { handleValidationErrors } = require('../middleware/security');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('Senha muito curta'),
], handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = getDb();

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    const hashToCompare = user?.password_hash || '$2a$12$invalidhashfortimingatk';
    const isValid = await bcrypt.compare(password, hashToCompare);

    if (!user || !isValid || !user.is_active) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h', issuer: 'oktz-erp' },
    );

    const refreshToken = crypto.randomBytes(64).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(user.id);
    db.prepare(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address) VALUES (?, ?, ?, ?)'
    ).run(user.id, tokenHash, expiresAt, req.ip);

    db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(user.id);

    res.json({
      accessToken,
      refreshToken,
      mustChangePassword: !!user.must_change_password,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
      },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ error: 'Refresh token necessário' });

  try {
    const db = getDb();
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const stored = db.prepare(`
      SELECT rt.user_id, u.role, u.is_active
      FROM refresh_tokens rt
      JOIN users u ON rt.user_id = u.id
      WHERE rt.token_hash = ? AND rt.expires_at > datetime('now')
    `).get(tokenHash);

    if (!stored || !stored.is_active) {
      return res.status(401).json({ error: 'Refresh token inválido ou expirado' });
    }

    const accessToken = jwt.sign(
      { userId: stored.user_id, role: stored.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h', issuer: 'oktz-erp' },
    );
    res.json({ accessToken });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/logout', authenticate, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(req.user.id);
  res.json({ message: 'Logout realizado com sucesso' });
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

router.post('/change-password', authenticate, [
  body('currentPassword').notEmpty().withMessage('Senha atual obrigatória'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('Mínimo 8 caracteres')
    .matches(/[A-Z]/).withMessage('Deve conter letra maiúscula')
    .matches(/[0-9]/).withMessage('Deve conter número')
    .matches(/[@$!%*?&#]/).withMessage('Deve conter caractere especial (@$!%*?&#)'),
], handleValidationErrors, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const db = getDb();
  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);

  const isValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isValid) return res.status(400).json({ error: 'Senha atual incorreta' });

  const newHash = await bcrypt.hash(newPassword, 12);
  db.prepare("UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = datetime('now') WHERE id = ?")
    .run(newHash, req.user.id);
  db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(req.user.id);

  res.json({ message: 'Senha alterada com sucesso. Faça login novamente.' });
});

module.exports = router;
