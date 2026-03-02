const { BrevoClient } = require('@getbrevo/brevo');

// ── Vérification de la configuration au démarrage ─────────────────────────
function isConfigured() {
  const apiKey = process.env.BREVO_API_KEY;
  return (
    apiKey &&
    apiKey !== 'xkeysib-votre-cle-api-brevo' &&
    apiKey.length > 10
  );
}

let guideShown = false;
function showSetupGuide() {
  if (guideShown) return;
  guideShown = true;
  console.log('\n\x1b[33m' + '═'.repeat(62));
  console.log('  ⚠  Brevo non configuré — les emails ne seront PAS envoyés');
  console.log('═'.repeat(62));
  console.log('  Pour envoyer des emails avec Brevo (API) :');
  console.log('');
  console.log('  1. Créez un compte sur https://www.brevo.com');
  console.log('');
  console.log('  2. Allez dans Settings › SMTP & API › API Keys');
  console.log('     Créez une clé API (commence par "xkeysib-...")');
  console.log('');
  console.log('  3. Vérifiez votre adresse d\'expéditeur :');
  console.log('     Settings › Senders & IPs › Add a sender');
  console.log('');
  console.log('  4. Dans backend/.env, renseignez :');
  console.log('     BREVO_API_KEY=xkeysib-votre-cle-api');
  console.log('     BREVO_SENDER_EMAIL=expediteur@domaine.com');
  console.log('     BREVO_SENDER_NAME=Centre Commercial');
  console.log('');
  console.log('  5. Redémarrez le serveur.');
  console.log('═'.repeat(62) + '\x1b[0m\n');
}

// ── Client Brevo (singleton) ──────────────────────────────────────────────
let _client = null;
function getClient() {
  if (!_client && isConfigured()) {
    _client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });
  }
  return _client;
}

// ── Template HTML ──────────────────────────────────────────────────────────
function buildEmailHtml(code) {
  const siteName = process.env.SITE_NAME || 'Centre Commercial';
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f7f7f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="480" cellpadding="0" cellspacing="0"
               style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#1a2744;padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:1.5rem;font-weight:700;color:#fff;">${siteName}</p>
              <p style="margin:8px 0 0;font-size:0.85rem;color:rgba(255,255,255,0.6);">
                Vérification de votre adresse email
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;font-size:0.95rem;color:#444;">Bonjour,</p>
              <p style="margin:0 0 24px;font-size:0.95rem;color:#444;line-height:1.6;">
                Voici votre code de vérification pour finaliser votre inscription :
              </p>
              <div style="text-align:center;margin:0 0 24px;">
                <span style="display:inline-block;background:#f7f7f5;border:2px dashed #c9963a;
                             border-radius:10px;padding:16px 40px;font-size:2.2rem;font-weight:700;
                             letter-spacing:10px;color:#1a2744;">
                  ${code}
                </span>
              </div>
              <p style="margin:0 0 8px;font-size:0.82rem;color:#888;text-align:center;">
                Ce code est valable pendant <strong>10 minutes</strong>.
              </p>
              <p style="margin:0;font-size:0.82rem;color:#bbb;text-align:center;">
                Si vous n'avez pas demandé ce code, ignorez cet email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f7f7f5;padding:16px 40px;text-align:center;border-top:1px solid #e8e8e4;">
              <p style="margin:0;font-size:0.75rem;color:#aaa;">
                &copy; ${new Date().getFullYear()} ${siteName} — Connexion sécurisée SSL
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Envoi via Brevo API ───────────────────────────────────────────────────
/**
 * Envoie le code OTP par email via l'API Brevo.
 * @returns {{ sent: boolean }}
 */
async function sendVerificationCode(to, code) {
  const siteName = process.env.SITE_NAME || 'Centre Commercial';

  if (!isConfigured()) {
    showSetupGuide();
    console.warn(`[Mailer] Email NON envoyé à ${to} (Brevo non configuré).`);
    return { sent: false };
  }

  const client = getClient();

  await client.transactionalEmails.sendTransacEmail({
    sender: {
      name: process.env.BREVO_SENDER_NAME || siteName,
      email: process.env.BREVO_SENDER_EMAIL
    },
    to: [{ email: to }],
    subject: `${code} — Votre code de vérification | ${siteName}`,
    textContent: `Votre code de vérification est : ${code}\n\nCe code est valable 10 minutes.\nSi vous n'avez pas demandé ce code, ignorez cet email.`,
    htmlContent: buildEmailHtml(code)
  });

  console.log(`[Mailer] ✓ Code OTP envoyé à ${to}`);
  return { sent: true };
}

// ── No-ops (compatibilité avec les imports existants) ─────────────────────
function resetTransporter() {
  _client = null;
}
async function warmUp() {
  if (!isConfigured()) {
    showSetupGuide();
  } else {
    console.log('\x1b[32m[Mailer] ✓ Brevo API configuré (' + process.env.BREVO_SENDER_EMAIL + ')\x1b[0m');
  }
}

module.exports = { sendVerificationCode, isConfigured, resetTransporter, warmUp };
