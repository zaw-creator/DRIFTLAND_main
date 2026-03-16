import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 8 * 60 * 60 * 1000, // 8 hours
};

// POST /api/auth/login
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.cookie('adminToken', token, COOKIE_OPTIONS);
    res.json({ success: true, user: { email: user.email, role: user.role } });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
}

// POST /api/auth/logout  (requires verifyToken)
export function logout(req, res) {
  res.clearCookie('adminToken');
  res.json({ success: true });
}

// GET /api/auth/me  (requires verifyToken)
export function me(req, res) {
  res.json({ success: true, user: req.user });
}
