/** El libro solo puede venir de app_metadata, que el usuario no puede editar. */
export function financeStateIdFromAppMetadata(appMetadata: unknown): string {
  if (!appMetadata || typeof appMetadata !== 'object') return '';
  const value = (appMetadata as { finance_state_id?: unknown }).finance_state_id;
  return typeof value === 'string' ? value.trim() : '';
}

export function userMustChoosePassword(userMetadata: unknown): boolean {
  if (!userMetadata || typeof userMetadata !== 'object') return false;
  return (userMetadata as { must_set_password?: unknown }).must_set_password === true;
}
