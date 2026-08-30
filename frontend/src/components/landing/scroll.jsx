// Las piezas de scroll de la landing, en un solo lugar.
//
// Antes cada sección resolvía su aparición por su cuenta: unas entraban con
// opacidad, otras desde el costado, otras escalando, algunas con margen de
// disparo y otras sin. Bajando se notaba el desorden, porque cada bloque
// llegaba con una regla distinta.
//
// Acá viven las tres piezas que usa toda la página: la aparición al entrar en
// pantalla, el escalonado de las grillas y el parallax. Todas animan solo
// transform y opacity —lo único que el navegador resuelve sin recalcular la
// página— y todas respetan "reducir movimiento": con esa preferencia activada
// no se anima nada y el contenido aparece directamente en su lugar.

import { useRef } from 'react';
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion';

// Cuánto antes del borde inferior se dispara la aparición. Un margen negativo
// espera a que el bloque esté realmente entrando y no apenas asomando.
const MARGEN = '-80px';

const DESDE = {
  abajo: { y: 32 },
  arriba: { y: -32 },
  izquierda: { x: -40 },
  derecha: { x: 40 },
  escala: { scale: 0.94 },
  // Sin desplazamiento: para bloques que ya se mueven por su cuenta.
  quieto: {},
};

// Un bloque que aparece cuando entra en pantalla. Una sola vez: volver a
// animarlo al subir marea y hace que la página se sienta inestable.
export function Revelar({
  children,
  desde = 'abajo',
  demora = 0,
  duracion = 0.55,
  className,
  ...resto
}) {
  const sinMovimiento = useReducedMotion();
  const oculto = { opacity: 0, ...(DESDE[desde] || DESDE.abajo) };

  return (
    <motion.div
      className={className}
      initial={sinMovimiento ? false : oculto}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={{ once: true, margin: MARGEN }}
      transition={{
        duration: sinMovimiento ? 0 : duracion,
        delay: sinMovimiento ? 0 : demora,
        ease: [0.22, 1, 0.36, 1],
      }}
      {...resto}
    >
      {children}
    </motion.div>
  );
}

// Una grilla cuyas tarjetas entran una detrás de otra.
//
// El escalonado lo maneja el padre con variantes en vez de un delay calculado
// por tarjeta: así el ritmo no depende de que quien la use se acuerde de pasar
// el índice, y las tarjetas que ya estaban visibles al cargar no arrancan con
// una espera absurda.
export function GrillaEscalonada({
  children,
  className,
  paso = 0.08,
  ...resto
}) {
  const sinMovimiento = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={sinMovimiento ? false : 'oculto'}
      whileInView="visible"
      viewport={{ once: true, margin: MARGEN }}
      variants={{
        visible: { transition: { staggerChildren: sinMovimiento ? 0 : paso } },
      }}
      {...resto}
    >
      {children}
    </motion.div>
  );
}

// Cada hijo de una GrillaEscalonada.
export const VARIANTES_ITEM = {
  oculto: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export function ItemEscalonado({ children, className, ...resto }) {
  return (
    <motion.div className={className} variants={VARIANTES_ITEM} {...resto}>
      {children}
    </motion.div>
  );
}

// Parallax: el elemento se mueve a distinta velocidad que la página mientras
// la sección lo atraviesa. `distancia` en píxeles; negativa sube.
//
// Devuelve el ref para la sección de referencia y el valor de y ya listo para
// pasarle a un motion.div. Con "reducir movimiento" devuelve 0 y el elemento
// queda quieto.
export function useParallax(distancia = 60) {
  const ref = useRef(null);
  const sinMovimiento = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    sinMovimiento ? [0, 0] : [distancia, -distancia],
  );
  return { ref, y };
}
