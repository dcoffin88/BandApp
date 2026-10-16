import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Verify SMTP connection
app.post('/api/smtp/verify', async (req, res) => {
  try {
    const { host, port, encryption, username, password } = req.body;

    if (!host) {
      return res.status(400).json({ success: false, message: 'SMTP host is required' });
    }

    const secure = encryption === 'ssl' || Number(port) === 465;
    const transporter = nodemailer.createTransport({
      host,
      port: Number(port) || 587,
      secure,
      auth: username ? { user: username, pass: password || '' } : undefined,
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      tls: {
        rejectUnauthorized: false,
      },
    });

    await transporter.verify();
    return res.json({
      success: true,
      message: `Successfully connected and authenticated to ${host}:${port} (${encryption.toUpperCase()})`,
    });
  } catch (error: any) {
    console.error('SMTP verify error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'SMTP server connection or authentication failed.',
    });
  }
});

// Send notification email
app.post('/api/smtp/send', async (req, res) => {
  try {
    const { to, toName, subject, html, smtpSettings } = req.body;

    if (!to) {
      return res.status(400).json({ success: false, message: 'Recipient email address is required' });
    }

    if (!smtpSettings || !smtpSettings.isEnabled) {
      return res.json({
        success: true,
        status: 'simulated',
        message: 'SMTP is disabled. Notification recorded to simulated band outbox.',
      });
    }

    // If host and credentials are present, attempt actual delivery via nodemailer
    if (smtpSettings.host && smtpSettings.username && smtpSettings.password) {
      const secure = smtpSettings.encryption === 'ssl' || Number(smtpSettings.port) === 465;

      const transporter = nodemailer.createTransport({
        host: smtpSettings.host,
        port: Number(smtpSettings.port) || 587,
        secure,
        auth: {
          user: smtpSettings.username,
          pass: smtpSettings.password,
        },
        connectionTimeout: 10000,
        tls: {
          rejectUnauthorized: false,
        },
      });

      const senderFrom = `"${smtpSettings.fromName || 'BandJam'}" <${smtpSettings.fromEmail || smtpSettings.username}>`;

      const info = await transporter.sendMail({
        from: senderFrom,
        to: toName ? `"${toName}" <${to}>` : to,
        replyTo: smtpSettings.replyTo || undefined,
        subject: subject || 'Band Notification',
        html: html || '<p>Band notification message</p>',
      });

      console.log('Real email delivered via SMTP:', info.messageId);
      return res.json({
        success: true,
        status: 'sent',
        messageId: info.messageId,
        message: `Email successfully delivered to ${to} via ${smtpSettings.host}`,
      });
    } else {
      // Mock / Simulated delivery when password or host is pending
      return res.json({
        success: true,
        status: 'simulated',
        message: 'Credentials incomplete for live external relay; logged to band outbox.',
      });
    }
  } catch (error: any) {
    console.error('SMTP send error:', error);
    return res.status(500).json({
      success: false,
      status: 'failed',
      message: error.message || 'Failed to dispatch email over SMTP.',
    });
  }
});

// Vite server middleware setup
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`BandJam server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
