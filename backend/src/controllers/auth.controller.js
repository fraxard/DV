const authService = require('../services/auth.service');

const setSessionCookie = (res, sessionId, expiresAt) => {
  res.cookie('dv_session', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    expires: expiresAt,
    path: '/',
  });
};

const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      error: {
        message: 'Name, email, and password are required.',
      },
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      error: {
        message: 'Password must be at least 8 characters long.',
      },
    });
  }

  const { user, session } = await authService.register({
    name,
    email,
    password,
  });

  setSessionCookie(res, session.id, session.expiresAt);

  return res.status(201).json({
    user,
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: {
        message: 'Email and password are required.',
      },
    });
  }

  const { user, session } = await authService.login({
    email,
    password,
  });

  setSessionCookie(res, session.id, session.expiresAt);

  return res.status(200).json({
    user,
  });
};

const logout = async (req, res) => {
  const sessionId = req.cookies.dv_session;

  await authService.logout(sessionId);

  res.clearCookie('dv_session', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  });

  return res.status(204).send();
};

const me = async (req, res) => {
  return res.status(200).json({
    user: req.user,
  });
};

module.exports = {
  register,
  login,
  logout,
  me,
};