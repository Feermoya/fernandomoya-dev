import { useEffect, useId, useRef, useState } from 'react';
import { Check, Download, Ellipsis, MonitorDown, Share, Smartphone, X } from 'lucide-react';
import { detectInstallPlatform, isStandalonePwa, type FinanceInstallPlatform } from '@/lib/finance/pwa';

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};
type InstallWindow = Window & { __focoInstallPrompt?: InstallPrompt | null };
type Props = { variant?: 'button' | 'card' };

export function FinanceInstallHint({ variant = 'button' }: Props) {
  const titleId = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const [installed, setInstalled] = useState(true);
  const [platform, setPlatform] = useState<FinanceInstallPlatform>('desktop');
  const [deferred, setDeferred] = useState<InstallPrompt | null>(null);
  const [guide, setGuide] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const win = window as InstallWindow;
    const mode = window.matchMedia('(display-mode: standalone)');
    const refresh = () => {
      setInstalled(isStandalonePwa());
      setDeferred(win.__focoInstallPrompt ?? null);
    };
    const onInstalled = () => {
      win.__focoInstallPrompt = null;
      setDeferred(null);
      setInstalled(true);
      setGuide(false);
    };
    setPlatform(detectInstallPlatform(navigator.userAgent, navigator.maxTouchPoints));
    refresh();
    window.addEventListener('foco-install-available', refresh);
    window.addEventListener('appinstalled', onInstalled);
    mode.addEventListener?.('change', refresh);
    return () => {
      window.removeEventListener('foco-install-available', refresh);
      window.removeEventListener('appinstalled', onInstalled);
      mode.removeEventListener?.('change', refresh);
    };
  }, []);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (guide && !dialog.open) dialog.showModal();
    else if (!guide && dialog.open) dialog.close();
    return () => { if (dialog.open) dialog.close(); };
  }, [guide]);

  const install = async () => {
    if (busy) return;
    if (!deferred) { setGuide(true); return; }
    setBusy(true);
    try {
      await deferred.prompt();
      const decision = await deferred.userChoice;
      (window as InstallWindow).__focoInstallPrompt = null;
      setDeferred(null);
      if (decision.outcome !== 'accepted') setGuide(true);
    } catch {
      setGuide(true);
    } finally {
      setBusy(false);
    }
  };

  if (installed) return null;

  return (
    <>
      {variant === 'card' ? (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-3">
          <img src="/foco/icon-192.png" alt="" width="52" height="52" className="h-[52px] w-[52px] shrink-0 rounded-2xl shadow-sm" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-slate-900">Foco en tu inicio</p>
            <p className="mt-0.5 text-[11px] font-medium text-slate-600">Acceso directo, con su propio ícono de inversiones.</p>
            <button type="button" disabled={busy} onClick={() => void install()}
              className="mt-2 inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-blue-600 px-3 text-xs font-bold text-white transition hover:bg-blue-700 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60">
              <Download size={15} aria-hidden /> {busy ? 'Abriendo…' : 'Instalar Foco'}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" disabled={busy} onClick={() => void install()}
          className="foco-chip foco-chip--neutral focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60"
          aria-label="Instalar Foco financiero" title="Instalar Foco financiero">
          <Download size={16} aria-hidden /><span>Instalar</span>
        </button>
      )}
      <dialog ref={ref} aria-labelledby={titleId} onClose={() => setGuide(false)}
        onCancel={() => setGuide(false)}
        className="m-auto w-[min(92vw,26rem)] max-h-[88dvh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-[3px]">
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <img src="/foco/icon-192.png" alt="" width="56" height="56" className="h-14 w-14 shrink-0 rounded-2xl" />
              <div>
                <h2 id={titleId} className="text-lg font-extrabold tracking-tight">Instalá Foco</h2>
                <p className="text-xs font-medium text-slate-500">Una app en tu inicio, sin App Store.</p>
              </div>
            </div>
            <button type="button" onClick={() => setGuide(false)}
              aria-label="Cerrar instrucciones" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200">
              <X size={18} aria-hidden />
            </button>
          </div>
          {platform === 'ios' ? (
            <>
              <p className="mt-5 text-sm font-semibold text-slate-700">En iPhone, Apple requiere estos pasos:</p>
              <ol className="mt-3 space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Share size={19} aria-hidden /></span>
                  <span className="pt-0.5">Tocá <strong>Compartir</strong> en Safari o en el menú del navegador.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Smartphone size={19} aria-hidden /></span>
                  <span className="pt-0.5">Elegí <strong>Agregar a pantalla de inicio</strong>.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Check size={19} aria-hidden /></span>
                  <span className="pt-0.5">Activá <strong>Abrir como app</strong> si aparece y tocá <strong>Agregar</strong>.</span>
                </li>
              </ol>
            </>
          ) : platform === 'android' ? (
            <>
              <p className="mt-5 text-sm font-semibold text-slate-700">Si el navegador no ofrece la instalación directa:</p>
              <ol className="mt-3 space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Ellipsis size={19} aria-hidden /></span>
                  <span className="pt-0.5">Abrí el <strong>menú ⋮</strong> del navegador.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Download size={19} aria-hidden /></span>
                  <span className="pt-0.5">Elegí <strong>Instalar app</strong> o <strong>Agregar a inicio</strong>.</span>
                </li>
              </ol>
            </>
          ) : (
            <div className="mt-5 flex items-start gap-3 text-sm">
              <MonitorDown size={23} className="shrink-0 text-blue-600" aria-hidden />
              <p>En Chrome o Edge, buscá <strong>Instalar</strong> en la barra o el menú. En Safari Mac, usá <strong>Archivo → Agregar al Dock</strong>.</p>
            </div>
          )}
          <p className="mt-5 rounded-xl bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
            Foco tendrá su propio ícono. Las inversiones siguen protegidas por tu cuenta y necesitan conexión para sincronizarse.
          </p>
          <button type="button" onClick={() => setGuide(false)}
            className="mt-4 min-h-11 w-full rounded-xl bg-blue-600 px-4 text-sm font-extrabold text-white hover:bg-blue-700">
            Entendido
          </button>
        </div>
      </dialog>
    </>
  );
}
