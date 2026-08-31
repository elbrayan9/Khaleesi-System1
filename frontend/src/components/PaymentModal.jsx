// src/components/PaymentModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { formatCurrency } from '../utils/helpers';
import PaymentMethodSelect from './PaymentMethodSelect';
import ReceiptTypeSelect from './ReceiptTypeSelect';
import CobroMercadoPagoModal from './CobroMercadoPagoModal';
import CobroPointModal from './CobroPointModal';
import CobroQrInteroperableModal from './CobroQrInteroperableModal';
import { useAppContext } from '../context/AppContext.jsx';
import useAtajosTeclado from '../hooks/useAtajosTeclado.js';
import TeclaAtajo from './ui/TeclaAtajo.jsx';
import { Check, Wallet, CreditCard } from 'lucide-react';

// Cache por sesión de los posnet detectados por sucursal (evita relistar en
// cada apertura del modal). undefined = no consultado todavía.
const posnetCachePorSucursal = {};

function PaymentModal({
  isOpen,
  onClose,
  total,
  cliente,
  onConfirm,
  mostrarMensaje,
  condicionEmisor,
}) {
  // --- ESTADOS PARA PAGOS DIVIDIDOS Y VUELTO ---
  const [pagos, setPagos] = useState([]); // Lista de pagos agregados

  // Estados para el formulario de "Agregar Pago"
  const [metodoPagoActual, setMetodoPagoActual] = useState('efectivo');
  const [montoActual, setMontoActual] = useState('');

  const [tipoFactura, setTipoFactura] = useState('B');

  // Estado específico para el cálculo de vuelto en efectivo
  const [pagaCon, setPagaCon] = useState('');
  // Vuelto acumulado que hay que devolver (se guarda en la venta / ticket).
  const [vueltoAcumulado, setVueltoAcumulado] = useState(0);
  // Propina (opcional): se suma a lo que paga el cliente, pero NO al total
  // facturado a AFIP. Va aparte en la venta y en el ticket.
  const [propina, setPropina] = useState(0);
  const [showMP, setShowMP] = useState(false); // modal de cobro Mercado Pago
  // Queda listo para cuando el QR interoperable vuelva: hoy nadie lo prende.
  const [showQr, setShowQr] = useState(false);
  const [showPoint, setShowPoint] = useState(false); // modal de cobro posnet
  const [posnetDevices, setPosnetDevices] = useState([]); // posnet detectados

  const { sucursalActual, canAccessAfip } = useAppContext();

  // Detección "dormida" de posnet Point: solo si la cuenta tiene uno vinculado
  // se mostrará el botón. Se cachea por sesión y sucursal.
  useEffect(() => {
    if (!isOpen) return undefined;
    const sucId = sucursalActual?.id || null;
    const key = sucId || '_';
    if (posnetCachePorSucursal[key] !== undefined) {
      setPosnetDevices(posnetCachePorSucursal[key]);
      return undefined;
    }
    let cancelado = false;
    (async () => {
      try {
        const { getFunctions, httpsCallable } =
          await import('firebase/functions');
        const functions = getFunctions();
        const listar = httpsCallable(functions, 'listarDispositivosPoint');
        const res = await listar({ sucursalId: sucId });
        const devs = res.data?.devices || [];
        posnetCachePorSucursal[key] = devs;
        if (!cancelado) setPosnetDevices(devs);
      } catch (_) {
        posnetCachePorSucursal[key] = [];
        if (!cancelado) setPosnetDevices([]);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [isOpen, sucursalActual]);

  useEffect(() => {
    // Resetea el modal cada vez que se abre
    if (isOpen) {
      setPagos([]);
      setMontoActual('');
      setMetodoPagoActual('efectivo');
      setPagaCon('');
      setVueltoAcumulado(0);
      setPropina(0);
      // Tipo de comprobante por defecto según la condición del EMISOR:
      // Monotributo/Exento -> C; Responsable Inscripto -> A (si el cliente tiene
      // CUIT) o B. Evita intentar Factura A con un emisor monotributista.
      const cond = (condicionEmisor || '').toLowerCase();
      if (!canAccessAfip) {
        // Plan Básico: sin factura electrónica, solo Ticket X.
        setTipoFactura('X');
      } else if (cond.includes('monotributo') || cond.includes('exento')) {
        setTipoFactura('C');
      } else if (cliente && cliente.cuit && cliente.cuit.length > 5) {
        setTipoFactura('A');
      } else {
        setTipoFactura('B');
      }
    }
  }, [isOpen, cliente, total, condicionEmisor, canAccessAfip]);

  // --- LÓGICA DE CÁLCULO ---
  // Total que efectivamente cobra el comercio = productos + propina.
  const totalACobrar = useMemo(
    () => parseFloat((total + (Number(propina) || 0)).toFixed(2)),
    [total, propina],
  );
  const montoRestante = useMemo(() => {
    const pagado = pagos.reduce((sum, p) => sum + p.monto, 0);
    return parseFloat((totalACobrar - pagado).toFixed(2));
  }, [pagos, totalACobrar]);

  // Preview del vuelto: si no se tipeó un monto, se asume que en efectivo
  // paga el saldo restante (caso más común: paga todo con un billete).
  const vuelto = useMemo(() => {
    if (metodoPagoActual !== 'efectivo') return 0;
    const recibido = parseFloat(pagaCon) || 0;
    if (recibido <= 0) return 0;
    const aplica = parseFloat(montoActual) || montoRestante;
    return recibido > aplica ? parseFloat((recibido - aplica).toFixed(2)) : 0;
  }, [pagaCon, montoActual, metodoPagoActual, montoRestante]);

  // --- FUNCIÓN PARA AGREGAR PAGOS ---
  const handleAgregarPago = () => {
    const esEfectivo = metodoPagoActual === 'efectivo';
    const recibido = parseFloat(pagaCon) || 0;

    // Monto a aplicar: lo tipeado; si es efectivo y solo se puso "paga con",
    // se aplica el saldo restante (caso común: paga todo con un billete).
    let monto = parseFloat(montoActual);
    if (isNaN(monto) && esEfectivo && recibido > 0) {
      monto = montoRestante;
    }
    if (isNaN(monto) || monto <= 0) {
      mostrarMensaje('Ingresá un monto o con cuánto paga.', 'warning');
      return;
    }
    monto = parseFloat(monto.toFixed(2));

    if (monto > montoRestante + 0.001) {
      mostrarMensaje(
        `El monto no puede ser mayor que lo que falta pagar ($${formatCurrency(montoRestante)}).`,
        'warning',
      );
      return;
    }

    // Vuelto de este pago: solo en efectivo, si recibió más de lo aplicado.
    const vueltoTender = esEfectivo && recibido > monto ? recibido - monto : 0;

    setPagos((prev) => [...prev, { metodo: metodoPagoActual, monto }]);
    setVueltoAcumulado((prev) => parseFloat((prev + vueltoTender).toFixed(2)));

    // Limpiar campos
    setMontoActual('');
    setPagaCon('');
    setMetodoPagoActual('efectivo'); // Resetea al método por defecto
  };

  // Poner en el monto lo que falta cubrir. Es el gesto más repetido del
  // mostrador —el cliente paga todo junto— y por eso tiene botón y tecla.
  const ponerRestante = () => setMontoActual(montoRestante.toFixed(2));

  // Hay algo cobrado pero todavía no alcanza. Es lo único que justifica mostrar
  // un segundo importe al lado del total.
  const hayPagoParcial = montoRestante > 0 && montoRestante !== totalACobrar;

  // Mercado Pago confirmó el pago: agregamos el pago por el saldo restante.
  const handleMpPagado = () => {
    setPagos((prev) => [
      ...prev,
      { metodo: 'mercado_pago', monto: montoRestante },
    ]);
    setShowMP(false);
  };

  // El posnet confirmó el pago: mismo tratamiento que un cobro Mercado Pago.
  const handlePointPagado = () => {
    setPagos((prev) => [
      ...prev,
      { metodo: 'mercado_pago', monto: montoRestante },
    ]);
    setShowPoint(false);
  };

  // El QR interoperable confirmó el pago.
  const handleQrPagado = () => {
    setPagos((prev) => [
      ...prev,
      { metodo: 'mercado_pago', monto: montoRestante },
    ]);
    setShowQr(false);
  };

  // Lógica para el botón de confirmar
  const handleConfirmar = () => {
    // Pasamos pagos, tipo de factura, vuelto y propina al AppContext.
    onConfirm(pagos, tipoFactura, vueltoAcumulado, Number(propina) || 0);
  };

  // Al abrir, el foco arranca en el selector de método: es el primer campo que
  // toca el cajero. El timeout deja que el modal termine de montarse.
  useEffect(() => {
    if (!isOpen) return undefined;
    const t = setTimeout(() => {
      document.querySelector('[aria-label^="Método de pago"]')?.focus();
    }, 60);
    return () => clearTimeout(t);
  }, [isOpen]);

  // Cerrar con Escape y confirmar con F2, para terminar la venta sin soltar el
  // teclado. F2 es la misma tecla que abrió este modal: se aprieta dos veces y
  // la venta queda cerrada. F7 pone lo que falta y F8 agrega el pago.
  //
  // Enter NO confirma la venta, a propósito: acá se tipean montos, y rematar
  // una venta por un Enter de más sería peor que ahorrar un clic. Dentro de los
  // campos de plata sí agrega el pago, que es lo que uno espera al terminar de
  // escribir un número —y si se equivocó, el pago se puede quitar.
  //
  // Cada atajo repite el mismo freno que su botón: si el botón no deja hacer
  // algo, la tecla tampoco. Si no, el teclado sería un atajo para saltarse las
  // validaciones.
  useAtajosTeclado(
    {
      Escape: onClose,
      F2: () => {
        if (montoRestante <= 0) handleConfirmar();
      },
      F7: () => {
        if (montoRestante > 0) ponerRestante();
      },
      F8: () => {
        if (montoRestante > 0) handleAgregarPago();
      },
    },
    isOpen && !showMP && !showPoint && !showQr,
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
      {/* Tres zonas: el total arriba y los botones abajo quedan fijos, y
          scrollea solo el medio.

          Antes el panel no tenía tope de alto ni overflow. Como el fondo centra
          con `items-center`, en una notebook —donde el alto útil son unos
          640 px— el contenido se desbordaba por arriba Y por abajo, y ninguno
          de los dos extremos se podía alcanzar: el botón de Confirmar Venta
          quedaba fuera de la pantalla y no había forma de cobrar.

          `dvh` y no `vh`: en el celular `vh` cuenta la barra del navegador y el
          modal termina siendo más alto que lo que se ve. */}
      <div className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-zinc-800 shadow-xl">
        {/* CABECERA FIJA: el título y el total. Es el número que se mira mil
            veces por día; no puede irse de pantalla al scrollear. */}
        <div className="shrink-0 px-5 pt-5 sm:px-6 sm:pt-6">
          <h3 className="mb-4 text-xl font-semibold text-zinc-100">
            Registrar Pago
          </h3>

          {/* SECCIÓN DE TOTALES
            El importe a un lado y el estado del cobro al otro. Antes iban los
            tres apilados y centrados, con tamaños parecidos: había que leer
            para saber si la venta ya estaba cubierta. Ahora se ve de un
            vistazo, que es lo que se mira mil veces por día. */}
          <div className="mb-4 rounded-xl bg-zinc-900 p-4 ring-1 ring-white/5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-500">
                  {Number(propina) > 0 ? 'Total a cobrar' : 'Total a pagar'}
                </p>
                <p className="text-4xl font-bold tabular-nums text-white">
                  ${formatCurrency(totalACobrar)}
                </p>
                {Number(propina) > 0 && (
                  <p className="mt-0.5 text-xs tabular-nums text-zinc-400">
                    ${formatCurrency(total)} + $
                    {formatCurrency(Number(propina))} de propina
                  </p>
                )}
              </div>

              {/* "Falta" solo cuando ya se cargó algún pago. Sin pagos, lo que
                falta ES el total, y repetir el mismo número al lado hace dudar
                de si son dos cosas distintas. */}
              <div className="text-right">
                {hayPagoParcial ? (
                  <>
                    <p className="text-xs uppercase tracking-wider text-amber-500/80">
                      Falta
                    </p>
                    <p className="text-2xl font-bold tabular-nums text-amber-400">
                      ${formatCurrency(montoRestante)}
                    </p>
                  </>
                ) : montoRestante > 0 ? null : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-semibold text-emerald-400 ring-1 ring-emerald-500/30">
                    <Check size={15} strokeWidth={3} />
                    Cubierto
                  </span>
                )}
                {vueltoAcumulado > 0 && (
                  <p className="mt-1 text-sm font-semibold tabular-nums text-emerald-400">
                    Vuelto ${formatCurrency(vueltoAcumulado)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CUERPO: lo único que scrollea.

            `min-h-0` no es decorativo: sin eso un hijo flex no se achica por
            debajo de su contenido, el alto máximo del panel no lo alcanza y el
            scroll nunca aparece —se ve igual de cortado que antes—. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 sm:px-6">
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
                    canAccessAfip={canAccessAfip}
                    value={tipoFactura}
                    onChange={setTipoFactura}
                    condicionEmisor={condicionEmisor}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-300">
                    Monto
                  </label>
                  <div className="flex">
                    <input
                      id="pago-monto"
                      type="number"
                      // El teclado del celular abre en números y con coma, que es
                      // como se escribe la plata.
                      inputMode="decimal"
                      value={montoActual}
                      onChange={(e) => setMontoActual(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAgregarPago();
                        }
                      }}
                      placeholder={formatCurrency(montoRestante)}
                      className="w-full rounded-l-md border border-zinc-600 bg-zinc-700 p-2 tabular-nums text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={ponerRestante}
                      title="Poner lo que falta (F7)"
                      className="flex shrink-0 cursor-pointer items-center gap-1 rounded-r-md bg-zinc-600 px-3 text-xs font-medium text-zinc-100 transition-colors hover:bg-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      Restante
                      <TeclaAtajo className="border-zinc-400">F7</TeclaAtajo>
                    </button>
                  </div>
                </div>
              </div>

              {/* CALCULADORA DE VUELTO (solo para efectivo) */}
              {metodoPagoActual === 'efectivo' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-300">
                    ¿Con cuánto paga? (para calcular el vuelto):
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={pagaCon}
                    onChange={(e) => setPagaCon(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAgregarPago();
                      }
                    }}
                    placeholder="Ej: 1000"
                    className="w-full rounded-md border border-zinc-600 bg-zinc-700 p-2 tabular-nums text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {/* Los billetes que existen en la calle. Se agrandaron para
                    que se acierten con el dedo en una pantalla táctil, que es
                    donde más se usan. */}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setPagaCon(montoRestante.toFixed(2))}
                      className="min-h-[38px] cursor-pointer rounded-md bg-zinc-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      Justo
                    </button>
                    {[1000, 2000, 5000, 10000, 20000].map((billete) => (
                      <button
                        key={billete}
                        type="button"
                        onClick={() => setPagaCon(String(billete))}
                        className="min-h-[38px] cursor-pointer rounded-md bg-zinc-600 px-3 text-xs font-semibold tabular-nums text-white transition-colors hover:bg-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        ${billete.toLocaleString('es-AR')}
                      </button>
                    ))}
                  </div>
                  {vuelto > 0 && (
                    <p className="text-md mt-2 text-center font-bold text-green-400">
                      Vuelto: ${formatCurrency(vuelto)}
                    </p>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handleAgregarPago}
                className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 font-bold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                Agregar Pago
                <TeclaAtajo className="border-blue-300/50">F8</TeclaAtajo>
              </button>
            </div>
          )}

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

          {/* PROPINA / REDONDEO */}
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/50 p-3">
            <span className="text-sm font-medium text-zinc-300">Propina:</span>
            <input
              type="number"
              value={propina || ''}
              onChange={(e) => setPropina(parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="w-24 rounded-md border border-zinc-600 bg-zinc-700 p-1.5 text-sm text-zinc-100"
            />
            <button
              type="button"
              onClick={() => setPropina(parseFloat((total * 0.1).toFixed(2)))}
              className="rounded-md bg-zinc-600 px-2 py-1 text-xs font-semibold text-white hover:bg-zinc-500"
            >
              10%
            </button>
            <button
              type="button"
              onClick={() =>
                setPropina(Math.max(0, Math.ceil(total / 100) * 100 - total))
              }
              className="rounded-md bg-zinc-600 px-2 py-1 text-xs font-semibold text-white hover:bg-zinc-500"
              title="Redondear el total al próximo múltiplo de $100"
            >
              Redondear
            </button>
            {Number(propina) > 0 && (
              <button
                type="button"
                onClick={() => setPropina(0)}
                className="rounded-md bg-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-600"
              >
                Quitar
              </button>
            )}
          </div>

          {/* COBROS DIGITALES
            Iban uno abajo del otro, ocupando tres bloques de alto en una
            pantalla donde el alto es lo que escasea. Van en fila: son
            hermanos, se eligen de un vistazo, y el modal deja de necesitar
            scroll en una notebook. */}
          {/* El QR interoperable —el de todas las billeteras— salió de acá: la
            API de Mercado Pago rechazaba la orden y el cajero se quedaba con un
            cartel de error delante del cliente. El código sigue en su lugar,
            listo para volver cuando funcione; lo que se sacó es la puerta de
            entrada. */}
          {montoRestante > 0 && (
            <div
              className={`mb-4 grid gap-2 ${
                posnetDevices.length > 0 ? 'sm:grid-cols-2' : 'grid-cols-1'
              }`}
            >
              <button
                type="button"
                onClick={() => setShowMP(true)}
                className="flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-lg border border-sky-600 bg-sky-600/10 px-3 py-2 text-sm font-semibold text-sky-400 transition-colors hover:bg-sky-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                <Wallet size={16} />
                Mercado Pago
              </button>

              {posnetDevices.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowPoint(true)}
                  className="flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-lg border border-indigo-500 bg-indigo-500/10 px-3 py-2 text-sm font-semibold text-indigo-300 transition-colors hover:bg-indigo-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <CreditCard size={16} />
                  Posnet
                </button>
              )}
            </div>
          )}
        </div>

        {/* PIE FIJO: Cancelar y Confirmar Venta.

            Es el final del camino y se aprieta con la cola esperando: no puede
            depender de que alguien scrollee hasta abajo para encontrarlo. */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-zinc-700 px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] cursor-pointer rounded-lg px-4 text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-zinc-500"
          >
            Cancelar
            <TeclaAtajo className="border-zinc-500">Esc</TeclaAtajo>
          </button>
          {/* El que cierra la venta pesa más que todo lo demás del modal: es el
              final del camino y se aprieta con la cola esperando. La tecla se
              muestra siempre, no solo cuando está habilitado, así se aprende
              aunque hoy falte cubrir el total. */}
          <button
            type="button"
            onClick={handleConfirmar}
            disabled={montoRestante > 0}
            title={
              montoRestante > 0
                ? `Todavía faltan $${formatCurrency(montoRestante)}`
                : 'Confirmar la venta (F2)'
            }
            className="flex min-h-[48px] cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-6 text-base font-bold text-white shadow-lg shadow-emerald-900/30 transition-colors hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-300 disabled:shadow-none"
          >
            Confirmar Venta
            <TeclaAtajo
              className={
                montoRestante > 0 ? 'border-zinc-500' : 'border-emerald-300/60'
              }
            >
              F2
            </TeclaAtajo>
          </button>
        </div>
      </div>

      {showMP && (
        <CobroMercadoPagoModal
          monto={montoRestante}
          descripcion={`Venta ${cliente?.nombre || ''}`.trim()}
          cliente={cliente}
          onClose={() => setShowMP(false)}
          onPagado={handleMpPagado}
        />
      )}

      {showPoint && (
        <CobroPointModal
          monto={montoRestante}
          descripcion={`Venta ${cliente?.nombre || ''}`.trim()}
          devices={posnetDevices}
          onClose={() => setShowPoint(false)}
          onPagado={handlePointPagado}
        />
      )}

      {showQr && (
        <CobroQrInteroperableModal
          monto={montoRestante}
          descripcion={`Venta ${cliente?.nombre || ''}`.trim()}
          onClose={() => setShowQr(false)}
          onPagado={handleQrPagado}
        />
      )}
    </div>
  );
}

export default PaymentModal;
