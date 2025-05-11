import React from 'react';

// Componente oculto para la impresión, usa forwardRef para obtener la referencia desde App
const PrintReceipt = React.forwardRef(({ venta, datosNegocio, cliente, formatCurrency }, ref) => {
    if (!venta) return null; // No renderizar si no hay datos de venta

    const clienteData = cliente || { nombre: "Consumidor Final", cuit: "" }; // Default

    return (
        <div ref={ref} className="hidden print:block p-2" id="comprobante-imprimir-react">
             {/* Estilos específicos para impresión */}
            <style>
                {`
                @media print {
                    body * { visibility: hidden; }
                    #comprobante-imprimir-react, #comprobante-imprimir-react * { visibility: visible; }
                    #comprobante-imprimir-react {
                        position: absolute; left: 0; top: 0; width: 90%; /* Ajustar */
                        margin: 0 auto; font-family: 'Courier New', Courier, monospace;
                        font-size: 10pt; color: #000; padding: 5px;
                        background-color: white !important; -webkit-print-color-adjust: exact; color-adjust: exact;
                    }
                    #comprobante-imprimir-react h4 { text-align: center; font-weight: bold; margin-bottom: 5px; font-size: 12pt; }
                    #comprobante-imprimir-react p { margin: 2px 0; line-height: 1.2; }
                    #comprobante-imprimir-react hr { border-top: 1px dashed #000; margin: 5px 0; }
                    #comprobante-imprimir-react table { width: 100%; border-collapse: collapse; margin: 5px 0; font-size: 9pt; }
                    #comprobante-imprimir-react th, #comprobante-imprimir-react td { text-align: left; padding: 1px 0; }
                    #comprobante-imprimir-react th:nth-child(1), #comprobante-imprimir-react td:nth-child(1) { width: 50%; } /* Desc */
                    #comprobante-imprimir-react th:nth-child(2), #comprobante-imprimir-react td:nth-child(2) { width: 15%; text-align: right; padding-right: 3px;} /* Qty */
                    #comprobante-imprimir-react th:nth-child(3), #comprobante-imprimir-react td:nth-child(3) { width: 15%; text-align: right; padding-right: 3px;} /* Price */
                    #comprobante-imprimir-react th:nth-child(4), #comprobante-imprimir-react td:nth-child(4) { width: 20%; text-align: right; } /* Subtotal */
                    #comprobante-imprimir-react .total-final { text-align: right; font-weight: bold; font-size: 11pt; margin-top: 5px; }
                    #comprobante-imprimir-react .pie-pagina { text-align: center; margin-top: 10px; font-size: 8pt; }
                }
                `}
            </style>
            {/* Contenido del Comprobante */}
            <h4>{datosNegocio.nombre}</h4>
            <p>{datosNegocio.direccion}</p>
            <p>CUIT: {datosNegocio.cuit}</p>
            <hr />
            <p>Fecha: {venta.fecha} {venta.hora}</p>
            <p>Comprobante Venta #{venta.id}</p>
            <p>Cliente: {clienteData.nombre}</p>
            {clienteData.cuit && <p>CUIT/CUIL: {clienteData.cuit}</p>}
            <hr />
            <table>
                <thead>
                    <tr><th>Producto</th><th>Cant.</th><th>P.Unit</th><th>Subt.</th></tr>
                </thead>
                <tbody>
                    {venta.items.map((item, index) => (
                        <tr key={index}>
                            <td>{item.nombre}</td>
                            <td style={{ textAlign: 'right' }}>{item.cantidad}</td>
                            <td style={{ textAlign: 'right' }}>${formatCurrency(item.precio)}</td>
                            <td style={{ textAlign: 'right' }}>${formatCurrency(item.precio * item.cantidad)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <hr />
            <p className="total-final">TOTAL: ${formatCurrency(venta.total)}</p>
            <p>Medio de Pago: {venta.metodoPago}</p>
            <p>Tipo Factura: {venta.tipoFactura}</p>
            <hr />
            <p className="pie-pagina">¡Gracias por su compra!</p>
            <p className="pie-pagina">Documento no válido como factura.</p>
        </div>
    );
});

PrintReceipt.displayName = 'PrintReceipt'; // Nombre para DevTools

export default PrintReceipt;

