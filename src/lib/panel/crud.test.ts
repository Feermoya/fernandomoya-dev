import { describe, expect, it } from 'vitest';
import {
  validateCreateClient,
  validateDeactivateClient,
  validateUpdateClient,
} from '@/lib/panel/clients/validate';
import {
  validateCreateService,
  validateUpdateTariff,
} from '@/lib/panel/services/validate';
import { shouldGenerateRecurringCharge } from '@/lib/panel/charges/planRecurring';
import { suggestedReceivedArsFromUsd } from '@/lib/panel/payments/register';

describe('crear cliente', () => {
  it('requiere nombre y start_date', () => {
    expect(() => validateCreateClient({ name: '  ', startDate: '2026-08-01' })).toThrow(/nombre/i);
    const ok = validateCreateClient({ name: 'Nuevo', startDate: '2026-08-01', notes: 'x' });
    expect(ok.active).toBe(true);
    expect(ok.name).toBe('Nuevo');
  });
});

describe('editar / baja cliente', () => {
  it('update valida id', () => {
    expect(() =>
      validateUpdateClient({ id: '', name: 'A', startDate: '2026-01-01' }),
    ).toThrow();
  });

  it('deactivate usa ended_at o today', () => {
    expect(validateDeactivateClient({ id: 'c1' }, '2026-08-14')).toEqual({
      id: 'c1',
      ended_at: '2026-08-14',
      active: false,
    });
  });
});

describe('crear servicio', () => {
  it('recurring con defaults previous_month / due_day', () => {
    const s = validateCreateService({
      clientId: 'c1',
      name: 'Web',
      billingType: 'recurring',
      referenceAmount: 45,
      referenceCurrency: 'USD',
      startDate: '2026-08-01',
    });
    expect(s.billing_type).toBe('recurring');
    if (s.billing_type === 'recurring') {
      expect(s.billing_mode).toBe('previous_month');
      expect(s.due_day).toBe(10);
    }
  });

  it('one_time genera due_date y sin schedule recurrente', () => {
    const s = validateCreateService({
      clientId: 'c1',
      name: 'Stickers',
      billingType: 'one_time',
      referenceAmount: 35000,
      referenceCurrency: 'ARS',
      startDate: '2026-08-01',
      dueDate: '2026-08-20',
    });
    expect(s.billing_type).toBe('one_time');
    if (s.billing_type === 'one_time') {
      expect(s.billing_mode).toBeNull();
      expect(s.due_day).toBeNull();
      expect(s.due_date).toBe('2026-08-20');
    }
  });
});

describe('editar tarifa', () => {
  it('solo actualiza amount > 0', () => {
    expect(validateUpdateTariff({ id: 's1', referenceAmount: 50 })).toEqual({
      id: 's1',
      reference_amount: 50,
    });
    expect(() => validateUpdateTariff({ id: 's1', referenceAmount: 0 })).toThrow();
  });

  it('histórico no cambia: updateTariff no toca charges (contrato de API)', () => {
    // Documentado: updateServiceTariff solo hace UPDATE services.reference_amount.
    // Este test fija el contrato del validador usado por esa API.
    const v = validateUpdateTariff({ id: 'svc-poletino', referenceAmount: '50' });
    expect(Object.keys(v).sort()).toEqual(['id', 'reference_amount']);
  });
});

describe('servicio / cliente inactivo no genera charges', () => {
  it('servicio inactive → shouldGenerate false', () => {
    expect(
      shouldGenerateRecurringCharge(
        {
          id: 's1',
          active: false,
          billing_type: 'recurring',
          billing_mode: 'previous_month',
          due_day: 10,
          reference_amount: 45,
          reference_currency: 'USD',
          start_date: '2026-01-01',
          ended_at: null,
        },
        '2026-07-01',
      ),
    ).toBe(false);
  });
});

describe('MEP automático · monto sugerido', () => {
  it('45 × 1512.48 → 68062 enteros', () => {
    expect(suggestedReceivedArsFromUsd(45, 1512.48)).toBe(68062);
  });
});
