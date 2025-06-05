// src/components/PaymentModal.jsx
import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/helpers'; // Importar helper directamente

function PaymentModal({ isOpen, onClose, total, cliente, onConfirm }) { // formatCurrency ya no es prop directa
    const [metodoPago, setMetodoPago] = useState('efectivo');
    const [tipoFactura, setTipoFactura] = useState('B');

    useEffect(() => {
        if (cliente && cliente.cuit && cliente.cuit.length > 5) { // Asumimos una validación simple de CUIT
            setTipoFactura('A');
        } else {
            setTipoFactura('B');
        }
    }, [cliente]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm(metodoPago, tipoFactura);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-zinc-800 rounded-lg shadow-xl p-5 sm:p-6 w-full max-w-md">
                <h3 className="text-xl font-semibold mb-4 text-zinc-100">Confirmar Pago</h3>
                <p className="mb-3 text-zinc-300">Total a pagar: <span className="font-bold text-zinc-100">${formatCurrency(total)}</span></p>
                <p className="mb-4 text-zinc-300">Cliente: <span className="font-bold text-zinc-100">{cliente ? cliente.nombre : 'Consumidor Final'}</span></p>
                <div className="mb-4">
                    <label htmlFor="metodo-pago-modal" className="block text-sm font-medium text-zinc-300 mb-1">Método de Pago:</label>
                    <select id="metodo-pago-modal" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className="w-full p-2 border border-zinc-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-zinc-700 text-zinc-100">
                        <option value="efectivo">Efectivo</option>
                        <option value="tarjeta">Tarjeta Débito/Crédito</option>
                        <option value="qr_banco">QR Banco (Simulado)</option>
                        <option value="qr_billetera">QR Billetera Virtual (Simulado)</option>
                        <option value="transferencia">Transferencia (Simulado)</option>
                    </select>
                </div>
                <div className="mb-5">
                    <label htmlFor="tipo-factura-modal" className="block text-sm font-medium text-zinc-300 mb-1">Emitir Factura (Simulado):</label>
                    <select id="tipo-factura-modal" value={tipoFactura} onChange={(e) => setTipoFactura(e.target.value)} className="w-full p-2 border border-zinc-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-zinc-700 text-zinc-100">
                        <option value="B">Factura B (Consumidor Final)</option>
                        <option value="A">Factura A (Responsable Inscripto)</option>
                        <option value="ninguna">No emitir / Ticket</option>
                    </select>
                </div>
                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                    <button onClick={onClose} className="w-full sm:w-auto bg-zinc-600 hover:bg-zinc-500 text-zinc-200 font-bold py-2 px-4 rounded-md transition duration-150 ease-in-out order-2 sm:order-1">
                        Cancelar
                    </button>
                    <button onClick={handleConfirm} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition duration-150 ease-in-out order-1 sm:order-2">
                        Confirmar Venta
                    </button>
                </div>
            </div>
        </div>
    );
}
export default PaymentModal;