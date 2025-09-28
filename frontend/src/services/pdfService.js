// frontend/src/services/pdfService.js

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from '../utils/helpers';

/**
 * Genera un recibo de venta en formato PDF.
 * @param {object} venta - El objeto completo de la venta.
 * @param {object} datosNegocio - Los datos del negocio (nombre, dirección, etc.).
 * @param {object} cliente - Los datos del cliente asociado a la venta.
 */
export const generarPdfVenta = (venta, datosNegocio, cliente) => {
  if (!venta) {
    console.error(
      'No se proporcionaron datos de la venta para generar el PDF.',
    );
    return;
  }

  // 1. Inicializar el documento PDF
  // 'p' = points, 'mm' = millimeters, 'a4' = tamaño de página
  const doc = new jsPDF('p', 'mm', 'a4');

  // 2. Definir fuentes y colores (puedes personalizarlos)
  const font = 'Helvetica';
  const primaryColor = '#18181b'; // Zinc 900
  const secondaryColor = '#52525b'; // Zinc 600
  const textColor = '#1f2937'; // Gray 800

  // 3. Encabezado del Negocio
  doc.setFont(font, 'bold');
  doc.setFontSize(16);
  doc.setTextColor(primaryColor);
  doc.text(datosNegocio?.nombre || 'Mi Negocio', 14, 22);

  doc.setFont(font, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(secondaryColor);
  doc.text(datosNegocio?.direccion || 'Dirección no configurada', 14, 28);
  doc.text(`CUIT: ${datosNegocio?.cuit || 'No configurado'}`, 14, 34);

  // 4. Detalles de la Venta (a la derecha)
  doc.setFont(font, 'bold');
  doc.setFontSize(12);
  doc.setTextColor(primaryColor);
  doc.text('RECIBO DE VENTA', 205, 22, { align: 'right' });

  doc.setFont(font, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(textColor);
  doc.text(`N°: ${venta.id}`, 205, 28, { align: 'right' });
  doc.text(`Fecha: ${venta.fecha} - ${venta.hora}`, 205, 34, {
    align: 'right',
  });
  doc.text(`Vendedor: ${venta.vendedorNombre || 'N/A'}`, 205, 40, {
    align: 'right',
  });

  // 5. Datos del Cliente
  doc.setDrawColor(secondaryColor);
  doc.line(14, 48, 196, 48); // Línea separadora

  doc.setFont(font, 'bold');
  doc.setTextColor(textColor);
  doc.text('Cliente:', 14, 55);

  doc.setFont(font, 'normal');
  const clienteNombre =
    cliente?.nombre || venta.clienteNombre || 'Consumidor Final';
  const clienteCuit = cliente?.cuit || '';
  doc.text(clienteNombre, 28, 55);
  if (clienteCuit) {
    doc.text(`CUIT/CUIL: ${clienteCuit}`, 14, 61);
  }
  doc.line(14, 68, 196, 68); // Línea separadora

  // 6. Tabla de Productos (usando jspdf-autotable)
  const tableColumn = ['Cant.', 'Producto', 'P. Unit.', 'Desc.', 'Subtotal'];
  const tableRows = [];

  venta.items.forEach((item) => {
    const itemData = [
      item.cantidad,
      item.nombre,
      `$${formatCurrency(item.precioOriginal)}`,
      `${item.descuentoPorcentaje}%`,
      `$${formatCurrency(item.precioFinal * item.cantidad)}`,
    ];
    tableRows.push(itemData);
  });

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 72,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 30, 30], // Un gris oscuro
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    styles: {
      font: font,
      fontSize: 9,
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { halign: 'center' }, // Cantidad
      2: { halign: 'right' }, // P. Unit.
      3: { halign: 'center' }, // Desc.
      4: { halign: 'right' }, // Subtotal
    },
  });

  // 7. Totales y Métodos de Pago
  const finalY = doc.lastAutoTable.finalY + 10;

  // Métodos de pago
  doc.setFont(font, 'bold');
  doc.text('Métodos de Pago:', 14, finalY);
  doc.setFont(font, 'normal');
  let pagoY = finalY;
  if (venta.pagos && venta.pagos.length > 0) {
    venta.pagos.forEach((p) => {
      pagoY += 6;
      doc.text(
        `${p.metodo.replace('_', ' ').charAt(0).toUpperCase() + p.metodo.slice(1).replace('_', ' ')}:`,
        14,
        pagoY,
      );
      doc.text(`$${formatCurrency(p.monto)}`, 50, pagoY, { align: 'right' });
    });
  } else {
    pagoY += 6;
    doc.text(venta.metodoPago || 'N/A', 14, pagoY);
  }

  // Total
  doc.setFontSize(14);
  doc.setFont(font, 'bold');
  doc.text('TOTAL:', 150, finalY + 8);
  doc.text(`$${formatCurrency(venta.total)}`, 205, finalY + 8, {
    align: 'right',
  });

  // 8. Pie de página
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(secondaryColor);
    doc.text('Documento no válido como factura.', 14, 285);
    doc.text(`Página ${i} de ${pageCount}`, 205, 285, { align: 'right' });
  }

  // 9. Guardar el archivo PDF
  doc.save(`Recibo_Venta_${venta.id.substring(0, 8)}.pdf`);
};
