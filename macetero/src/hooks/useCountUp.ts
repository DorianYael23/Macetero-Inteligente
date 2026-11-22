import { useEffect, useRef } from 'react';
import { animate } from 'animejs';
import { prefersReducedMotion } from '../utils/motion';

/**
 * Anima un número hasta `value` con anime.js.
 * Devuelve un ref para asignarlo a un <span>: el texto se escribe directo en el DOM,
 * así React no se re-renderiza en cada frame de la animación.
 */
export function useCountUp(value: number | null, decimals = 0) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (value === null) {
      el.textContent = '--';
      return;
    }

    if (prefersReducedMotion()) {
      shown.current = value;
      el.textContent = value.toFixed(decimals);
      return;
    }

    const state = { value: shown.current };
    el.textContent = state.value.toFixed(decimals);

    const anim = animate(state, {
      value,
      duration: 900,
      ease: 'outExpo',
      onUpdate: () => {
        shown.current = state.value;
        el.textContent = state.value.toFixed(decimals);
      },
    });

    return () => {
      anim.pause();
    };
  }, [value, decimals]);

  return ref;
}
