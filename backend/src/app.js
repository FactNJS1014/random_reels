import './config/env.js';
import express from 'express';
import cors from 'cors';
import commonRandomRoutes from './routes/commonRandomRoutes.js';
import memberRoutes from './routes/memberRoutes.js';
import { checkConnection } from './config/db.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (_req, res) => {
  try {
    await checkConnection();
    res.json({ success: true, data: { status: 'ok', database: 'connected' } });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้',
      error: error.message,
    });
  }
});

app.use('/api/common-random', commonRandomRoutes);
app.use('/api/members', memberRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: `ไม่พบ endpoint ${req.method} ${req.originalUrl}` });
});

// eslint-disable-next-line no-unused-vars
app.use((error, _req, res, _next) => {
  console.error('[API ERROR]', error.message);

  if (error.number === 2627 || error.number === 2601) {
    return res.status(409).json({ success: false, message: 'ข้อมูลซ้ำกับที่มีอยู่ในฐานข้อมูล' });
  }

  if (error.name === 'ConnectionError' || error.code === 'ESOCKET' || error.code === 'ELOGIN') {
    return res.status(503).json({
      success: false,
      message: 'ไม่สามารถเชื่อมต่อฐานข้อมูล SQL Server ได้',
      error: error.message,
    });
  }

  return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์', error: error.message });
});

export default app;
