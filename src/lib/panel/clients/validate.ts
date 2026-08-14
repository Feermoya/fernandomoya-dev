import { assertIsoDate, type IsoDate } from '@/lib/panel/dates';

export type CreateClientInput = {
  name: string;
  startDate: string;
  notes?: string | null;
};

export type UpdateClientInput = {
  id: string;
  name: string;
  startDate: string;
  notes?: string | null;
};

export type DeactivateClientInput = {
  id: string;
  endedAt?: string | null;
};

export type ValidatedCreateClient = {
  name: string;
  start_date: IsoDate;
  notes: string | null;
  active: true;
};

export type ValidatedUpdateClient = {
  id: string;
  name: string;
  start_date: IsoDate;
  notes: string | null;
};

export type ValidatedDeactivateClient = {
  id: string;
  ended_at: IsoDate;
  active: false;
};

function requireName(name: unknown): string {
  const n = String(name ?? '').trim();
  if (!n) throw new Error('El nombre es obligatorio');
  if (n.length > 200) throw new Error('Nombre demasiado largo');
  return n;
}

export function validateCreateClient(input: CreateClientInput): ValidatedCreateClient {
  return {
    name: requireName(input.name),
    start_date: assertIsoDate(String(input.startDate || ''), 'start_date'),
    notes: input.notes?.trim() ? input.notes.trim() : null,
    active: true,
  };
}

export function validateUpdateClient(input: UpdateClientInput): ValidatedUpdateClient {
  const id = String(input.id || '').trim();
  if (!id) throw new Error('Falta el cliente');
  return {
    id,
    name: requireName(input.name),
    start_date: assertIsoDate(String(input.startDate || ''), 'start_date'),
    notes: input.notes?.trim() ? input.notes.trim() : null,
  };
}

export function validateDeactivateClient(
  input: DeactivateClientInput,
  today: IsoDate,
): ValidatedDeactivateClient {
  const id = String(input.id || '').trim();
  if (!id) throw new Error('Falta el cliente');
  const ended_at = input.endedAt
    ? assertIsoDate(String(input.endedAt), 'ended_at')
    : today;
  return { id, ended_at, active: false };
}
