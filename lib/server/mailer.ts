// Email sending over SMTP of a Russian mail service (Yandex 360, Mail.ru, Unisender SMTP…),
// so users' addresses aren't sent abroad (see the privacy policy).
//
// .env.local:
//   SMTP_HOST=smtp.yandex.ru   SMTP_PORT=465   SMTP_USER=no-reply@poleznyeprivychki.ru
//   SMTP_PASS=<app password>   MAIL_FROM="Привычка <no-reply@poleznyeprivychki.ru>"
//
// Not configured: in development the letter is printed to the server console (and the code is shown on screen);
// in production sending fails with a clear message instead of silently losing the letter.

import type { Transporter } from 'nodemailer';
import { ApiError } from './http';

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export function mailerConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transport: Transporter | null = null;

async function getTransport(): Promise<Transporter> {
  if (transport) return transport;
  const nodemailer = await import('nodemailer'); // loaded only when SMTP is configured
  const port = Number(process.env.SMTP_PORT || 465);
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transport;
}

export async function sendMail(mail: Mail): Promise<void> {
  if (!mailerConfigured()) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[mail] SMTP is not configured — set SMTP_HOST, SMTP_USER, SMTP_PASS');
      throw new ApiError(503, 'Отправка писем временно недоступна. Попробуйте позже', 'mail_unavailable');
    }
    console.info(`[mock-email] Кому: ${mail.to} | ${mail.subject}\n${mail.text}`);
    return;
  }
  try {
    await (await getTransport()).sendMail({
      from: process.env.MAIL_FROM || `"Привычка" <${process.env.SMTP_USER}>`,
      ...mail,
    });
  } catch (err) {
    console.error('[mail] sending failed:', err);
    throw new ApiError(502, 'Не удалось отправить письмо. Попробуйте ещё раз', 'mail_failed');
  }
}
