import { NextRequest, NextResponse } from 'next/server';

// Lead-capture only -- no KYC document upload here (license/registration
// photos, background check) by design. That happens later inside the real
// Woyo app once a candidate has the app installed, matching how the
// existing driver.controller.js's uploadKycDocument/submitKyc flow already
// works for authenticated drivers -- this form is just step zero: capture
// interest and contact details so a human can follow up.
interface RegistrationPayload {
  name: string;
  phone: string;
  email?: string;
  city: string;
  vehicleType: string;
  hasLicense: boolean;
  message?: string;
}

function isValidPayload(body: unknown): body is RegistrationPayload {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.name === 'string' &&
    b.name.trim().length >= 2 &&
    typeof b.phone === 'string' &&
    b.phone.trim().length >= 8 &&
    typeof b.city === 'string' &&
    b.city.trim().length >= 2 &&
    typeof b.vehicleType === 'string' &&
    b.vehicleType.trim().length >= 2 &&
    typeof b.hasLicense === 'boolean' &&
    (b.email === undefined || typeof b.email === 'string') &&
    (b.message === undefined || typeof b.message === 'string')
  );
}

// Simple in-memory rate limit per pod -- good enough for a low-traffic lead
// form; not meant to survive restarts or coordinate across replicas.
const submissionLog = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 3;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (submissionLog.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  timestamps.push(now);
  submissionLog.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT_MAX;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!isValidPayload(body)) {
    return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
  }

  const apiKey = process.env.BREVO_API_KEY;
  const notifyEmail = process.env.DRIVER_NOTIFICATION_EMAIL;
  const fromEmail = process.env.NOTIFICATION_FROM_EMAIL;

  if (!apiKey || !notifyEmail || !fromEmail) {
    // Misconfiguration, not a user error -- log server-side, don't leak
    // internals to the client.
    console.error('driver-registration: missing BREVO_API_KEY / DRIVER_NOTIFICATION_EMAIL / NOTIFICATION_FROM_EMAIL');
    return NextResponse.json({ error: 'Registration is temporarily unavailable' }, { status: 503 });
  }

  const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const htmlContent = `
    <h2>Nouvelle candidature chauffeur Woyo</h2>
    <p><strong>Nom :</strong> ${escapeHtml(body.name)}</p>
    <p><strong>Telephone :</strong> ${escapeHtml(body.phone)}</p>
    <p><strong>Email :</strong> ${body.email ? escapeHtml(body.email) : 'Non fourni'}</p>
    <p><strong>Ville :</strong> ${escapeHtml(body.city)}</p>
    <p><strong>Vehicule :</strong> ${escapeHtml(body.vehicleType)}</p>
    <p><strong>Permis de conduire valide :</strong> ${body.hasLicense ? 'Oui' : 'Non'}</p>
    ${body.message ? `<p><strong>Message :</strong> ${escapeHtml(body.message)}</p>` : ''}
  `;

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: fromEmail, name: 'Woyo — Candidatures chauffeur' },
        to: [{ email: notifyEmail }],
        replyTo: body.email ? { email: body.email, name: body.name } : undefined,
        subject: `Nouvelle candidature chauffeur — ${body.name}`,
        htmlContent,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('driver-registration: Brevo send failed', res.status, errText);
      return NextResponse.json({ error: 'Could not submit registration' }, { status: 502 });
    }
  } catch (err) {
    console.error('driver-registration: Brevo request threw', err);
    return NextResponse.json({ error: 'Could not submit registration' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
