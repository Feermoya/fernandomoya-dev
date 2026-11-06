import { describe, expect, it } from 'vitest';
import {
  isPrivateToolPath,
  isSessionProtectedPath,
  panelLoginUrl,
  safePostLoginPath,
} from '@/lib/panel/auth';

describe('panel auth · rutas privadas', () => {
  it('protege el panel y admin, y deja Foco fuera del PIN', () => {
    expect(isPrivateToolPath('/foco-financiero')).toBe(false);
    expect(isSessionProtectedPath('/foco-financiero')).toBe(false);
    expect(isPrivateToolPath('/admin')).toBe(true);
    expect(isSessionProtectedPath('/panel/cobros')).toBe(true);
    expect(isSessionProtectedPath('/precios')).toBe(false);
  });

  it('safePostLoginPath evita open redirects', () => {
    expect(safePostLoginPath('/foco-financiero')).toBeNull();
    expect(safePostLoginPath('/admin')).toBe('/admin');
    expect(safePostLoginPath('/panel/clientes')).toBe('/panel/clientes');
    expect(safePostLoginPath('https://evil.com')).toBeNull();
    expect(safePostLoginPath('//evil.com')).toBeNull();
    expect(safePostLoginPath('/panel/login')).toBeNull();
  });

  it('panelLoginUrl arma next', () => {
    expect(panelLoginUrl('/admin')).toBe('/panel/login?next=%2Fadmin');
    expect(panelLoginUrl('/foco-financiero')).toBe('/panel/login');
  });
});
