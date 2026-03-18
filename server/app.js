import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './config/database.js';
import createAdminUser from './utils/createAdminUser.js';
import authRoutes from './routes/auth.js';
import eventRoutes from './routes/events.js';
import adminEventRoutes from './routes/admin/events.js';

const app = express();

connectDB().then(() => createAdminUser());

app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      process.env.CLIENT_URL,
    ];
    if (!origin || allowedOrigins.includes(origin) || origin.match(/https:\/\/.*\.vercel\.app$/)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/api/events', eventRoutes);

app.use('/api/auth', authRoutes);

app.use('/api/admin/events', adminEventRoutes);



app.get('/health', (req, res) => {
  console.log(`[${new Date().toLocaleTimeString()}] Server pinged!`);
  res.json({ status: 'OK', message: 'Server is running' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;