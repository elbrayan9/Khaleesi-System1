import React from 'react';

const PrintReceipt = React.forwardRef(
  ({ venta, datosNegocio, cliente, formatCurrency }, ref) => {
    if (!venta) return null;
    const clienteData = cliente || { nombre: 'Consumidor Final', cuit: '' };

    return (
      <div
        ref={ref}
        className="hidden print:block"
        id="comprobante-imprimir-react"
      >
        <style>
          {`
    /* Ya no necesitamos @media print, estos estilos se aplicarán directamente en el iframe */
    #comprobante-imprimir-react {
        width: 76mm;
        margin: 0;
        padding: 0;
        font-family: 'monospace', 'Courier New', Courier;
        font-size: 9.5pt;
        color: #000;
    }
    h4 { text-align: center; font-weight: bold; margin-bottom: 8px; font-size: 12pt; }
    p { margin: 2px 0; line-height: 1.3; }
    hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 9pt; }
    th, td { text-align: left; padding: 3px 1px; vertical-align: top; }
    .total-final { text-align: right; font-weight: bold; font-size: 11pt; margin-top: 8px; }
    .pie-pagina { text-align: center; margin-top: 12px; font-size: 8pt; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    `}
        </style>

        <h4>{datosNegocio?.nombre || 'Mi Negocio'}</h4>
        <p>{datosNegocio?.direccion}</p>
        <p>CUIT: {datosNegocio?.cuit}</p>
        <hr />
        <p>
          Fecha: {venta.fecha} {venta.hora}
        </p>
        <p>Comprobante Venta #{venta.id.substring(0, 12)}...</p>
        <p>Cliente: {clienteData.nombre}</p>
        {clienteData.cuit && <p>CUIT/CUIL: {clienteData.cuit}</p>}
        {venta.vendedorNombre && <p>Atendido por: {venta.vendedorNombre}</p>}
        <hr />
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th className="text-center">Cant.</th>
              <th className="text-right">P.Unit</th>
              {/* --- AÑADIDO: Columna de Descuento --- */}
              <th className="text-center">Desc.</th>
              <th className="text-right">Subt.</th>
            </tr>
          </thead>
          <tbody>
            {venta.items.map((item, index) => (
              <tr key={index}>
                <td>{item.nombre}</td>
                <td className="text-center">{item.cantidad}</td>
                <td className="text-right">
                  ${formatCurrency(item.precioOriginal || item.precioFinal)}
                </td>
                {/* --- AÑADIDO: Celda para el valor del descuento --- */}
                <td className="text-center">
                  {item.descuentoPorcentaje > 0
                    ? `${item.descuentoPorcentaje}%`
                    : '-'}
                </td>
                <td className="text-right">
                  ${formatCurrency(item.precioFinal * item.cantidad)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* En PrintReceipt.jsx, reemplaza esta sección final */}

        <hr />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            paddingTop: '5px',
          }}
        >
          {/* Columna Izquierda: Detalles del Pago */}
          <div style={{ fontSize: '9pt' }}>
            <p>
              <strong>Medios de Pago:</strong>
            </p>
            <div style={{ paddingLeft: '8px' }}>
              {venta.pagos && venta.pagos.length > 0 ? (
                venta.pagos.map((p, i) => (
                  <div key={i}>
                    <span style={{ textTransform: 'capitalize' }}>
                      {p.metodo.replace('_', ' ')}:{' '}
                    </span>
                    <span>${formatCurrency(p.monto)}</span>
                  </div>
                ))
              ) : (
                // Compatibilidad con ventas antiguas
                <p>{venta.metodoPago || 'N/A'}</p>
              )}
            </div>
            <p style={{ marginTop: '5px' }}>
              <strong>Tipo Factura:</strong> {venta.tipoFactura}
            </p>
          </div>

          {/* Columna Derecha: Total Final */}
          <div style={{ textAlign: 'right' }}>
            <p className="total-final">TOTAL: ${formatCurrency(venta.total)}</p>
          </div>
        </div>
        <hr />
        <p className="pie-pagina">¡Gracias por su compra!</p>
        <p className="pie-pagina">Documento no válido como factura.</p>
      </div>
    );
  },
);

PrintReceipt.displayName = 'PrintReceipt';
export default PrintReceipt;
