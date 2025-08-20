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
            @page {
                size: 80mm auto; /* Forzamos el tamaño del papel a ser como el de un ticket */
                margin: 3mm;
            }
            body, html {
                background: white !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            body * {
                visibility: hidden;
            }
            #nota-imprimir-react, #nota-imprimir-react * {
                visibility: visible;
            }
            #nota-imprimir-react {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
            }
            /* Estilos visuales */
            #nota-imprimir-react {
                font-family: 'monospace', 'Courier New', Courier;
                font-size: 9.5pt;
                color: #000;
            }
            h4 { text-align: center; font-weight: bold; margin-bottom: 8px; font-size: 12pt; }
            p { margin: 2px 0; line-height: 1.3; }
            hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 8.5pt; }
            th, td { text-align: left; padding: 2px 1px; }
            .text-right { text-align: right; }
            .total-final { text-align: right; font-weight: bold; font-size: 10pt; margin-top: 5mm; }
            .pie-pagina { text-align: center; margin-top: 5mm; font-size: 7pt; }
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
