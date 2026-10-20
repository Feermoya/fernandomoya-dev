import { describe, expect, it } from 'vitest';
import {
  extractPublicIdFromInput,
  parsePlayerNamesInput,
  validateCreateGroupInput,
} from '@/lib/tournaments/validate';

describe('parsePlayerNamesInput', () => {
  it('parte por comas y saltos de línea y deduplica', () => {
    expect(parsePlayerNamesInput('Messi, Nico\nJuan; messi')).toEqual([
      'Messi',
      'Nico',
      'Juan',
    ]);
  });

  it('recorta espacios', () => {
    expect(parsePlayerNamesInput('  Fede  ,  Ana ')).toEqual(['Fede', 'Ana']);
  });
});

describe('validateCreateGroupInput', () => {
  it('acepta grupo válido', () => {
    const result = validateCreateGroupInput({
      name: '  Los Pibes  ',
      players: ['Messi', 'Nico', 'Juan'],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.name).toBe('Los Pibes');
      expect(result.players).toHaveLength(3);
    }
  });

  it('rechaza menos de dos jugadores', () => {
    const result = validateCreateGroupInput({ name: 'Grupo', players: ['Solo'] });
    expect(result.ok).toBe(false);
  });
});

describe('extractPublicIdFromInput', () => {
  it('extrae id desde URL', () => {
    expect(
      extractPublicIdFromInput('https://www.fermoyadev.com.ar/torneos/g/AbCdEfGhIjKlMnOpQrStUv'),
    ).toBe('AbCdEfGhIjKlMnOpQrStUv');
  });

  it('acepta código plano', () => {
    expect(extractPublicIdFromInput('AbCdEfGhIjKlMnOpQrStUv')).toBe('AbCdEfGhIjKlMnOpQrStUv');
  });

  it('rechaza basura', () => {
    expect(extractPublicIdFromInput('hola')).toBeNull();
  });
});
