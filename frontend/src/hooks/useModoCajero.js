// Saber si el modo cajero está activo, y enterarse cuando cambia.
//
// Sin esto cada pantalla lo leería al montarse y se quedaría con ese valor: al
// entrar en modo cajero, Reportes seguiría mostrando los importes hasta que
// alguien recargue.

import { useEffect, useState } from 'react';
import { estaEnModoCajero, alCambiarModoCajero } from '../utils/modoCajero.js';

export function useModoCajero() {
  const [activo, setActivo] = useState(estaEnModoCajero);

  useEffect(() => alCambiarModoCajero(setActivo), []);

  return activo;
}

export default useModoCajero;
