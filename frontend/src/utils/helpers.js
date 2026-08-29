
/**
 * Obtiene la fecha y hora actual formateada.
 * @returns {object} Objeto con fecha, hora y timestamp.
 */
export const obtenerFechaHoraActual = () => {
  const a = new Date();
  return {
    fecha: a.toLocaleDateString('es-AR'), // Formato DD/MM/YYYY
    hora: a.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }), // Formato HH:MM
    timestamp: a.toISOString(), // Formato ISO para ordenamiento/comparación
  };
};

/**
 * Formatea un valor numérico como moneda argentina: separador de miles (.) y
 * coma decimal, con 2 decimales. NO incluye el símbolo $ a propósito: en todo
 * el sistema se antepone a mano (`$${formatCurrency(x)}`), y agregarlo acá
 * duplicaría el signo.
 * Ej: 105000 -> "105.000,00"
 * @param {number} value - El valor a formatear.
 * @returns {string} El valor formateado como string.
 */
export const formatCurrency = (value) => {
  // Asegura que el valor sea numérico y maneja null/undefined
  const numberValue = Number(value);
  const seguro = isNaN(numberValue) ? 0 : numberValue;
  try {
    return seguro.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch {
    // Si el entorno no soporta la locale, se mantiene el formato anterior.
    return seguro.toFixed(2);
  }
};

/**
 * Muestra un mensaje emergente usando SweetAlert2.
 * @param {string} texto - El mensaje a mostrar.
 * @param {'info' | 'success' | 'error' | 'warning' | 'question'} [tipo='info'] - El tipo de icono a mostrar.
 */

/**
 * Muestra un diálogo de confirmación usando SweetAlert2.
 * @param {string} titulo - El título del diálogo.
 * @param {string} texto - El texto principal del diálogo.
 * @param {'warning' | 'error' | 'success' | 'info' | 'question'} [icono='warning'] - El icono a mostrar.
 * @param {string} [confirmButtonText='Sí, eliminar'] - Texto del botón de confirmación.
 * @returns {Promise<boolean>} Promesa que resuelve a true si se confirma, false si se cancela.
 */

/**
 * Obtiene el nombre del mes a partir de su número (0-11).
 * @param {number} numeroMes - El número del mes (0 para Enero, 11 para Diciembre).
 * @returns {string} El nombre del mes.
 */
export const obtenerNombreMes = (numeroMes) => {
  const meses = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];
  // Devuelve el mes correcto o "Enero" si el número es inválido
  return meses[numeroMes >= 0 && numeroMes < 12 ? numeroMes : 0];
};
/**
 * Formatea una fecha (string 'YYYY-MM-DD' o un objeto Date) a un formato legible 'DD/MM/YYYY'.
 * @param {string | Date} dateInput - La fecha a formatear.
 * @returns {string} - La fecha formateada.
 */
export const formatDate = (dateInput) => {
  if (!dateInput) return 'N/A';
  try {
    // Esto funciona tanto para strings 'YYYY-MM-DD' como para objetos Date de Firestore
    const date = new Date(dateInput);

    // Nos aseguramos de que la fecha se muestre en la zona horaria local y no en UTC
    // lo que a veces puede causar que se muestre el día anterior.
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() + userTimezoneOffset);

    return adjustedDate.toLocaleDateString('es-AR', {
      // 'es-AR' para formato de Argentina
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch (error) {
    console.error('Error al formatear la fecha:', dateInput, error);
    return String(dateInput); // Si falla, devuelve el valor original
  }
};

// ----------------------------------------------------------------------------
// Envío de comprobantes por WhatsApp (gratis, vía wa.me)
// ----------------------------------------------------------------------------

// Abre WhatsApp con el mensaje ya escrito. Precarga el teléfono del cliente si
// está disponible (normalizado a Argentina: 549 + número).
const abrirWhatsapp = (mensaje, cliente) => {
  let tel = String(cliente?.telefono || '').replace(/\D/g, '');
  if (tel && !tel.startsWith('54')) tel = `549${tel}`;
  const url = `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
};

/** Arma el texto del comprobante de una VENTA (sin abrir WhatsApp). */
export const construirMensajeComprobante = (venta, datosNegocio) => {
  const negocio = datosNegocio?.nombre || 'Mi Negocio';
  const items = Array.isArray(venta?.items) ? venta.items : [];
  const lineas = items
    .map((it) => {
      const cant = Number(it.cantidad) || 0;
      const totalLinea = Number(it.precioFinal) || 0;
      return `- ${it.nombre} x${cant}: $${formatCurrency(totalLinea)}`;
    })
    .join('\n');
  const esFactura = !!venta?.afipData?.cae;
  const encabezado = esFactura
    ? `Factura N° ${venta.afipData.cbteNro || ''}`
    : `Comprobante #${String(venta?.id || '').substring(0, 8)}`;
  const cae = esFactura ? `\nCAE: ${venta.afipData.cae}` : '';
  return (
    `*${negocio}*\n${encabezado}\n` +
    `Fecha: ${venta?.fecha || ''}\n` +
    `--------------------\n${lineas}\n--------------------\n` +
    `*TOTAL: $${formatCurrency(venta?.total)}*${cae}\n\n` +
    `¡Gracias por tu compra!`
  );
};

/** Abre WhatsApp con un mensaje (expuesto para otros flujos, ej: PDF + link). */
export const abrirWhatsappConMensaje = (mensaje, cliente) =>
  abrirWhatsapp(mensaje, cliente);

/** Envía el comprobante de una VENTA por WhatsApp (solo texto). */
export const enviarComprobantePorWhatsapp = (venta, datosNegocio, cliente) => {
  if (!venta) return;
  abrirWhatsapp(construirMensajeComprobante(venta, datosNegocio), cliente);
};

/** Envía una NOTA de crédito/débito por WhatsApp. */
export const enviarNotaPorWhatsapp = (nota, datosNegocio, cliente) => {
  if (!nota) return;
  const negocio = datosNegocio?.nombre || 'Mi Negocio';
  const tipo = nota.tipo === 'debito' ? 'Nota de Débito' : 'Nota de Crédito';
  const encabezado = nota.cbteNro ? `${tipo} N° ${nota.cbteNro}` : tipo;
  const items = Array.isArray(nota.itemsDevueltos) ? nota.itemsDevueltos : [];
  const lineas = items
    .map((it) => {
      const cant = Number(it.cantidad) || 0;
      const unit = Number(it.precioOriginal) || 0;
      return `- ${it.nombre} x${cant}: $${formatCurrency(unit * cant)}`;
    })
    .join('\n');
  const cuerpo = lineas
    ? `--------------------\n${lineas}\n--------------------\n`
    : '';
  const cae = nota.cae ? `\nCAE: ${nota.cae}` : '';
  const mensaje =
    `*${negocio}*\n${encabezado}\n` +
    `Fecha: ${nota.fecha || ''}\n` +
    (nota.motivo ? `Motivo: ${nota.motivo}\n` : '') +
    cuerpo +
    `*TOTAL: $${formatCurrency(nota.monto)}*${cae}\n\n` +
    `Comprobante de tu operación.`;
  abrirWhatsapp(mensaje, cliente);
};
