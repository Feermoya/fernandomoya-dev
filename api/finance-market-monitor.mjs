/** Endpoint retirado: monitor de alertas WhatsApp fuera del producto. */
export default function handler(_req, res) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(410).json({
    ok: false,
    error: 'El monitor de alertas por WhatsApp fue desactivado.',
  });
}
