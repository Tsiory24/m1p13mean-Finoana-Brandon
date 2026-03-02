const nodemailer = require('nodemailer');

// ── Vérification de la configuration au démarrage ─────────────────────────
const PLACEHOLDERS = ['VOTRE_EMAIL@gmail.com', 'votre_email@gmail.com', 'votre@email.com'];

function isConfigured() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  return (
    user && pass &&
    !PLACEHOLDERS.includes(user) &&
    pass !== 'VOTRE_APP_PASSWORD_GMAIL' &&
    pass !== 'votre_mot_de_passe_app' &&
    pass.length > 4
  );
}

let guideShown = false;
function showSetupGuide() {
  if (guideShown) return;
  guideShown = true;
  console.log('\n\x1b[33m' + '═'.repeat(62));
  console.log('  ⚠  SMTP non configuré — les emails ne seront PAS envoyés');
  console.log('═'.repeat(62));
  console.log('  Pour envoyer de vrais emails avec Gmail :');
  console.log('');
  console.log('  1. Activez la validation en 2 étapes :');
  console.log('     myaccount.google.com › Sécurité › Validation en 2 étapes');
  console.log('');
  console.log('  2. Créez un mot de passe d\'application :');
  console.log('     Sécurité › ... › Mots de passe des applications');
  console.log('     Choisissez «Autre» (nom libre) → Copier les 16 caractères');
  console.log('');
  console.log('  3. Dans backend/.env, remplacez :');
  console.log('     SMTP_USER=VOTRE_EMAIL@gmail.com  → votrecompte@gmail.com');
  console.log('     SMTP_PASS=VOTRE_APP_PASSWORD_GMAIL  → les 16 caractères');
  console.log('     SMTP_FROM="Centre Commercial <votrecompte@gmail.com>"');
  console.log('');
  console.log('  4. Redémarrez le serveur.');
  console.log('═'.repeat(62) + '\x1b[0m\n');
}

// ── Création du transporteur (singleton mis en cache) ─────────────────────
// Le transporter est créé une seule fois et réutilisé pour tous les envois.
// pool:true maintient des connexions SMTP ouvertes → évite le handshake TLS à chaque email.
let _transporterCache = null;

async function createTransporter() {
  if (!isConfigured()) {
    showSetupGuide();
    return null;
  }

  // Réutiliser le transporter existant si déjà créé
  if (_transporterCache) {
    return _transporterCache;
  }

  const t = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    pool: true,          // Réutilise les connexions SMTP ouvertes
    maxConnections: 3,   // Max connexions simultanées
    maxMessages: 100     // Messages par connexion avant renouvellement
  });

  try {
    await t.verify();
    console.log('\x1b[32m[Mailer] ✓ Connexion SMTP OK (' + process.env.SMTP_USER + ')\x1b[0m');
    _transporterCache = t;
    return t;
  } catch (err) {
    console.error('\x1b[31m[Mailer] ✗ Connexion SMTP échouée :', err.message, '\x1b[0m');
    showSetupGuide();
    return null;
  }
}

/**
 * Réinitialise le cache du transporter (utile si les variables d'env changent).
 */
function resetTransporter() {
  if (_transporterCache) {
    _transporterCache.close();
    _transporterCache = null;
  }
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

// ── Envoi ──────────────────────────────────────────────────────────────────
/**
 * Envoie le code OTP par email.
 * @returns {{ sent: boolean }}
 */
async function sendVerificationCode(to, code) {
  const siteName = process.env.SITE_NAME || 'Centre Commercial';
  const transporter = await createTransporter();

  if (!transporter) {
    console.warn(`[Mailer] Email NON envoyé à ${to} (SMTP non configuré).`);
    return { sent: false };
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: `${code} — Votre code de vérification | ${siteName}`,
    text: `Votre code de vérification est : ${code}\n\nCe code est valable 10 minutes.\nSi vous n'avez pas demandé ce code, ignorez cet email.`,
    html: buildEmailHtml(code)
  });

  console.log(`[Mailer] ✓ Code OTP envoyé à ${to}`);
  return { sent: true };
}

module.exports = { sendVerificationCode, isConfigured, resetTransporter, warmUp: createTransporter };
