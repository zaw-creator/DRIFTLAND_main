import express from 'express';
import { login, logout, getMe } from '../controllers/authController.js';

const router = express.Router();

router.post('/login', login);
router.post('/logout', logout);
router.get('/me', getMe);

export default router;