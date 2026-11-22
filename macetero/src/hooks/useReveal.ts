import { useLayoutEffect, useRef } from 'react';
import { animate, stagger } from 'animejs';
import { prefersReducedMotion } from '../utils/motion';

/**
 * Entrada escalonada: todo elemento con el atributo `data-reveal`
 * dentro del contenedor aparece subiendo y desvaneciéndose uno tras otro.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || prefersReducedMotion()) return;

    const items = root.querySelectorAll('[data-reveal]');
    const anim = animate(items, {
      opacity: [0, 1],
      translateY: [24, 0],
      duration: 700,
      delay: stagger(90),
      ease: 'outCubic',
    });

    return () => {
      anim.pause();
    };
  }, []);

  return ref;
}
