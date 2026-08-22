// frontend/src/utils/dni.js
//
// Parseo del código PDF417 del DNI argentino y cálculo de CUIL.
// Formato tarjeta (el más común):
//   tramite@APELLIDO@NOMBRES@SEXO@DNI@EJEMPLAR@DD/MM/AAAA@DD/MM/AAAA@...
// Formato viejo (empieza con "@"):
//   @APELLIDO@NOMBRES@SEXO@DNI@...

const capitalizar = (txt) =>
  String(txt || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');

/**
 * Calcula el CUIL a partir del DNI y el sexo ('M' | 'F').
 * @returns {string} CUIL con guiones, o '' si no se pudo calcular.
 */
export function calcularCuil(dni, sexo) {
  const num = String(dni || '').replace(/\D/g, '');
  if (num.length < 7 || num.length > 8) return '';
  const doc = num.padStart(8, '0');
  const mult = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

  const calcular = (prefijo) => {
    const base = `${prefijo}${doc}`;
    const suma = base
      .split('')
      .reduce((acc, d, i) => acc + Number(d) * mult[i], 0);
    const resto = suma % 11;
    if (resto === 0) return 0;
    if (resto === 1) return null; // caso especial: se usa prefijo 23
    return 11 - resto;
  };

  const esF = String(sexo || '').toUpperCase().startsWith('F');
  let prefijo = esF ? 27 : 20;
  let dv = calcular(prefijo);
  if (dv === null) {
    prefijo = 23;
    dv = esF ? 4 : 9;
  }
  return `${prefijo}-${doc}-${dv}`;
}

/**
 * Parsea el texto del PDF417 de un DNI argentino.
 * @returns {{nombre:string, dni:string, sexo:string, cuil:string}|null}
 */
export function parsearDni(texto) {
  const raw = String(texto || '').trim();
  if (!raw.includes('@')) return null;
  const partes = raw.split('@');
  if (partes.length < 5) return null;

  // El formato viejo arranca con "@" (primer elemento vacío).
  const offset = partes[0] === '' ? 1 : 1;
  const apellido = partes[offset] || '';
  const nombres = partes[offset + 1] || '';
  const sexo = (partes[offset + 2] || '').trim().toUpperCase();
  const dni = String(partes[offset + 3] || '').replace(/\D/g, '');

  if (!apellido || !nombres || !dni) return null;

  return {
    nombre: capitalizar(`${nombres} ${apellido}`),
    dni,
    sexo,
    cuil: calcularCuil(dni, sexo),
  };
}
