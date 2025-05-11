// src/components/PrintNota.jsx
import React from 'react';

// Placeholder - DEBES DESARROLLAR ESTE COMPONENTE
const PrintNota = React.forwardRef(({ nota, datosNegocio, formatCurrency, clienteInfo }, ref) => {
    if (!nota) return null;

    const clienteNombre = clienteInfo ? clienteInfo.nombre : nota.clienteNombre || 'Consumidor Final';
    const clienteCuit = clienteInfo ? clienteInfo.cuit : '';


    // Estilos similares a PrintReceipt.jsx, pero adaptados para una nota
    const printStyles = `
        @media print {
            body * { visibility: hidden; }
            #nota-imprimir-react, #nota-imprimir-react * { visibility: visible; }
            #nota-imprimir-react {
                position: absolute; left: 0; top: 0; width: 90mm; /* Ajustar para impresora térmica */
                margin: 0 auto; font-family: 'Courier New', Courier, monospace;
                font-size: 9pt; color: #000; padding: 5mm;
                background-color: white !important; -webkit-print-color-adjust: exact; color-adjust: exact;
            }
            #nota-imprimir-react h4 { text-align: center; font-weight: bold; margin-bottom: 5px; font-size: 11pt; }
            #nota-imprimir-react p { margin: 1mm 0; line-height: 1.2; }
            #nota-imprimir-react hr { border-top: 1px dashed #000; margin: 3mm 0; }
            #nota-imprimir-react table { width: 100%; border-collapse: collapse; margin: 3mm 0; font-size: 8pt; }
            #nota-imprimir-react th, #nota-imprimir-react td { text-align: left; padding: 0.5mm 0; }
            #nota-imprimir-react .text-right { text-align: right; }
            #nota-imprimir-react .total-final { text-align: right; font-weight: bold; font-size: 10pt; margin-top: 3mm; }
            #nota-imprimir-react .pie-pagina { text-align: center; margin-top: 5mm; font-size: 7pt; }
        }
    `;

    return (
        <div ref={ref} className="hidden print:block" id="nota-imprimir-react">
            <style>{printStyles}</style>
            <h4>{datosNegocio?.nombre || 'Nombre del Negocio'}</h4>
            <p>{datosNegocio?.direccion || 'Dirección'}</p>
            {datosNegocio?.cuit && <p>CUIT: {datosNegocio.cuit}</p>}
            <hr />
            <p><strong>NOTA DE {nota.tipo ? nota.tipo.toUpperCase() : ''}</strong></p>
            <p>Nro: {(nota.id || 'S/N').substring(0, 10)}...</p>
            <p>Fecha: {nota.fecha} {nota.hora}</p>
            <hr />
            <p>Cliente: {clienteNombre}</p>
            {clienteCuit && <p>CUIT/CUIL: {clienteCuit}</p>}
            {nota.ventaRelacionadaId && <p>Ref. Venta: {nota.ventaRelacionadaId}</p>}
            <hr />
            <p><strong>Motivo:</strong> {nota.motivo}</p>
            <br/>
            {nota.itemsDevueltos && nota.itemsDevueltos.length > 0 && (
                <div>
                    <p><strong>Productos Devueltos:</strong></p>
                    <table>
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th className="text-right">Cant.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {nota.itemsDevueltos.map((item, index) => (
                                <tr key={index}>
                                    <td>{item.nombre}</td>
                                    <td className="text-right">{item.cantidad}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <hr />
                </div>
            )}
            <p className="total-final">MONTO TOTAL: ${formatCurrency(nota.monto)}</p>
            <hr/>
            <p className="pie-pagina">Documento no válido como factura.</p>
        </div>
    );
});
PrintNota.displayName = "PrintNota";
export default PrintNota;
