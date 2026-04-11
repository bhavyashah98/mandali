import express from 'express';
import path from 'path';

const router = express.Router();

router.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, '../legal/privacy-policy.html'));
});

router.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, '../legal/terms-of-service.html'));
});

router.get('/logo.png', (req, res) => {
  res.sendFile(path.join(__dirname, '../legal/logo.png'));
});

export default router;
