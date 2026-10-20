import { useMemo, useState } from 'react';
import GroupApp from '@/components/tournaments/GroupApp';
import { createDemoApi, resetDemoStore } from '@/lib/tournaments/demo/sandbox';

/** TEMPORAL. Pantalla de prueba. Borrar junto con /torneos/probar. */
export default function DemoBench() {
  const [epoch, setEpoch] = useState(0);
  const api = useMemo(() => createDemoApi(), []);

  return (
    <div className="tournaments-app-shell lf">
      <div className="demo-bar">
        <p>Prueba en este navegador. No se crea un grupo ni se guarda nada.</p>
        <div className="demo-bar-actions">
          <button
            type="button"
            onClick={() => {
              resetDemoStore();
              setEpoch((value) => value + 1);
            }}
          >
            REINICIAR
          </button>
          <a href="/torneos">SALIR</a>
        </div>
      </div>
      <GroupApp
        key={epoch}
        publicId="demo-local"
        api={api}
        onLeave={() => {
          window.location.assign('/torneos');
        }}
        onRecover={() => undefined}
        onRevoke={() => undefined}
        onClaim={() => undefined}
        onRenamed={() => undefined}
        onDeleted={() => {
          window.location.assign('/torneos');
        }}
      />
    </div>
  );
}
