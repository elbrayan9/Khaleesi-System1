// src/components/PaymentModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { formatCurrency } from '../utils/helpers';

function PaymentModal({ isOpen, onClose, total, cliente, onConfirm, mostrarMensaje }) {
    // --- ESTADOS PARA PAGOS DIVIDIDOS Y VUELTO ---
    const [pagos, setPagos] = useState([]); // Lista de pagos agregados
    
    // Estados para el formulario de "Agregar Pago"
    const [metodoPagoActual, setMetodoPagoActual] = useState('efectivo');
    const [montoActual, setMontoActual] = useState('');

    const [tipoFactura, setTipoFactura] = useState('B');

    // Estado específico para el cálculo de vuelto en efectivo
    const [pagaCon, setPagaCon] = useState(''); 

    useEffect(() => {
        // Resetea el modal cada vez que se abre
        if (isOpen) {
            setPagos([]);
            setMontoActual('');
            setMetodoPagoActual('efectivo');
            setPagaCon('');
            if (cliente && cliente.cuit && cliente.cuit.length > 5) {
                setTipoFactura('A');
            } else {
                setTipoFactura('B');
            }
        }
    }, [isOpen, cliente, total]);

    // --- LÓGICA DE CÁLCULO ---
    const montoRestante = useMemo(() => {
        const pagado = pagos.reduce((sum, p) => sum + p.monto, 0);
        return parseFloat((total - pagado).toFixed(2));
    }, [pagos, total]);

    const vuelto = useMemo(() => {
        const recibido = parseFloat(pagaCon) || 0;
        const montoAPagar = parseFloat(montoActual) || 0;
        if (metodoPagoActual === 'efectivo' && recibido > 0 && recibido >= montoAPagar) {
            return recibido - montoAPagar;
        }
        return 0;
    }, [pagaCon, montoActual, metodoPagoActual]);

    // --- FUNCIÓN PARA AGREGAR PAGOS ---
    const handleAgregarPago = () => {
        const monto = parseFloat(montoActual);
        if (isNaN(monto) || monto <= 0) {
            mostrarMensaje("Por favor, ingrese un monto válido.", "warning");
            return;
        }
        if (monto > montoRestante + 0.001) { // Pequeño margen de error para decimales
            mostrarMensaje(`El monto no puede ser mayor que lo que falta pagar ($${formatCurrency(montoRestante)}).`, "warning");
            return;
        }

        const nuevoPago = { metodo: metodoPagoActual, monto: monto };
        setPagos(prev => [...prev, nuevoPago]);
        
        // Limpiar campos
        setMontoActual('');
        setPagaCon('');
        setMetodoPagoActual('efectivo'); // Resetea al método por defecto
    };
    
    // Lógica para el botón de confirmar
    const handleConfirmar = () => {
        // Pasamos la lista de pagos y el tipo de factura al AppContext
        onConfirm(pagos, tipoFactura);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-zinc-800 rounded-lg shadow-xl p-5 sm:p-6 w-full max-w-lg">
                <h3 className="text-xl font-semibold mb-4 text-zinc-100">Registrar Pago</h3>

                {/* SECCIÓN DE TOTALES */}
                <div className="mb-4 p-3 bg-zinc-900 rounded-lg text-center">
                    <p className="text-sm text-zinc-400">Total a Pagar</p>
                    <p className="text-3xl font-bold text-white">${formatCurrency(total)}</p>
                    {montoRestante > 0 && montoRestante !== total && (
                         <p className="text-lg font-semibold text-yellow-400">Faltan: ${formatCurrency(montoRestante)}</p>
                    )}
                     {montoRestante < 0 && (
                         <p className="text-lg font-semibold text-green-400">Vuelto Total: ${formatCurrency(Math.abs(montoRestante))}</p>
                    )}
                </div>

                {/* LISTA DE PAGOS AGREGADOS */}
                <div className="space-y-2 mb-4 max-h-24 overflow-y-auto pr-2">
                    {pagos.map((pago, index) => (
                        <div key={index} className="flex justify-between items-center bg-zinc-700 p-2 rounded-md text-sm">
                            <span className="text-zinc-300 capitalize">{pago.metodo.replace('_', ' ')}</span>
                            <span className="font-semibold text-white">${formatCurrency(pago.monto)}</span>
                        </div>
                    ))}
                </div>

                {/* FORMULARIO PARA AGREGAR NUEVO PAGO */}
                {montoRestante > 0 && (
                    <div className="border-t border-zinc-700 pt-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-1">Método de Pago</label>
                                <select value={metodoPagoActual} onChange={(e) => setMetodoPagoActual(e.target.value)} className="w-full p-2 border border-zinc-600 rounded-md bg-zinc-700">
                                    <option value="efectivo">Efectivo</option>
                                    <option value="tarjeta">Tarjeta</option>
                                    <option value="transferencia">Transferencia</option>
                                    <option value="qr_banco">QR Banco</option>
                                    <option value="qr_billetera">QR Billetera</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-1">Monto</label>
                                <div className="flex">
                                    <input type="number" value={montoActual} onChange={(e) => setMontoActual(e.target.value)} placeholder={formatCurrency(montoRestante)} className="w-full p-2 border border-zinc-600 rounded-l-md bg-zinc-700" />
                                    <button onClick={() => setMontoActual(montoRestante.toFixed(2))} className="bg-zinc-600 hover:bg-zinc-500 text-xs px-2 rounded-r-md">Restante</button>
                                </div>
                            </div>
                        </div>
                        
                        {/* CALCULADORA DE VUELTO (solo para efectivo) */}
                        {metodoPagoActual === 'efectivo' && (
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-1">Paga con (Opcional):</label>
                                <input type="number" value={pagaCon} onChange={(e) => setPagaCon(e.target.value)} placeholder="Ej: 1000" className="w-full p-2 border border-zinc-600 rounded-md bg-zinc-700" />
                                {vuelto > 0 && (
                                    <p className="mt-2 text-md text-center text-green-400 font-bold">Vuelto: ${formatCurrency(vuelto)}</p>
                                )}
                            </div>
                        )}

                        <button onClick={handleAgregarPago} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-md">Agregar Pago</button>
                    </div>
                )}
                
                {/* BOTONES FINALES */}
                <div className="flex justify-end gap-3 mt-6 border-t border-zinc-700 pt-4">
                    <button onClick={onClose} className="bg-zinc-600 hover:bg-zinc-500 py-2 px-4 rounded-md">Cancelar</button>
                    <button onClick={handleConfirmar} disabled={montoRestante > 0} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md disabled:bg-zinc-500 disabled:cursor-not-allowed">
                        Confirmar Venta
                    </button>
                </div>
            </div>
        </div>
    );
}

export default PaymentModal;