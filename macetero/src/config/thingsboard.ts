/**
 * Configuración de la conexión con ThingsBoard.
 * Los valores se leen de variables de entorno de Vite (.env.local);
 * si no existen o se accede desde la red local, usa ruta relativa ""
 * para redirigir /api mediante el proxy de Vite.
 */
function resolveThingsBoardHost(): string {
  const envUrl = (import.meta.env.VITE_TB_URL ?? import.meta.env.VITE_TB_HOST ?? '').trim();
  if (!envUrl) return '';

  if (
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1' &&
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(envUrl)
  ) {
    return '';
  }

  return envUrl;
}

export const TB_CONFIG = {
  host: resolveThingsBoardHost(),
  deviceId: import.meta.env.VITE_TB_DEVICE_ID ?? 'ff0adcb0-e2a1-11f1-8cd9-6b9990469fa2',
  user: import.meta.env.VITE_TB_USER ?? 'app@macetero.com',
  password: import.meta.env.VITE_TB_PASS ?? 'macetero1223',
  /** Cada cuántos ms se consulta la telemetría */
  pollMs: 2000,
  /** Cuántas lecturas se conservan para las gráficas */
  historySize: 20,
} as const;
