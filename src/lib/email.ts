/** Helpers para abrir o Gmail Web (compose) numa nova aba. */
import { openExternalUrl } from './openUrl';

export function buildGmailComposeUrl(opts: { to?: string; subject?: string; body?: string; cc?: string; bcc?: string }) {
  const params = new URLSearchParams();
  params.set('view', 'cm');
  params.set('fs', '1');
  if (opts.to) params.set('to', opts.to);
  if (opts.cc) params.set('cc', opts.cc);
  if (opts.bcc) params.set('bcc', opts.bcc);
  if (opts.subject) params.set('su', opts.subject);
  if (opts.body) params.set('body', opts.body);
  return `https://mail.google.com/mail/?${params.toString()}`;
}

export function openGmailCompose(opts: { to?: string; subject?: string; body?: string; cc?: string; bcc?: string }) {
  openExternalUrl(buildGmailComposeUrl(opts));
}
