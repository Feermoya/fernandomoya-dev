/** Endpoint retirado: avisos WhatsApp fuera del producto. */
export default function handler(_req, res) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(410).json({
    ok: false,
    error: 'Los avisos por WhatsApp fueron desactivados.',
  });
}
