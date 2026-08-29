// Teclado para los desplegables hechos a mano (método de pago, tipo de
// comprobante).
//
// Son botones de verdad, así que el Tab los alcanzaba, pero ahí se terminaba:
// no respondían a las flechas ni a Escape, y al elegir una opción el botón
// elegido se desmontaba y el foco caía al `body`, cortando la secuencia de Tab
// justo en la mitad del cobro. Además, si se tabulaba fuera con el panel
// abierto, quedaba flotando sobre el formulario.

import { useCallback, useEffect, useRef, useState } from 'react';

export function useDesplegableTeclado({
  abierto,
  setAbierto,
  cantidad,
  indiceActual = 0,
  alElegir,
}) {
  const [marcado, setMarcado] = useState(indiceActual);
  const contenedorRef = useRef(null);
  const triggerRef = useRef(null);

  // Al abrir, la marca arranca en la opción que ya está elegida: las flechas
  // se mueven desde donde está el usuario, no desde el principio de la lista.
  useEffect(() => {
    if (abierto) setMarcado(indiceActual < 0 ? 0 : indiceActual);
  }, [abierto, indiceActual]);

  const cerrarYVolver = useCallback(() => {
    setAbierto(false);
    // El foco vuelve al botón que abrió el panel. Sin esto la tabulación se
    // reinicia desde el principio del formulario.
    triggerRef.current?.focus();
  }, [setAbierto]);

  const alTeclear = useCallback(
    (evento) => {
      const { key } = evento;

      if (!abierto) {
        // Con el panel cerrado, abrir con flecha abajo o arriba es lo que hace
        // un <select> nativo. Enter y Espacio ya los maneja el botón.
        if (key === 'ArrowDown' || key === 'ArrowUp') {
          evento.preventDefault();
          setAbierto(true);
        }
        return;
      }

      if (key === 'ArrowDown') {
        evento.preventDefault();
        setMarcado((i) => (i + 1) % cantidad);
      } else if (key === 'ArrowUp') {
        evento.preventDefault();
        setMarcado((i) => (i - 1 + cantidad) % cantidad);
      } else if (key === 'Home') {
        evento.preventDefault();
        setMarcado(0);
      } else if (key === 'End') {
        evento.preventDefault();
        setMarcado(cantidad - 1);
      } else if (key === 'Enter' || key === ' ') {
        evento.preventDefault();
        alElegir(marcado);
        cerrarYVolver();
      } else if (key === 'Escape') {
        evento.preventDefault();
        // Escape solo cierra el desplegable. Sin el stopPropagation cerraría
        // también el modal de cobro que está detrás, de un solo golpe.
        evento.stopPropagation();
        cerrarYVolver();
      } else if (key === 'Tab') {
        // Tabular fuera cierra el panel, pero sin robar el foco: el Tab tiene
        // que seguir su curso hacia el próximo campo.
        setAbierto(false);
      }
    },
    [abierto, cantidad, marcado, alElegir, cerrarYVolver, setAbierto],
  );

  // Si el foco se va del componente por cualquier vía, el panel se cierra.
  const alPerderFoco = useCallback(
    (evento) => {
      if (!contenedorRef.current?.contains(evento.relatedTarget)) {
        setAbierto(false);
      }
    },
    [setAbierto],
  );

  return {
    marcado,
    setMarcado,
    contenedorRef,
    triggerRef,
    alTeclear,
    alPerderFoco,
  };
}

export default useDesplegableTeclado;
