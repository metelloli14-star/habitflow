// Letters with one-time codes. Plain, readable, no tracking pixels or external images.

import type { CodePurpose } from '@/db/schema';
import { OPERATOR } from '@/lib/shared/legal';
import type { Mail } from './mailer';

const COPY: Record<CodePurpose, { subject: string; lead: string }> = {
  verify: { subject: 'Подтвердите email', lead: 'Чтобы закончить регистрацию в «Привычке», введите этот код:' },
  reset: { subject: 'Код для восстановления пароля', lead: 'Чтобы задать новый пароль в «Привычке», введите этот код:' },
  email: { subject: 'Подтвердите новый email', lead: 'Чтобы сменить email в «Привычке» на этот адрес, введите код:' },
};

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function codeEmail(to: string, purpose: CodePurpose, code: string, ttlMinutes: number): Mail {
  const { subject, lead } = COPY[purpose];
  const ignore = 'Если вы этого не запрашивали, просто проигнорируйте письмо — без кода ничего не изменится.';
  const footer = `${OPERATOR.serviceName} · ${OPERATOR.siteUrl} · ${OPERATOR.email}`;
  return {
    to,
    subject: `${subject} — ${code}`,
    text: `${lead}\n\n${code}\n\nКод действует ${ttlMinutes} минут.\n\n${ignore}\n\n${footer}`,
    html: `<!DOCTYPE html><html lang="ru"><body style="margin:0;padding:24px;background:#eef3f7;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#1a2b38">
<table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:20px;padding:32px">
<tr><td>
<p style="margin:0 0 4px;font-size:13px;font-weight:700;letter-spacing:.08em;color:#6caca5">ПРИВЫЧКА</p>
<h1 style="margin:0 0 16px;font-size:22px">${escape(subject)}</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#607d8e">${escape(lead)}</p>
<p style="margin:0 0 20px;font-size:34px;font-weight:800;letter-spacing:.3em;color:#1a2b38">${code}</p>
<p style="margin:0 0 20px;font-size:14px;color:#607d8e">Код действует ${ttlMinutes} минут.</p>
<p style="margin:0;font-size:13px;line-height:1.5;color:#8aa0ae">${escape(ignore)}</p>
</td></tr></table>
<p style="max-width:480px;margin:16px auto 0;font-size:12px;color:#8aa0ae;text-align:center">${escape(footer)}</p>
</body></html>`,
  };
}
