"use client";

import { useEffect, useRef, useState } from "react";

// Hook chico para las animaciones "aparece al hacer scroll" del Home/Álbum.
// A propósito NO usa ninguna librería de animación (framer-motion, etc.):
// evita sumar una dependencia npm nueva que el usuario tendría que instalar
// localmente para poder subir el proyecto a GitHub sin usar la terminal.
export function useScrollReveal<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Si el navegador no soporta IntersectionObserver, mostramos todo de una
    // (degradación segura, nunca contenido invisible).
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}
