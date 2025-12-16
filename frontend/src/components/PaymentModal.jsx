// src/components/PaymentModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { formatCurrency } from '../utils/helpers';
import PaymentMethodSelect from './PaymentMethodSelect';
import ReceiptTypeSelect from './ReceiptTypeSelect';

function PaymentModal({
  isOpen,
  onClose,
  total,
  cliente,
  onConfirm,
  mostrarMensaje,
}) {
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
    if (
      metodoPagoActual === 'efectivo' &&
      recibido > 0 &&
      recibido >= montoAPagar
    ) {
      return recibido - montoAPagar;
    }
    return 0;
  }, [pagaCon, montoActual, metodoPagoActual]);

  // --- FUNCIÓN PARA AGREGAR PAGOS ---
  const handleAgregarPago = () => {
    const monto = parseFloat(montoActual);
    if (isNaN(monto) || monto <= 0) {
      mostrarMensaje('Por favor, ingrese un monto válido.', 'warning');
      return;
    }
    if (monto > montoRestante + 0.001) {
      // Pequeño margen de error para decimales
      mostrarMensaje(
        `El monto no puede ser mayor que lo que falta pagar ($${formatCurrency(montoRestante)}).`,
        'warning',
      );
      return;
    }

    const nuevoPago = { metodo: metodoPagoActual, monto: monto };
    setPagos((prev) => [...prev, nuevoPago]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-zinc-800 p-5 shadow-xl sm:p-6">
        <h3 className="mb-4 text-xl font-semibold text-zinc-100">
          Registrar Pago
        </h3>

        {/* SECCIÓN DE TOTALES */}
        <div className="mb-4 rounded-lg bg-zinc-900 p-3 text-center">
          <p className="text-sm text-zinc-400">Total a Pagar</p>
          <p className="text-3xl font-bold text-white">
            ${formatCurrency(total)}
          </p>
          {montoRestante > 0 && montoRestante !== total && (
            <p className="text-lg font-semibold text-yellow-400">
              Faltan: ${formatCurrency(montoRestante)}
            </p>
          )}
          {montoRestante < 0 && (
            <p className="text-lg font-semibold text-green-400">
              Vuelto Total: ${formatCurrency(Math.abs(montoRestante))}
            </p>
          )}
        </div>

        {/* LISTA DE PAGOS AGREGADOS */}
        <div className="mb-4 max-h-24 space-y-2 overflow-y-auto pr-2">
          {pagos.map((pago, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-md bg-zinc-700 p-2 text-sm"
            >
              <span className="capitalize text-zinc-300">
                {pago.metodo.replace('_', ' ')}
              </span>
              <span className="font-semibold text-white">
                ${formatCurrency(pago.monto)}
              </span>
            </div>
          ))}
        </div>

        {/* FORMULARIO PARA AGREGAR NUEVO PAGO */}
        {montoRestante > 0 && (
          <div className="space-y-3 border-t border-zinc-700 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">
                  Método de Pago
                </label>
                <PaymentMethodSelect
                  value={metodoPagoActual}
                  onChange={setMetodoPagoActual}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">
                  Tipo de Comprobante
                </label>
                <ReceiptTypeSelect
                  value={tipoFactura}
                  onChange={setTipoFactura}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">
                  Monto
                </label>
                <div className="flex">
                  <input
                    type="number"
                    value={montoActual}
                    onChange={(e) => setMontoActual(e.target.value)}
                    placeholder={formatCurrency(montoRestante)}
                    className="w-full rounded-l-md border border-zinc-600 bg-zinc-700 p-2"
                  />
                  <button
                    onClick={() => setMontoActual(montoRestante.toFixed(2))}
                    className="rounded-r-md bg-zinc-600 px-2 text-xs hover:bg-zinc-500"
                  >
                    Restante
                  </button>
                </div>
              </div>
            </div>

            {/* CALCULADORA DE VUELTO (solo para efectivo) */}
            {metodoPagoActual === 'efectivo' && (
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">
                  Paga con (Opcional):
                </label>
                <input
                  type="number"
                  value={pagaCon}
                  onChange={(e) => setPagaCon(e.target.value)}
                  placeholder="Ej: 1000"
                  className="w-full rounded-md border border-zinc-600 bg-zinc-700 p-2"
                />
                {vuelto > 0 && (
                  <p className="text-md mt-2 text-center font-bold text-green-400">
                    Vuelto: ${formatCurrency(vuelto)}
                  </p>
                )}
              </div>
            )}

            <button
              onClick={handleAgregarPago}
              className="w-full rounded-md bg-blue-600 py-2 font-bold text-white hover:bg-blue-700"
            >
              Agregar Pago
            </button>
          </div>
        )}

        {/* BOTONES FINALES */}
        <div className="mt-6 flex justify-end gap-3 border-t border-zinc-700 pt-4">
          <button
            onClick={onClose}
            className="rounded-md bg-zinc-600 px-4 py-2 hover:bg-zinc-500"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={montoRestante > 0}
            className="rounded-md bg-green-600 px-4 py-2 font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-zinc-500"
          >
            Confirmar Venta
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaymentModal;
