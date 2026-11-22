import { useCallback, useEffect, useRef, useState } from 'react';
import { TB_CONFIG } from '../config/thingsboard';
import {
  AuthError,
  fetchTelemetry,
  login,
  togglePump as togglePumpRequest,
  updatePlantThreshold as updatePlantThresholdRequest,
} from '../services/thingsboard';
import type { ConnectionStatus, HistoryPoint, Telemetry } from '../types/telemetry';

/**
 * Inicia sesión en ThingsBoard y consulta la telemetría periódicamente.
 * - Usa un ciclo con setTimeout (no hay peticiones encimadas si el servidor tarda).
 * - Si el token expira (401) vuelve a iniciar sesión automáticamente.
 */
export function useThingsBoard() {
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [wateringLog, setWateringLog] = useState<string[]>([]);
  const [connection, setConnection] = useState<ConnectionStatus>('connecting');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const tokenRef = useRef<string | null>(null);
  const prevPumpActiveRef = useRef<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const tick = async () => {
      try {
        if (!tokenRef.current) tokenRef.current = await login();
        const data = await fetchTelemetry(tokenRef.current);
        if (cancelled) return;

        const now = new Date();
        const timeStr = now.toLocaleTimeString('es-MX', { hour12: false });
        setTelemetry(data);
        setLastUpdate(now);
        setConnection('online');
        setHistory((prev) =>
          [
            ...prev,
            {
              time: timeStr,
              temperatura: data.temperatura,
              humedadSuelo: data.humedad_suelo,
              humedadAire: data.humedad_aire,
              bombaActiva: data.bomba_activa,
            },
          ].slice(-TB_CONFIG.historySize),
        );

        if (data.bomba_activa === true && prevPumpActiveRef.current !== true) {
          setWateringLog((prev) => [timeStr, ...prev].slice(0, 50));
        }
        prevPumpActiveRef.current = data.bomba_activa;
      } catch (err) {
        if (err instanceof AuthError) tokenRef.current = null;
        console.error('Error consultando ThingsBoard:', err);
        if (!cancelled) setConnection('offline');
      } finally {
        if (!cancelled) timer = window.setTimeout(tick, TB_CONFIG.pollMs);
      }
    };

    tick();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const runAuthenticated = useCallback(
    async <T>(action: (token: string) => Promise<T>): Promise<T> => {
      if (!tokenRef.current) tokenRef.current = await login();
      try {
        return await action(tokenRef.current);
      } catch (err) {
        if (err instanceof AuthError) {
          tokenRef.current = await login();
          return await action(tokenRef.current);
        }
        throw err;
      }
    },
    [],
  );

  const togglePump = useCallback(
    (activar: boolean) => runAuthenticated((token) => togglePumpRequest(token, activar)),
    [runAuthenticated],
  );

  const updatePlantThreshold = useCallback(
    (umbral: number, nombrePlanta: string) =>
      runAuthenticated((token) => updatePlantThresholdRequest(token, umbral, nombrePlanta)),
    [runAuthenticated],
  );

  return {
    telemetry,
    history,
    wateringLog,
    connection,
    lastUpdate,
    togglePump,
    updatePlantThreshold,
  };
}
