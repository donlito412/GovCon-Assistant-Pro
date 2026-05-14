export const LOCAL_MODE_USER_ID = '00000000-0000-0000-0000-000000000000';

export function isAuthEnabled(): boolean {
  return process.env.ENABLE_AUTH === 'true';
}
