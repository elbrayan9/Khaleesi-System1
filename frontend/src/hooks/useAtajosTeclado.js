// Atajos de teclado para la caja.
//
// En un mostrador con cola, sacar la mano del teclado para buscar el mouse es
// lo que hace lenta la atención. Por eso los atajos son teclas de función y no
// combinaciones con Ctrl: las F **siguen funcionando con el cursor dentro de un
// campo de texto**, así que el cajero termina de tipear el código y aprieta F2
// sin moverse. Con Ctrl+letra chocaríamos con el navegador (Ctrl+P imprime,
// Ctrl+S guarda) y con letras sueltas se dispararían al escribir.
//
// Se sigue la convención de los POS argentinos (Tango, Bejerman): quien vino de
// otro sistema ya tiene las teclas en los dedos.

import { useEffect, useRef } from 'react';

// Teclas que el navegador se reserva y no conviene pelear: F5 recarga, F11
// pantalla completa, F12 las herramientas de desarrollo. Interceptarlas confunde
// más de lo que ayuda.
const RESERVADAS_DEL_NAVEGADOR = new Set(['F5', 'F11', 'F12']);

/**
 * @param {Object<string, Function|null>} mapa  Tecla → qué hacer. Ej:
 *   { F2: cobrar, F3: enfocarBuscador, Escape: cerrar }
 *   Un valor null o undefined deja la tecla libre (útil para desactivar un
 *   atajo según el estado de la pantalla, por ejemplo no cobrar sin carrito).
 * @param {boolean} activo  Permite apagarlos mientras hay un modal abierto por
 *   encima, para que no se disparen dos acciones con la misma tecla.
 */
export function useAtajosTeclado(mapa, activo = true) {
  // El mapa se rearma en cada render (las funciones son nuevas cada vez). Se
  // guarda en una ref para no re-suscribir el listener sesenta veces por
  // segundo ni obligar al que lo usa a memorizar cada callback.
  const mapaRef = useRef(mapa);
  mapaRef.current = mapa;

  useEffect(() => {
    if (!activo) return undefined;

    const alPresionar = (evento) => {
      const tecla = evento.key;
      if (RESERVADAS_DEL_NAVEGADOR.has(tecla)) return;

      const accion = mapaRef.current[tecla];
      if (typeof accion !== 'function') return;

      // Sin esto, F3 abre el buscador del navegador y F7 el cursor de
      // navegación de Firefox por encima de nuestra acción.
      evento.preventDefault();
      accion(evento);
    };

    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [activo]);
}

export default useAtajosTeclado;
