import type { ReactNode } from 'react';
import {
  BarChart3,
  ChevronRight,
  Circle,
  Settings,
  Share2,
  Swords,
  Trophy,
} from 'lucide-react';
import { faceColor, initials } from '@/components/tournaments/face';
import type { TournamentPlayer } from '@/lib/tournaments/types';

export type FechaPage = 'inicio' | 'partidos' | 'ranking' | 'historial';

const NAV: Array<{ id: FechaPage; label: string; icon: typeof Trophy }> = [
  { id: 'inicio', label: 'Inicio', icon: Circle },
  { id: 'partidos', label: 'Partidos', icon: Swords },
  { id: 'ranking', label: 'Ranking', icon: BarChart3 },
  { id: 'historial', label: 'Historial', icon: Trophy },
];

export default function TournamentShell({
  groupName,
  live,
  page,
  players,
  onPage,
  onShare,
  onMenu,
  main,
  aside,
}: {
  groupName: string;
  live: string;
  page: FechaPage;
  players: TournamentPlayer[];
  onPage: (page: FechaPage) => void;
  onShare: () => void;
  onMenu: () => void;
  main: ReactNode;
  aside: ReactNode;
}) {
  const active = players.filter((p) => p.active);
  return (
    <div className="app">
      <aside className="sidebar">
        <button type="button" className="brand" onClick={() => onPage('inicio')}>
          <span className="brand-mark">
            <Circle size={18} fill="currentColor" />
          </span>
          <span className="brand-word">
            LA FECHA
            <small>TORNEOS ENTRE AMIGOS</small>
          </span>
        </button>
        <div className="side-label">El grupo</div>
        <nav className="nav" aria-label="Secciones">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={`nav-btn ${page === item.id ? 'active' : ''}`}
                onClick={() => onPage(item.id)}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="side-bottom">
          <div className="mini-overline">Mi plantel</div>
          <div className="group-small">{groupName}</div>
          <div className="players-avatars">
            {active.slice(0, 8).map((p) => (
              <span
                key={p.id}
                className="av-small"
                style={{ background: faceColor(p.displayName) }}
                title={p.displayName}
              >
                {initials(p.displayName)}
              </span>
            ))}
          </div>
          <button type="button" className="bottom-side-link" onClick={onMenu}>
            <Settings size={14} /> ACCESO DEL ORGANIZADOR
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <span className="top-crumb">
            GRUPOS <ChevronRight size={14} /> <b>{groupName}</b>
          </span>
          <div className="top-right">
            <div className="live-state">
              <span className="live-dot" /> {live}
            </div>
            <button type="button" className="outline-mini" onClick={onShare}>
              <Share2 size={14} /> COMPARTIR TARJETA
            </button>
          </div>
        </header>

        <header className="mobile-head">
          <div className="mobile-brand">
            <span className="brand-mark">
              <Circle size={16} fill="currentColor" />
            </span>
            <span className="brand-word">
              LA FECHA
              <small>
                {groupName} · {active.length} jugadores
              </small>
            </span>
          </div>
          <div className="mobile-tools">
            <span className="mob-badge">{live}</span>
            <button type="button" className="circle-tool" onClick={onShare} aria-label="Compartir tarjeta">
              <Share2 size={16} />
            </button>
            <button type="button" className="circle-tool" onClick={onMenu} aria-label="Acceso del organizador">
              <Settings size={16} />
            </button>
          </div>
        </header>

        <div className="layout">
          <div className="content-grid">
            <div className="col-main">{main}</div>
            <aside className="aside desktop-aside">{aside}</aside>
          </div>
        </div>

        <nav className="mobile-nav" aria-label="Navegación">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={page === item.id ? 'active' : ''}
                onClick={() => onPage(item.id)}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
