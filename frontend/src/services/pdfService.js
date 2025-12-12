// frontend/src/services/pdfService.js

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { formatCurrency } from '../utils/helpers';

/**
 * Genera un recibo de venta en formato PDF con diseño oficial de AFIP.
 * @param {object} venta - El objeto completo de la venta.
 * @param {object} datosNegocio - Los datos del negocio.
 * @param {object} cliente - Los datos del cliente.
 * @param {string} tipoDocumento - 'Factura A', 'Factura B', 'Factura C', 'Ticket X', 'Presupuesto'
 */
export const generarPdfVenta = async (
  venta,
  datosNegocio,
  cliente,
  tipoDocumento = 'Ticket X',
  accion = 'download',
) => {
  if (!venta) {
    console.error('No se proporcionaron datos de la venta.');
    return;
  }

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width; // 210mm
  const pageHeight = doc.internal.pageSize.height; // 297mm
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;

  // --- CONFIGURACIÓN DE FUENTES Y COLORES ---
  const font = 'Helvetica';
  const colorBlack = '#000000';
  const colorGray = '#4b5563'; // Gray 600

  // --- DETERMINAR LETRA Y CÓDIGO ---
  let letra = 'X';
  let codigoComprobante = '';
  let tituloComprobante = 'COMPROBANTE NO VÁLIDO COMO FACTURA';

  const tipoUpper = tipoDocumento.toUpperCase();

  if (tipoUpper.includes('FACTURA A') || tipoUpper === 'A') {
    letra = 'A';
    codigoComprobante = 'COD. 001';
    tituloComprobante = 'FACTURA';
  } else if (tipoUpper.includes('FACTURA B') || tipoUpper === 'B') {
    letra = 'B';
    codigoComprobante = 'COD. 006';
    tituloComprobante = 'FACTURA';
  } else if (tipoUpper.includes('FACTURA C') || tipoUpper === 'C') {
    letra = 'C';
    codigoComprobante = 'COD. 011';
    tituloComprobante = 'FACTURA';
  } else if (tipoUpper.includes('PRESUPUESTO')) {
    letra = 'P';
    tituloComprobante = 'PRESUPUESTO';
  }
  // NOTAS DE CRÉDITO
  else if (tipoUpper.includes('NOTA DE CRÉDITO A')) {
    letra = 'A';
    codigoComprobante = 'COD. 003';
    tituloComprobante = 'NOTA DE CRÉDITO';
  } else if (tipoUpper.includes('NOTA DE CRÉDITO B')) {
    letra = 'B';
    codigoComprobante = 'COD. 008';
    tituloComprobante = 'NOTA DE CRÉDITO';
  } else if (tipoUpper.includes('NOTA DE CRÉDITO C')) {
    letra = 'C';
    codigoComprobante = 'COD. 013';
    tituloComprobante = 'NOTA DE CRÉDITO';
  } else if (tipoUpper.includes('NOTA DE CRÉDITO')) {
    // Default / X
    letra = 'X';
    codigoComprobante = ''; // 'DOCUMENTO NO VÁLIDO COMO FACTURA' is too long for the box
    tituloComprobante = 'NOTA DE CRÉDITO';
  }
  // NOTAS DE DÉBITO
  else if (tipoUpper.includes('NOTA DE DÉBITO A')) {
    letra = 'A';
    codigoComprobante = 'COD. 002';
    tituloComprobante = 'NOTA DE DÉBITO';
  } else if (tipoUpper.includes('NOTA DE DÉBITO B')) {
    letra = 'B';
    codigoComprobante = 'COD. 007';
    tituloComprobante = 'NOTA DE DÉBITO';
  } else if (tipoUpper.includes('NOTA DE DÉBITO C')) {
    letra = 'C';
    codigoComprobante = 'COD. 012';
    tituloComprobante = 'NOTA DE DÉBITO';
  } else if (tipoUpper.includes('NOTA DE DÉBITO')) {
    // Default / X
    letra = 'X';
    codigoComprobante = ''; // 'DOCUMENTO NO VÁLIDO COMO FACTURA' is too long for the box
    tituloComprobante = 'NOTA DE DÉBITO';
  }

  // --- FALLBACK: SI ES 'X' PERO TIENE DATOS DE AFIP, CORREGIMOS ---
  if (letra === 'X' && venta.afipData && venta.afipData.cbteTipo) {
    const tipo = parseInt(venta.afipData.cbteTipo, 10);

    // FACTURAS
    if (tipo === 1) {
      letra = 'A';
      codigoComprobante = 'COD. 001';
      tituloComprobante = 'FACTURA';
    } else if (tipo === 6) {
      letra = 'B';
      codigoComprobante = 'COD. 006';
      tituloComprobante = 'FACTURA';
    } else if (tipo === 11) {
      letra = 'C';
      codigoComprobante = 'COD. 011';
      tituloComprobante = 'FACTURA';
    } else if (tipo === 2) {
      // NOTAS DE DÉBITO
      letra = 'A';
      codigoComprobante = 'COD. 002';
      tituloComprobante = 'NOTA DE DÉBITO';
    } else if (tipo === 7) {
      letra = 'B';
      codigoComprobante = 'COD. 007';
      tituloComprobante = 'NOTA DE DÉBITO';
    } else if (tipo === 12) {
      letra = 'C';
      codigoComprobante = 'COD. 012';
      tituloComprobante = 'NOTA DE DÉBITO';
    } else if (tipo === 3) {
      // NOTAS DE CRÉDITO
      letra = 'A';
      codigoComprobante = 'COD. 003';
      tituloComprobante = 'NOTA DE CRÉDITO';
    } else if (tipo === 8) {
      letra = 'B';
      codigoComprobante = 'COD. 008';
      tituloComprobante = 'NOTA DE CRÉDITO';
    } else if (tipo === 13) {
      letra = 'C';
      codigoComprobante = 'COD. 013';
      tituloComprobante = 'NOTA DE CRÉDITO';
    }
  }

  // --- FALLBACK 2: SI ES MONOTRIBUTISTA Y TIENE CAE, SIEMPRE ES 'C' ---
  // (Para arreglar notas viejas que no guardaron el cbteTipo)
  if (
    letra === 'X' &&
    venta.afipData &&
    venta.afipData.cae &&
    datosNegocio &&
    datosNegocio.condicionIva &&
    datosNegocio.condicionIva.toLowerCase().includes('monotributo')
  ) {
    letra = 'C';
    if (tituloComprobante === 'NOTA DE CRÉDITO') {
      codigoComprobante = 'COD. 013';
    } else if (tituloComprobante === 'NOTA DE DÉBITO') {
      codigoComprobante = 'COD. 012';
    } else if (tituloComprobante === 'FACTURA') {
      codigoComprobante = 'COD. 011';
    }
  }

  // --- DIBUJAR ESTRUCTURA (CAJAS) ---
  doc.setLineWidth(0.3);
  doc.setDrawColor(0);

  // 1. Caja Principal del Encabezado
  doc.rect(margin, margin, contentWidth, 50);

  // 2. Caja de la Letra (Centro)
  const boxSize = 15;
  const centerX = pageWidth / 2;
  doc.rect(centerX - boxSize / 2, margin, boxSize, boxSize);

  // 3. Línea vertical divisoria (debajo de la caja de la letra)
  doc.line(centerX, margin + boxSize, centerX, margin + 50);

  // --- CONTENIDO DEL ENCABEZADO ---

  // LETRA
  doc.setFont(font, 'bold');
  doc.setFontSize(24);
  doc.text(letra, centerX, margin + 10, { align: 'center' });
  doc.setFontSize(8);
  doc.text(codigoComprobante, centerX, margin + 14, { align: 'center' });

  // COLUMNA IZQUIERDA (EMISOR)
  const leftColX = margin + 5;
  let currentY = margin + 10;

  // Nombre Fantasía (Grande)
  doc.setFontSize(18);
  doc.text(datosNegocio?.nombre || 'Mi Negocio', leftColX, currentY);
  currentY += 8;

  // Datos Emisor
  doc.setFontSize(9);
  doc.setFont(font, 'bold');
  doc.text('Razón Social:', leftColX, currentY);
  doc.setFont(font, 'normal');
  doc.text(datosNegocio?.nombre || '', leftColX + 22, currentY);
  currentY += 5;

  doc.setFont(font, 'bold');
  doc.text('Domicilio:', leftColX, currentY);
  doc.setFont(font, 'normal');
  // Ajustar texto largo de dirección
  const direccionLines = doc.splitTextToSize(datosNegocio?.direccion || '', 65);
  doc.text(direccionLines, leftColX + 16, currentY);
  // Incrementamos Y dinámicamente según la cantidad de líneas (4mm por línea)
  currentY += Math.max(5, direccionLines.length * 4);

  doc.setFont(font, 'bold');
  doc.text('Condición IVA:', leftColX, currentY);
  doc.setFont(font, 'normal');
  doc.text('Responsable Monotributo', leftColX + 24, currentY); // Hardcoded por ahora, idealmente vendría de config

  // COLUMNA DERECHA (DATOS COMPROBANTE)
  const rightColX = centerX + 10;
  currentY = margin + 10;

  // Título
  doc.setFontSize(18);
  doc.setFont(font, 'bold');
  doc.text(tituloComprobante, rightColX, currentY);
  currentY += 8;

  // Datos
  doc.setFontSize(10);
  const ptoVta = venta.afipData?.ptoVta || datosNegocio?.puntoVenta || 1;
  doc.text(
    `Punto de Venta: ${String(ptoVta).padStart(5, '0')}`,
    rightColX,
    currentY,
  );
  doc.text(
    `Comp. Nro: ${String(venta.afipData?.cbteNro || venta.id).padStart(8, '0')}`,
    rightColX + 45,
    currentY,
  );
  currentY += 6;

  doc.text(`Fecha de Emisión: ${venta.fecha}`, rightColX, currentY);
  currentY += 6;

  doc.text(`CUIT: ${datosNegocio?.cuit || ''}`, rightColX, currentY);
  currentY += 6;

  doc.text('Ingresos Brutos: EXENTO', rightColX, currentY);
  currentY += 6;

  doc.text(
    `Inicio de Actividades: ${datosNegocio?.inicioActividades || '01/01/2024'}`,
    rightColX,
    currentY,
  );

  // --- CAJA DE PERIODO (Debajo del encabezado) ---
  const periodoY = margin + 52;
  doc.rect(margin, periodoY, contentWidth, 8);
  doc.setFontSize(9);
  doc.setFont(font, 'bold');
  doc.text('Período Facturado Desde:', margin + 2, periodoY + 5);
  doc.setFont(font, 'normal');
  doc.text(venta.fecha, margin + 42, periodoY + 5);
  doc.setFont(font, 'bold');
  doc.text('Hasta:', margin + 70, periodoY + 5);
  doc.setFont(font, 'normal');
  doc.text(venta.fecha, margin + 82, periodoY + 5);
  doc.setFont(font, 'bold');
  doc.text('Vto. para el pago:', margin + 120, periodoY + 5);
  doc.setFont(font, 'normal');
  doc.text(venta.fecha, margin + 150, periodoY + 5);

  // --- CAJA DE DATOS DEL CLIENTE ---
  const clienteY = periodoY + 10;
  doc.rect(margin, clienteY, contentWidth, 20);

  currentY = clienteY + 5;
  // Fila 1
  doc.setFont(font, 'bold');
  doc.text('CUIT:', margin + 2, currentY);
  doc.setFont(font, 'normal');
  doc.text(cliente?.cuit || venta.clienteCuit || '', margin + 12, currentY);

  doc.setFont(font, 'bold');
  doc.text('Apellido y Nombre / Razón Social:', margin + 60, currentY);
  doc.setFont(font, 'normal');
  doc.text(
    cliente?.nombre || venta.clienteNombre || 'Consumidor Final',
    margin + 120,
    currentY,
  );

  currentY += 6;
  // Fila 2
  doc.setFont(font, 'bold');
  doc.text('Condición frente al IVA:', margin + 2, currentY);
  doc.setFont(font, 'normal');
  doc.text(
    cliente?.condicionFiscal || 'Consumidor Final',
    margin + 40,
    currentY,
  );

  doc.setFont(font, 'bold');
  doc.text('Domicilio:', margin + 90, currentY);
  doc.setFont(font, 'normal');
  const domicilio = cliente?.direccion || '-';
  const domicilioLines = doc.splitTextToSize(domicilio, 75); // Ajustar ancho máximo
  doc.text(domicilioLines, margin + 108, currentY);

  currentY += 6;
  // Fila 3
  doc.setFont(font, 'bold');
  doc.text('Condición de venta:', margin + 2, currentY);
  doc.setFont(font, 'normal');
  doc.text(venta.metodoPago || 'Contado', margin + 35, currentY);

  // --- NUEVO: MOSTRAR COMPROBANTE ASOCIADO ---
  if (venta.ventaRelacionadaId) {
    const nroAsoc = String(venta.ventaRelacionadaId).replace(/\D/g, '');
    doc.setFont(font, 'bold');
    doc.text('Comp. Asociado:', margin + 90, currentY); // A la derecha
    doc.setFont(font, 'normal');
    doc.text(`Factura N° ${nroAsoc}`, margin + 118, currentY);
  }

  // --- TABLA DE ÍTEMS ---
  const tableY = clienteY + 22;

  const tableColumn = [
    'Código',
    'Producto / Servicio',
    'Cantidad',
    'U. Medida',
    'Precio Unit.',
    '% Bonif',
    'Subtotal',
  ];
  const tableRows = [];

  venta.items.forEach((item) => {
    const itemData = [
      item.codigoBarras || item.id.substring(0, 6),
      item.nombre,
      item.cantidad,
      'unidades',
      formatCurrency(item.precioOriginal), // Precio Unitario
      formatCurrency(item.descuentoPorcentaje), // Bonif
      formatCurrency(item.precioFinal * item.cantidad), // Subtotal
    ];
    tableRows.push(itemData);
  });

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: tableY,
    theme: 'plain', // Tema plano para parecerse más al oficial
    styles: {
      font: font,
      fontSize: 9,
      cellPadding: 2,
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [220, 220, 220], // Gris claro
      textColor: 0,
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'left' }, // Código
      1: { halign: 'left' }, // Producto
      2: { halign: 'center' }, // Cantidad
      3: { halign: 'center' }, // U. Medida
      4: { halign: 'right' }, // Precio Unit
      5: { halign: 'center' }, // Bonif
      6: { halign: 'right' }, // Subtotal
    },
    // Dibujar bordes de la tabla manualmente si es necesario, o usar theme grid
    tableLineColor: 0,
    tableLineWidth: 0.1,
  });

  // --- TOTALES Y PIE DE PÁGINA ---
  const finalY = doc.lastAutoTable.finalY;
  const footerHeight = 40; // Espacio para totales y QR
  const bottomY = pageHeight - margin - footerHeight;

  // Si la tabla termina muy abajo, agregar página
  if (finalY > bottomY) {
    doc.addPage();
  }

  // Dibujar caja de totales (siempre al final de la tabla o abajo)
  // Para simplificar, lo ponemos justo debajo de la tabla
  let totalY = finalY + 5;

  doc.setFont(font, 'bold');
  doc.text('Subtotal: $', 140, totalY, { align: 'right' });
  doc.text(formatCurrency(venta.total), 190, totalY, { align: 'right' });

  totalY += 6;
  doc.text('Importe Otros Tributos: $', 140, totalY, { align: 'right' });
  doc.text('0,00', 190, totalY, { align: 'right' });

  totalY += 6;
  doc.setFontSize(11);
  doc.text('Importe Total: $', 140, totalY, { align: 'right' });
  doc.text(formatCurrency(venta.total), 190, totalY, { align: 'right' });

  // --- PIE DE PÁGINA (QR y CAE) ---
  // Posición fija al fondo de la página
  const qrY = pageHeight - 50;

  if (tipoUpper.includes('PRESUPUESTO')) {
    doc.setFontSize(12);
    doc.setFont(font, 'bold');
    doc.setTextColor(colorBlack);
    doc.text('DOCUMENTO NO VÁLIDO COMO FACTURA', pageWidth / 2, qrY + 20, {
      align: 'center',
    });
  } else {
    // Logo ARCA (Texto por ahora)
    doc.setFontSize(14);
    doc.setFont(font, 'bold');
    doc.setTextColor(colorGray);
    doc.text('ARCA', margin + 40, qrY + 10);
    doc.setFontSize(6);
    doc.text('AGENCIA DE RECAUDACIÓN', margin + 40, qrY + 14);
    doc.text('Y CONTROL ADUANERO', margin + 40, qrY + 17);
    doc.setTextColor(colorBlack);

    doc.setFontSize(9);
    doc.setFont(font, 'bolditalic');
    doc.text('Comprobante Autorizado', margin + 40, qrY + 25);
    doc.setFont(font, 'italic');
    doc.setFontSize(7);
    doc.text(
      'Esta Administración Federal no se responsabiliza por los datos ingresados en el detalle de la operación',
      margin + 40,
      qrY + 30,
    );
  }

  // CAE y Vencimiento (Derecha)
  if (
    venta.afipData &&
    venta.afipData.cae &&
    !tipoUpper.includes('PRESUPUESTO')
  ) {
    doc.setFontSize(10);
    doc.setFont(font, 'bold');
    doc.text(`CAE N°: ${venta.afipData.cae}`, pageWidth - margin, qrY + 10, {
      align: 'right',
    });
    doc.text(
      `Fecha de Vto. de CAE: ${venta.afipData.caeFchVto}`,
      pageWidth - margin,
      qrY + 16,
      { align: 'right' },
    );

    // --- GENERACIÓN DE QR ---
    try {
      const qrData = {
        ver: 1,
        fecha: venta.fecha.split('/').reverse().join('-'),
        cuit: parseInt(datosNegocio.cuit.replace(/\D/g, ''), 10),
        ptoVta: venta.afipData.ptoVta || 1,
        tipoCmp: parseInt(venta.afipData.cbteTipo, 10),
        nroCmp: parseInt(venta.afipData.cbteNro, 10),
        importe: venta.total,
        moneda: 'PES',
        ctz: 1,
        tipoDocRec: venta.afipData.docTipo || 99,
        nroDocRec: parseInt(venta.afipData.docNro || 0, 10),
        tipoCodAut: 'E',
        codAut: parseInt(venta.afipData.cae, 10),
      };

      const jsonString = JSON.stringify(qrData);
      const base64Data = btoa(jsonString);
      const urlQR = `https://www.afip.gob.ar/fe/qr/?p=${base64Data}`;

      const qrImage = await QRCode.toDataURL(urlQR, {
        errorCorrectionLevel: 'M',
      });
      doc.addImage(qrImage, 'PNG', margin, qrY, 35, 35);
    } catch (error) {
      console.error('Error QR:', error);
    }
  }

  // Guardar PDF o Imprimir
  if (accion === 'print') {
    doc.autoPrint(); // Inyecta script de impresión automática en el PDF
    const blobUrl = doc.output('bloburl');

    // Crear un iframe invisible para imprimir sin pop-ups
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.src = blobUrl;

    document.body.appendChild(iframe);

    // Esperar a que cargue y llamar a imprimir
    iframe.onload = function () {
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }, 500); // Pequeño delay para asegurar carga del PDF viewer
    };
  } else {
    doc.save(
      `${tipoDocumento.replace(/ /g, '_')}_${venta.id ? venta.id.substring(0, 8) : 'temp'}.pdf`,
    );
  }
};
