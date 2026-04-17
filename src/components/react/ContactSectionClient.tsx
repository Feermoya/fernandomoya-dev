import { motion, useReducedMotion, type Variants } from 'motion/react';
import { useCallback, type FormEvent } from 'react';
import { DURATION_ENTER, EASE_OUT_SOFT } from '@/motion/easing';

type Props = {
  whatsappUrl: string;
  email: string;
  linkedin: string;
};

const view = { once: true as const, margin: '-80px' as const };

const leftContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.09, delayChildren: 0.06 },
  },
};

const leftItem: Variants = {
  hidden: { opacity: 0, x: -18 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: DURATION_ENTER, ease: EASE_OUT_SOFT },
  },
};

export default function ContactSectionClient({ whatsappUrl, email, linkedin }: Props) {
  const reduce = useReducedMotion();

  const onWhatsAppSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const name = String(fd.get('name') ?? '').trim();
      const mail = String(fd.get('email') ?? '').trim();
      const message = String(fd.get('message') ?? '').trim();
      const text = [
        'Hola Fernando,',
        name ? `Soy ${name}.` : '',
        mail ? `Email: ${mail}` : '',
        '',
        message,
      ]
        .filter(Boolean)
        .join('\n');
      const base = whatsappUrl.split('?')[0];
      const url = `${base}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    },
    [whatsappUrl],
  );

  return (
    <section id="contacto" className="container-page pb-14 sm:pb-16" aria-labelledby="contact-heading">
      <motion.section
        className="glass-panel rounded-xl !p-5 sm:!p-7 lg:!p-8"
        initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={view}
        transition={{ duration: reduce ? 0 : DURATION_ENTER, ease: EASE_OUT_SOFT }}
      >
        <div className="grid gap-8 lg:grid-cols-12 lg:items-start lg:gap-10">
          <motion.div
            className="lg:col-span-5"
            variants={leftContainer}
            initial={reduce ? 'visible' : 'hidden'}
            whileInView="visible"
            viewport={view}
          >
            <motion.p className="text-eyebrow" variants={leftItem}>
              Contacto
            </motion.p>
            <motion.h2
              id="contact-heading"
              className="mt-2 text-lg font-semibold tracking-tight text-text sm:text-xl"
              variants={leftItem}
            >
              ¿Tenés un proyecto o querés mejorar tu web?
            </motion.h2>
            <motion.p className="mt-3 text-sm leading-relaxed text-muted" variants={leftItem}>
              Contame qué necesitás y vemos cómo encararlo.
            </motion.p>
            <motion.div className="mt-5 flex flex-col gap-2.5" variants={leftItem}>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-transparent bg-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-accent-hover"
              >
                WhatsApp
              </a>
              <a
                className="text-sm text-muted underline-offset-4 transition hover:text-accent hover:underline"
                href={linkedin}
                rel="noreferrer"
                target="_blank"
              >
                LinkedIn
              </a>
              <a
                className="text-sm text-muted underline-offset-4 transition hover:text-accent hover:underline"
                href={`mailto:${email}`}
              >
                Email
              </a>
            </motion.div>
          </motion.div>

          <div className="lg:col-span-7">
            <div className="glass-card rounded-xl p-4 sm:p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">Mensaje</p>
              <form className="mt-3 space-y-3" onSubmit={onWhatsAppSubmit} aria-label="Enviar mensaje por WhatsApp">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted" htmlFor="contact-name">
                      Nombre
                    </label>
                    <input
                      id="contact-name"
                      name="name"
                      autoComplete="name"
                      className="glass-field mt-1.5 px-2.5 py-2 text-sm outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted" htmlFor="contact-email">
                      Email
                    </label>
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      className="glass-field mt-1.5 px-2.5 py-2 text-sm outline-none"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted" htmlFor="contact-message">
                    Mensaje
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    rows={3}
                    className="glass-field mt-1.5 px-2.5 py-2 text-sm outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="btn-submit-shimmer relative inline-flex items-center justify-center overflow-hidden rounded-lg border border-transparent bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover"
                >
                  <span className="relative z-[1]">Enviar por WhatsApp</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </motion.section>
    </section>
  );
}
