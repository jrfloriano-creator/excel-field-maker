import { useEffect, useRef } from 'react';
import { AppConfig } from '@/types/titulo';

interface IdleTimerManagerProps {
  config: AppConfig;
  onIdle: () => void;
}

/**
 * Monitors user activity and triggers onIdle after the configured idle time.
 * Add this component to Index.tsx once Parte 1 is complete.
 * Usage: <IdleTimerManager config={config} onIdle={() => setSession(null)} />
 */
export function IdleTimerManager({ config, onIdle }: IdleTimerManagerProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const minutes = config.idleMinutes ?? 5;
    timerRef.current = setTimeout(onIdle, minutes * 60 * 1000);
  };

  useEffect(() => {
    if (!config.idleAtivo) return;

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.idleAtivo, config.idleMinutes]);

  return null;
}
