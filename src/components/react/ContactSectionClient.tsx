import { motion, useReducedMotion, type Variants } from 'motion/react';
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

  return (
    <section id="contacto" className="container-page pb-14 sm:pb-16" aria-labelledby="contact-heading">
      <motion.section
        className="glass-panel rounded-xl !p-5 sm:!p-7 lg:!p-8"
        initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={view}
        transition={{ duration: reduce ? 0 : DURATION_ENTER, ease: EASE_OUT_SOFT }}
      >
        <div className="grid gap-8 lg:items-start lg:gap-10">
          <motion.div
            className="max-w-2xl"
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
        </div>
      </motion.section>
    </section>
  );
}
