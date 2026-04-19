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

router.get('/delete-account', (req, res) => {
  res.sendFile(path.join(__dirname, '../legal/delete-account.html'));
});

router.get('/support', (req, res) => {
  res.sendFile(path.join(__dirname, '../legal/support.html'));
});

router.post('/support', (req, res) => {
  const { name, email, message } = req.body;
  
  console.log('--- NEW SUPPORT REQUEST ---');
  console.log(`Name: ${name}`);
  console.log(`Email: ${email}`);
  console.log(`Message: ${message}`);
  console.log('---------------------------');

  // TODO: Add nodemailer logic here to send email to bhavyashah9873@gmail.com
  
  res.redirect('/support?status=success');
});

export default router;
