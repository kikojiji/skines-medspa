// Vercel Serverless Function — Resend email for gift card orders
// POST /api/send-gift-card
//
// Sends two emails per order:
//   1. Gift card email  → recipient (toEmail)
//   2. Admin copy       → info@skines.info
//
// From: Skines Gift Cards <giftcards@skines.info>
// (requires skines.info domain verified in Resend dashboard)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { amount, fromName, toName, toEmail, message, senderEmail } = req.body;

  if (!amount || !fromName || !toName || !toEmail || !senderEmail) {
    return res.status(400).json({ error: 'Champs obligatoires manquants.' });
  }

  const RESEND_API_KEY = 're_j1iTSFcS_Bs91LJaWUZPmL8cNZoXTGXUE';
  const FROM    = 'Skines Gift Cards <giftcards@skines.info>';
  const ADMIN   = 'info@skines.info';

  // ── Helper: send one email via Resend ──────────────────────────────────
  async function sendEmail({ to, subject, html }) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, to: [to], reply_to: senderEmail, subject, html }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(data));
    return data.id;
  }

  // ── 1. Gift card email → recipient ────────────────────────────────────
  const recipientHtml = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#1a0d07;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a0d07;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#2C1810;border-radius:8px;overflow:hidden;max-width:100%;">

        <!-- Header -->
        <tr><td style="background:#3A1E14;padding:32px 40px;text-align:center;border-bottom:1px solid rgba(201,169,110,0.25);">
          <p style="margin:0;font-size:11px;letter-spacing:0.35em;color:rgba(245,237,227,0.50);text-transform:uppercase;font-family:Arial,sans-serif;">S K I N E S</p>
          <p style="margin:4px 0 0;font-size:10px;letter-spacing:0.25em;color:rgba(245,237,227,0.35);text-transform:uppercase;font-family:Arial,sans-serif;">MED SPA · MONTRÉAL</p>
        </td></tr>

        <!-- Gold banner -->
        <tr><td style="background:#C9A96E;padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:13px;letter-spacing:0.28em;color:#2C1810;text-transform:uppercase;font-family:Arial,sans-serif;font-weight:700;">🎁 Vous avez reçu une Carte Cadeau</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:40px 40px 32px;">

          <p style="margin:0 0 24px;font-size:18px;color:#F5EDE3;font-family:Georgia,serif;line-height:1.5;">
            Bonjour <strong>${toName}</strong>,
          </p>
          <p style="margin:0 0 32px;font-size:14px;color:rgba(245,237,227,0.75);font-family:Arial,sans-serif;line-height:1.7;">
            <strong style="color:#F5EDE3;">${fromName}</strong> vous offre une expérience Skines Med Spa.<br>
            Votre carte cadeau d'une valeur de&nbsp;<strong style="color:#C9A96E;">${amount}</strong> est prête à être utilisée.
          </p>

          <!-- Card visual -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
            <tr><td style="background:linear-gradient(135deg,#3A1E14,#5C2E1A);border:1px solid rgba(201,169,110,0.35);border-radius:8px;padding:28px 32px;">
              <p style="margin:0;font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:rgba(201,169,110,0.60);font-family:Arial,sans-serif;">Carte Cadeau · Skines Med Spa</p>
              <p style="margin:10px 0 0;font-size:42px;color:#C9A96E;font-family:Georgia,serif;font-weight:400;line-height:1;">${amount}</p>
              <p style="margin:12px 0 0;font-size:11px;color:rgba(245,237,227,0.40);font-family:Arial,sans-serif;letter-spacing:0.12em;">Valable 12 mois · Tous soins Skines</p>
            </td></tr>
          </table>

          ${message ? `
          <!-- Personal message -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
            <tr><td style="background:rgba(201,169,110,0.07);border-left:2px solid #C9A96E;padding:16px 20px;border-radius:0 4px 4px 0;">
              <p style="margin:0;font-size:10px;letter-spacing:0.20em;text-transform:uppercase;color:rgba(201,169,110,0.65);font-family:Arial,sans-serif;">Message de ${fromName}</p>
              <p style="margin:10px 0 0;font-size:15px;color:rgba(245,237,227,0.88);font-family:Georgia,serif;font-style:italic;line-height:1.7;">&ldquo;${message}&rdquo;</p>
            </td></tr>
          </table>` : ''}

          <!-- How to redeem -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
            <tr><td style="background:rgba(201,169,110,0.08);border:1px solid rgba(201,169,110,0.18);border-radius:6px;padding:20px 24px;">
              <p style="margin:0;font-size:11px;letter-spacing:0.20em;text-transform:uppercase;color:#C9A96E;font-family:Arial,sans-serif;margin-bottom:10px;">Comment utiliser votre carte</p>
              <p style="margin:0;font-size:13px;color:rgba(245,237,227,0.72);font-family:Arial,sans-serif;line-height:1.7;">
                1. Réservez votre soin sur <strong style="color:#F5EDE3;">Fresha</strong> ou appelez-nous au <strong style="color:#F5EDE3;">+1 (438) 260-5660</strong><br>
                2. Mentionnez votre carte cadeau lors de la réservation<br>
                3. Présentez cet email lors de votre visite
              </p>
            </td></tr>
          </table>

          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
            <tr><td align="center">
              <a href="https://www.fresha.com/fr/a/skines-head-spa-montreal-19-av-shamrock-montreal-qc-lytdaphf"
                 style="display:inline-block;background:#C9A96E;color:#1A0D07;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;text-decoration:none;padding:16px 36px;border-radius:3px;">
                Réserver mon soin
              </a>
            </td></tr>
          </table>

        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#3A1E14;padding:20px 40px;text-align:center;border-top:1px solid rgba(201,169,110,0.12);">
          <p style="margin:0;font-size:10px;color:rgba(245,237,227,0.35);letter-spacing:0.15em;font-family:Arial,sans-serif;">
            SKINES MED SPA · 19 Av. Shamrock, Montréal · info@skines.info
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  // ── 2. Admin notification → info@skines.info ──────────────────────────
  const adminHtml = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#1a0d07;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a0d07;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#2C1810;border-radius:8px;overflow:hidden;max-width:100%;">

        <!-- Header -->
        <tr><td style="background:#3A1E14;padding:28px 40px;text-align:center;border-bottom:1px solid rgba(201,169,110,0.25);">
          <p style="margin:0;font-size:11px;letter-spacing:0.35em;color:rgba(245,237,227,0.50);text-transform:uppercase;font-family:Arial,sans-serif;">S K I N E S</p>
          <p style="margin:4px 0 0;font-size:10px;letter-spacing:0.25em;color:rgba(245,237,227,0.35);text-transform:uppercase;font-family:Arial,sans-serif;">MED SPA · MONTRÉAL</p>
        </td></tr>

        <!-- Banner -->
        <tr><td style="background:#C9A96E;padding:16px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;letter-spacing:0.28em;color:#2C1810;text-transform:uppercase;font-family:Arial,sans-serif;font-weight:700;">🎁 Nouvelle commande — Carte Cadeau</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0">

            <tr><td style="padding:12px 0;border-bottom:1px solid rgba(201,169,110,0.12);">
              <p style="margin:0;font-size:10px;letter-spacing:0.20em;text-transform:uppercase;color:rgba(245,237,227,0.40);font-family:Arial,sans-serif;">Montant</p>
              <p style="margin:5px 0 0;font-size:30px;color:#C9A96E;font-family:Georgia,serif;">${amount}</p>
            </td></tr>

            <tr><td style="padding:12px 0;border-bottom:1px solid rgba(201,169,110,0.12);">
              <p style="margin:0;font-size:10px;letter-spacing:0.20em;text-transform:uppercase;color:rgba(245,237,227,0.40);font-family:Arial,sans-serif;">De la part de</p>
              <p style="margin:5px 0 0;font-size:16px;color:#F5EDE3;font-family:Georgia,serif;">${fromName}</p>
              <p style="margin:3px 0 0;font-size:12px;color:rgba(245,237,227,0.50);font-family:Arial,sans-serif;">${senderEmail}</p>
            </td></tr>

            <tr><td style="padding:12px 0;border-bottom:1px solid rgba(201,169,110,0.12);">
              <p style="margin:0;font-size:10px;letter-spacing:0.20em;text-transform:uppercase;color:rgba(245,237,227,0.40);font-family:Arial,sans-serif;">Pour</p>
              <p style="margin:5px 0 0;font-size:16px;color:#F5EDE3;font-family:Georgia,serif;">${toName}</p>
              <p style="margin:3px 0 0;font-size:12px;color:rgba(245,237,227,0.50);font-family:Arial,sans-serif;">${toEmail}</p>
            </td></tr>

            ${message ? `
            <tr><td style="padding:12px 0;border-bottom:1px solid rgba(201,169,110,0.12);">
              <p style="margin:0;font-size:10px;letter-spacing:0.20em;text-transform:uppercase;color:rgba(245,237,227,0.40);font-family:Arial,sans-serif;">Message</p>
              <p style="margin:8px 0 0;font-size:14px;color:rgba(245,237,227,0.85);font-family:Georgia,serif;font-style:italic;line-height:1.65;">&ldquo;${message}&rdquo;</p>
            </td></tr>` : ''}

            <tr><td style="padding:16px 0 4px;">
              <p style="margin:0;font-size:12px;color:rgba(245,237,227,0.65);font-family:Arial,sans-serif;line-height:1.65;">
                ✅ La carte a été envoyée automatiquement à <strong style="color:#C9A96E;">${toEmail}</strong>.<br>
                Confirmation de commande à envoyer à&nbsp;: <strong style="color:#C9A96E;">${senderEmail}</strong>
              </p>
            </td></tr>

          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#3A1E14;padding:16px 40px;text-align:center;border-top:1px solid rgba(201,169,110,0.12);">
          <p style="margin:0;font-size:10px;color:rgba(245,237,227,0.30);letter-spacing:0.15em;font-family:Arial,sans-serif;">
            SKINES MED SPA · 19 Av. Shamrock, Montréal · info@skines.info
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  // ── Send both emails ───────────────────────────────────────────────────
  try {
    const [recipientId, adminId] = await Promise.all([
      sendEmail({
        to: toEmail,
        subject: `🎁 ${fromName} vous offre une carte cadeau Skines — ${amount}`,
        html: recipientHtml,
      }),
      sendEmail({
        to: ADMIN,
        subject: `🎁 Nouvelle commande carte cadeau ${amount} — ${fromName} pour ${toName}`,
        html: adminHtml,
      }),
    ]);

    console.log('[send-gift-card] recipient:', recipientId, '| admin:', adminId);
    return res.status(200).json({ success: true, recipientId, adminId });

  } catch (err) {
    console.error('[send-gift-card] Error:', err.message);
    return res.status(500).json({ error: 'Erreur lors de l\'envoi. Réessayez.' });
  }
}
