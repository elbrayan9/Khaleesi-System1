// src/screens/PedidosOnline.jsx
//
// Pedidos que entran desde la tienda online. Llegan en vivo (el listener de
// pedidos_online vive en AppContext) y se gestionan por estados:
// nuevo -> confirmado -> listo -> entregado. Al entregar se registra la venta.

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Swal from '../utils/swalTheme.js'; // Swal con el tema del sistema
import {
  ShoppingBag,
  Clock,
  Printer,
  Check,
  X,
  Phone,
  MapPin,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext.jsx';
import { formatCurrency, obtenerFechaHoraActual } from '../utils/helpers.js';
import { printVentaTicket } from '../services/thermalPrinterService';
import RepartidoresPanel from '../components/RepartidoresPanel.jsx';

const ESTADOS = {
  nuevo: { label: 'Nuevo', color: 'bg-amber-500/20 text-amber-300' },
  confirmado: { label: 'En preparación', color: 'bg-blue-500/20 text-blue-300' },
  listo: { label: 'Listo', color: 'bg-emerald-500/20 text-emerald-300' },
  en_camino: { label: 'En camino', color: 'bg-indigo-500/20 text-indigo-300' },
  entregado: { label: 'Entregado', color: 'bg-zinc-600/40 text-zinc-300' },
  rechazado: { label: 'Rechazado', color: 'bg-red-500/20 text-red-300' },
};

function PedidosOnline() {
  const {
    pedidosOnline = [],
    datosNegocio,
    mostrarMensaje,
    handleEntregarPedidoOnline,
  } = useAppContext();
  const [filtro, setFiltro] = useState('activos');
  const [ocupado, setOcupado] = useState(null);

  const lista = useMemo(() => {
    const activos = ['nuevo', 'confirmado', 'listo', 'en_camino'];
    return [...pedidosOnline]
      .filter((p) =>
        filtro === 'activos'
          ? activos.includes(p.estado)
          : !activos.includes(p.estado),
      )
      .sort((a, b) => (b.codigo || 0) - (a.codigo || 0));
  }, [pedidosOnline, filtro]);

  const cambiarEstado = async (pedido, estado, extra = {}) => {
    setOcupado(pedido.id);
    try {
      const { getFunctions, httpsCallable } = await import(
        'firebase/functions'
      );
      const fn = httpsCallable(getFunctions(), 'actualizarEstadoPedido');
      await fn({ pedidoId: pedido.id, estado, ...extra });
    } catch (e) {
      mostrarMensaje?.(e?.message || 'No se pudo actualizar.', 'error');
    } finally {
      setOcupado(null);
    }
  };

  // Arma un objeto con la forma que esperan los servicios de impresión.
  const imprimirTicket = async (pedido) => {
    const { fecha, hora } = obtenerFechaHoraActual();
    const venta = {
      id: `ONLINE-${pedido.codigo}`,
      fecha,
      hora,
      clienteNombre: pedido.cliente?.nombre || 'Pedido online',
      items: (pedido.items || []).map((it) => ({
        nombre: it.nombre,
        cantidad: it.cantidad,
        precioOriginal: it.precioUnitario,
        precioFinal: it.subtotal,
        descuentoPorcentaje: 0,
      })),
      total: pedido.total,
      pagos: [
        {
          metodo:
            pedido.metodoPago === 'qr_local' ? 'mercado_pago' : 'efectivo',
          monto: pedido.total,
        },
      ],
      tipoFactura: 'X',
    };
    const cliente = { nombre: pedido.cliente?.nombre || '', cuit: '' };
    try {
      if (localStorage.getItem('impresoraMetodo') === 'bluetooth') {
        const { imprimirTicketBluetooth } = await import(
          '../services/bluetoothPrinter'
        );
        await imprimirTicketBluetooth(
          venta,
          datosNegocio,
          cliente,
          formatCurrency,
        );
      } else {
        await printVentaTicket(venta, datosNegocio, cliente);
      }
    } catch (e) {
      mostrarMensaje?.(`No se pudo imprimir: ${e.message}`, 'warning');
    }
  };

  const confirmar = async (pedido) => {
    const { value: minutos } = await Swal.fire({
      title: `Pedido #${pedido.codigo}`,
      text: '¿En cuánto tiempo va a estar listo?',
      input: 'radio',
      inputOptions: {
        15: '15 minutos',
        20: '20 minutos',
        30: '30 minutos',
        45: '45 minutos',
      },
      inputValue: '20',
      showCancelButton: true,
      confirmButtonText: 'Confirmar pedido',
      cancelButtonText: 'Cancelar',
    });
    if (!minutos) return;

    await cambiarEstado(pedido, 'confirmado', {
      tiempoEstimado: Number(minutos),
    });

    const imprimir = await Swal.fire({
      title: '¿Imprimir el pedido?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Imprimir',
      cancelButtonText: 'No',
    });
    if (imprimir.isConfirmed) await imprimirTicket(pedido);
  };

  const entregar = async (pedido) => {
    const ok = await Swal.fire({
      title: `¿Entregar pedido #${pedido.codigo}?`,
      text: 'Se registra como venta y se descuenta el stock.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, entregar',
      cancelButtonText: 'Cancelar',
    });
    if (!ok.isConfirmed) return;
    setOcupado(pedido.id);
    await handleEntregarPedidoOnline(pedido);
    setOcupado(null);
  };

  const rechazar = async (pedido) => {
    const ok = await Swal.fire({
      title: `¿Rechazar pedido #${pedido.codigo}?`,
      text: 'El cliente va a ver que no se pudo tomar.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Volver',
    });
    if (ok.isConfirmed) await cambiarEstado(pedido, 'rechazado');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-white sm:text-2xl">
          <ShoppingBag className="h-7 w-7 text-emerald-400" />
          Pedidos online
        </h2>
        <div className="flex gap-2">
          {[
            ['activos', 'Activos'],
            ['historial', 'Historial'],
          ].map(([val, lbl]) => (
            <button
              key={val}
              type="button"
              onClick={() => setFiltro(val)}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                filtro === val
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {!datosNegocio?.tiendaActiva && (
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-zinc-200">
          Tu tienda online está desactivada. Activala en Configuración para
          recibir pedidos.
        </div>
      )}

      {lista.length === 0 ? (
        <p className="py-16 text-center text-sm italic text-zinc-500">
          {filtro === 'activos'
            ? 'No hay pedidos pendientes.'
            : 'Todavía no hay pedidos cerrados.'}
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {lista.map((p) => {
            const est = ESTADOS[p.estado] || ESTADOS.nuevo;
            const trabajando = ocupado === p.id;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-zinc-700 bg-zinc-800 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-lg font-bold text-white">
                      #{p.codigo}{' '}
                      <span className="text-sm font-normal text-zinc-400">
                        {p.tipo === 'delivery' ? 'Envío' : 'Retiro'}
                      </span>
                    </p>
                    <p className="text-sm text-zinc-300">{p.cliente?.nombre}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${est.color}`}
                  >
                    {est.label}
                  </span>
                </div>

                <div className="mt-2 space-y-0.5 text-xs text-zinc-400">
                  {p.cliente?.telefono && (
                    <p className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" />
                      <a
                        href={`https://wa.me/${
                          String(p.cliente.telefono).startsWith('54')
                            ? p.cliente.telefono
                            : `549${p.cliente.telefono}`
                        }`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-white"
                      >
                        {p.cliente.telefono}
                      </a>
                    </p>
                  )}
                  {p.tipo === 'delivery' && p.cliente?.direccion && (
                    <p className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {p.cliente.direccion}
                    </p>
                  )}
                  {p.repartidorNombre && (
                    <p className="flex items-center gap-1.5 text-indigo-300">
                      🛵 {p.repartidorNombre}
                    </p>
                  )}
                  {p.tiempoEstimado > 0 && (
                    <p className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {p.tiempoEstimado} min
                    </p>
                  )}
                </div>

                <div className="mt-3 space-y-1 border-t border-zinc-700 pt-2 text-sm">
                  {(p.items || []).map((it, i) => (
                    <div key={i} className="flex justify-between text-zinc-300">
                      <span className="truncate pr-2">
                        {it.cantidad}x {it.nombre}
                      </span>
                      <span>${formatCurrency(it.subtotal)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-zinc-700 pt-1.5 font-bold text-white">
                    <span>
                      Total{' '}
                      <span className="text-xs font-normal text-zinc-400">
                        ({p.metodoPago === 'qr_local' ? 'QR/tarjeta' : 'efectivo'})
                      </span>
                    </span>
                    <span>${formatCurrency(p.total)}</span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {p.estado === 'nuevo' && (
                    <>
                      <button
                        onClick={() => confirmar(p)}
                        disabled={trabajando}
                        className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-50"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => rechazar(p)}
                        disabled={trabajando}
                        className="rounded-md bg-zinc-600 px-3 py-2 text-sm font-bold text-white hover:bg-zinc-500 disabled:opacity-50"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  {p.estado === 'confirmado' && (
                    <button
                      onClick={() => cambiarEstado(p, 'listo')}
                      disabled={trabajando}
                      className="flex-1 rounded-md bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      Marcar listo
                    </button>
                  )}
                  {['listo', 'en_camino'].includes(p.estado) && (
                    <button
                      onClick={() => entregar(p)}
                      disabled={trabajando}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-green-600 px-3 py-2 text-sm font-bold text-white hover:bg-green-500 disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" /> Entregado
                    </button>
                  )}
                  {p.estado === 'entregado' && !p.ventaId && (
                    <button
                      onClick={() => entregar(p)}
                      disabled={trabajando}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-amber-600 px-3 py-2 text-sm font-bold text-white hover:bg-amber-500 disabled:opacity-50"
                      title="El repartidor lo entregó: confirmá el cobro para registrarlo"
                    >
                      <Check className="h-4 w-4" /> Registrar venta
                    </button>
                  )}
                  {['nuevo', 'confirmado', 'listo', 'en_camino'].includes(
                    p.estado,
                  ) && (
                    <button
                      onClick={() => imprimirTicket(p)}
                      className="rounded-md bg-zinc-700 px-3 py-2 text-sm font-bold text-zinc-100 hover:bg-zinc-600"
                      title="Imprimir"
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <RepartidoresPanel />
    </div>
  );
}

export default PedidosOnline;
