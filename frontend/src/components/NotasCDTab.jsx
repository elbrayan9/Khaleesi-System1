import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  PlusCircle,
  Trash2,
  ShoppingBag,
  XCircle,
  Eye,
  Printer,
  FileDiff,
} from 'lucide-react';
import SearchBar from './SearchBar.jsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAppContext } from '../context/AppContext.jsx';
import { formatCurrency } from '../utils/helpers.js';

function NotasCDTab({ onViewDetailsNotaCD, onPrintNotaCD }) {
  const {
    notasCD,
    handleCrearNotaManual,
    handleEliminarNotaCD,
    clientes,
    productos,
    mostrarMensaje,
    sucursalActual, // Necesario para config AFIP
    datosNegocio, // Necesario para config AFIP
  } = useAppContext();

  const [tipoNota, setTipoNota] = useState('credito');
  const [ventaRelacionadaId, setVentaRelacionadaId] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [clienteNombreManual, setClienteNombreManual] = useState('');
  const [motivo, setMotivo] = useState('');
  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [implicaDevolucion, setImplicaDevolucion] = useState(false);
  const [itemsDevueltos, setItemsDevueltos] = useState([]);
  const [productoSeleccionadoParaDev, setProductoSeleccionadoParaDev] =
    useState(null);
  const [cantidadDevolucion, setCantidadDevolucion] = useState(1);

  // Estado de carga y configuración AFIP
  const [isProcessing, setIsProcessing] = useState(false);
  const [generarEnAfip, setGenerarEnAfip] = useState(false);

  const productoDevRef = useRef(null);
  const clienteRef = useRef(null);

  useEffect(() => {
    if (!implicaDevolucion || tipoNota === 'debito') {
      setItemsDevueltos([]);
      if (tipoNota === 'debito') setImplicaDevolucion(false);
    }
  }, [implicaDevolucion, tipoNota]);

  const isValidFirestoreIdForSelection = (id) =>
    id && typeof id === 'string' && !id.startsWith('local_');
  const productosValidosParaDevolucion = productos.filter((p) =>
    isValidFirestoreIdForSelection(p.id),
  );
  const clientesValidos = clientes.filter((c) =>
    isValidFirestoreIdForSelection(c.id),
  );

  const handleSelectProductoDev = (producto) => {
    setProductoSeleccionadoParaDev(producto);
  };
  const handleAgregarItemDevuelto = () => {
    if (
      !productoSeleccionadoParaDev ||
      !isValidFirestoreIdForSelection(productoSeleccionadoParaDev.id)
    ) {
      mostrarMensaje('Seleccione un producto válido.', 'warning');
      return;
    }
    const cant = parseInt(cantidadDevolucion, 10);
    if (isNaN(cant) || cant <= 0) {
      mostrarMensaje('Ingrese una cantidad válida.', 'warning');
      return;
    }
    const existenteIndex = itemsDevueltos.findIndex(
      (item) => item.id === productoSeleccionadoParaDev.id,
    );
    if (existenteIndex > -1) {
      const nuevosItems = [...itemsDevueltos];
      nuevosItems[existenteIndex].cantidad += cant;
      setItemsDevueltos(nuevosItems);
    } else {
      setItemsDevueltos((prev) => [
        ...prev,
        {
          id: productoSeleccionadoParaDev.id,
          nombre: productoSeleccionadoParaDev.nombre,
          cantidad: cant,
          precioOriginal: productoSeleccionadoParaDev.precio,
          isTracked: true,
        },
      ]);
    }
    setProductoSeleccionadoParaDev(null);
    setCantidadDevolucion(1);
    productoDevRef.current?.clearInput?.();
  };
  const handleQuitarItemDevuelto = (index) =>
    setItemsDevueltos((prev) => prev.filter((_, i) => i !== index));

  const handleLocalGenerarNotaClick = async () => {
    const montoNota = parseFloat(monto);

    if (!motivo.trim()) {
      mostrarMensaje('Ingrese un motivo.', 'warning');
      return;
    }
    if (isNaN(montoNota) || montoNota <= 0) {
      mostrarMensaje('Ingrese un monto válido.', 'warning');
      return;
    }
    if (
      implicaDevolucion &&
      tipoNota === 'credito' &&
      itemsDevueltos.length === 0
    ) {
      mostrarMensaje('Agregue productos a devolver.', 'warning');
      return;
    }

    setIsProcessing(true);

    try {
      let datosAfip = {};
      let cbteTipoAFIP = null;

      // 1. SI SE SELECCIONÓ GENERAR EN AFIP
      if (generarEnAfip) {
        mostrarMensaje('Contactando a AFIP...', 'info');

        // Determinar Punto de Venta
        const ptoVta =
          datosNegocio?.puntoVenta ||
          sucursalActual?.configuracion?.puntoVenta ||
          sucursalActual?.puntoVenta ||
          1;

        // Determinar Tipo de Comprobante
        // Lógica: Si el emisor es Monotributista -> C (11, 12, 13)
        // Si el emisor es RI -> A (1, 2, 3) o B (6, 7, 8)
        // Por ahora, asumimos Monotributo (C) como default seguro, o B si es RI a Consumidor Final.
        cbteTipoAFIP = 13; // Nota Crédito C
        if (tipoNota === 'debito') cbteTipoAFIP = 12; // Nota Débito C

        // Determinar Cliente (DocTipo y DocNro)
        let docTipo = 99; // Consumidor Final
        let docNro = 0; // Anónimo

        if (clienteSeleccionado && clienteSeleccionado.cuit) {
          const cleanCuit = String(clienteSeleccionado.cuit).replace(/\D/g, '');
          const miCuit = String(datosNegocio?.cuit || '').replace(/\D/g, '');
          if (cleanCuit === miCuit) {
            console.warn(
              'Aviso: Intentando facturar al mismo emisor. Cambiando a Consumidor Final.',
            );
            docTipo = 99;
            docNro = 0;
          } else {
            // Si es distinto, procesamos normal
            if (cleanCuit.length === 11) {
              docTipo = 80; // CUIT
              docNro = cleanCuit;
            } else if (cleanCuit.length >= 7) {
              docTipo = 96; // DNI
              docNro = cleanCuit;
            }
          }
        }

        // Importar función
        const { getFunctions, httpsCallable } =
          await import('firebase/functions');

        const functions = getFunctions();

        const createInvoice = httpsCallable(functions, 'createInvoice');

        const numeroVentaOriginal = ventaRelacionadaId
          ? String(ventaRelacionadaId).replace(/\D/g, '')
          : '0';

        // Llamar a AFIP

        const resultAfip = await createInvoice({
          sucursalId: sucursalActual?.id,

          ptoVta: ptoVta,

          cbteTipo: cbteTipoAFIP,

          concepto: 1, // Productos

          docTipo: docTipo,

          docNro: docNro,

          importeTotal: montoNota,

          importeNeto: montoNota, // En C es igual al total

          importeIva: 0,

          importeExento: 0,

          cbteAsocNro: parseInt(numeroVentaOriginal) || 0,
        });

        datosAfip = resultAfip.data;

        if (!datosAfip.success) {
          throw new Error('AFIP no autorizó el comprobante.');
        }

        mostrarMensaje(
          `¡${tipoNota === 'credito' ? 'Nota de Crédito' : 'Nota de Débito'} Autorizada! CAE: ${datosAfip.cae}`,
          'success',
        );
      } else {
        // Generación Local (Interna)
        mostrarMensaje('Generando nota interna...', 'info');
      }

      // 2. GUARDAR EN BASE DE DATOS LOCAL
      const notaDataParaApp = {
        tipo: tipoNota,
        ventaRelacionadaId: ventaRelacionadaId.trim() || null,
        cliente:
          clienteSeleccionado || clienteNombreManual || 'Consumidor Final',
        motivo: motivo.trim(),
        monto: montoNota,
        metodoPago,
        implicaDevolucion: implicaDevolucion,
        itemsDevueltos:
          implicaDevolucion && tipoNota === 'credito' ? itemsDevueltos : [],

        // --- DATOS FISCALES (Solo si se generó en AFIP) ---
        esAfip: generarEnAfip,
        cae: datosAfip?.cae || null,
        caeFchVto: datosAfip?.caeFchVto || null,
        ptoVta: datosAfip?.ptoVta || null,
        cbteTipo: datosAfip?.cbteTipo || cbteTipoAFIP || null,
        cbteNro: datosAfip?.cbteNro || null,
      };

      await handleCrearNotaManual(notaDataParaApp);

      // 3. LIMPIAR FORMULARIO
      setTipoNota('credito');
      setVentaRelacionadaId('');
      setClienteSeleccionado(null);
      setClienteNombreManual('');
      setMotivo('');
      setMonto('');
      setMetodoPago('Efectivo');
      setImplicaDevolucion(false);
      setItemsDevueltos([]);
      setProductoSeleccionadoParaDev(null);
      setCantidadDevolucion(1);
      setGenerarEnAfip(false); // Resetear checkbox
      if (productoDevRef.current) productoDevRef.current.clearInput();
      if (clienteRef.current) clienteRef.current.clearInput();
    } catch (error) {
      console.error('Error generando Nota:', error);
      mostrarMensaje(`Error: ${error.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const isActionDisabled = (nota) =>
    !nota.id || (typeof nota.id === 'string' && nota.id.startsWith('local_'));
  const thClasses =
    'px-3 py-2 text-left text-xs font-medium text-zinc-300 uppercase tracking-wider';
  const tdClasses = 'px-3 py-2 text-sm';

  return (
    <div id="notas_cd">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-white sm:text-2xl">
        <FileDiff className="h-8 w-8 text-pink-500" />
        Notas de Crédito / Débito
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        <div className="rounded-lg bg-zinc-800 p-4 shadow-md sm:p-5">
          <h3 className="mb-3 border-b border-zinc-700 pb-2 text-lg font-medium text-white sm:text-xl">
            Generar Nueva Nota (AFIP)
          </h3>
          <div className="space-y-3">
            {/* CHECKBOX AFIP */}
            <div className="mb-4 rounded-md border border-zinc-600 bg-zinc-700/50 p-3">
              <label className="flex cursor-pointer items-center text-sm font-medium text-white">
                <input
                  type="checkbox"
                  checked={generarEnAfip}
                  onChange={(e) => setGenerarEnAfip(e.target.checked)}
                  className="mr-2 h-5 w-5 rounded border-zinc-500 bg-zinc-700 text-blue-600 focus:ring-blue-500"
                />
                Generar Comprobante Oficial en AFIP (CAE)
              </label>
              {generarEnAfip && (
                <p className="ml-7 mt-1 text-xs text-yellow-400">
                  Se conectará con AFIP para autorizar la nota.
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="nota-tipo-form"
                className="mb-1 block text-sm font-medium text-zinc-300"
              >
                Tipo:
              </label>
              <select
                id="nota-tipo-form"
                value={tipoNota}
                onChange={(e) => setTipoNota(e.target.value)}
                className="w-full rounded-md border border-zinc-600 bg-zinc-700 p-2 text-zinc-100"
              >
                <option value="credito">Nota de Crédito</option>
                <option value="debito">Nota de Débito</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="nota-venta-rel-form"
                className="mb-1 block text-sm font-medium text-zinc-300"
              >
                Venta Relacionada (ID - Opc.):
              </label>
              <input
                type="text"
                id="nota-venta-rel-form"
                value={ventaRelacionadaId}
                onChange={(e) => setVentaRelacionadaId(e.target.value)}
                placeholder="ID Venta Original"
                className="w-full rounded-md border border-zinc-600 bg-zinc-700 p-2 text-zinc-100 placeholder-zinc-400"
              />
            </div>
            <div>
              <label
                htmlFor="nota-cliente-form"
                className="mb-1 block text-sm font-medium text-zinc-300"
              >
                Cliente (Opcional):
              </label>
              <SearchBar
                ref={clienteRef}
                items={clientes}
                placeholder="Buscar o dejar vacío para Consumidor Final"
                onSelect={setClienteSeleccionado}
                onTextChange={(text) => {
                  // Si el usuario escribe, limpiamos la selección anterior si no coincide
                  // Pero guardamos el texto como posible nombre de cliente manual
                  if (
                    clienteSeleccionado &&
                    clienteSeleccionado.nombre !== text
                  ) {
                    setClienteSeleccionado(null);
                  }
                  setClienteNombreManual(text);
                }}
                displayKey="nombre"
                filterKeys={['nombre', 'cuit']}
                inputId="nota-cliente-form"
              />{' '}
            </div>
            <div>
              <label
                htmlFor="nota-motivo-form"
                className="mb-1 block text-sm font-medium text-zinc-300"
              >
                Motivo:
              </label>
              <textarea
                id="nota-motivo-form"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows="2"
                placeholder="Ej: Devolución, ajuste..."
                className="w-full rounded-md border border-zinc-600 bg-zinc-700 p-2 text-zinc-100 placeholder-zinc-400"
                required
              ></textarea>
            </div>
            <div>
              <label
                htmlFor="nota-metodo-pago-form"
                className="mb-1 block text-sm font-medium text-zinc-300"
              >
                Método de Reembolso:
              </label>
              <select
                id="nota-metodo-pago-form"
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                className="w-full rounded-md border border-zinc-600 bg-zinc-700 p-2 text-zinc-100"
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Tarjeta">Tarjeta</option>
                <option value="Cuenta Corriente">Cuenta Corriente</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="nota-monto-form"
                className="mb-1 block text-sm font-medium text-zinc-300"
              >
                Monto Total ($):
              </label>
              <input
                type="number"
                id="nota-monto-form"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                step="0.01"
                min="0.01"
                placeholder="Monto de la nota"
                className="w-full rounded-md border border-zinc-600 bg-zinc-700 p-2 text-zinc-100"
                required
              />
            </div>
            {tipoNota === 'credito' && (
              <div className="mt-3 border-t border-zinc-700 pt-3">
                <label className="flex cursor-pointer items-center text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={implicaDevolucion}
                    onChange={(e) => setImplicaDevolucion(e.target.checked)}
                    className="mr-2 h-4 w-4 rounded border-zinc-500 bg-zinc-700 text-blue-600 focus:ring-blue-500"
                  />
                  ¿Implica devolución de productos al stock?
                </label>
              </div>
            )}
            {implicaDevolucion && tipoNota === 'credito' && (
              <div className="mt-2 space-y-3 rounded-md border border-zinc-600 bg-zinc-700/30 p-3">
                <h4 className="text-md mb-1 font-medium text-zinc-100">
                  Productos Devueltos
                </h4>
                <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="producto-devolucion-buscar"
                      className="mb-1 block text-xs font-medium text-zinc-400"
                    >
                      Buscar Producto:
                    </label>
                    <SearchBar
                      ref={productoDevRef}
                      items={productosValidosParaDevolucion}
                      placeholder="Buscar producto a devolver..."
                      onSelect={handleSelectProductoDev}
                      displayKey="nombre"
                      filterKeys={['nombre', 'codigoBarras']}
                      inputId="producto-devolucion-buscar"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="cantidad-devolucion"
                      className="mb-1 block text-xs font-medium text-zinc-400"
                    >
                      Cantidad:
                    </label>
                    <input
                      type="number"
                      id="cantidad-devolucion"
                      value={cantidadDevolucion}
                      onChange={(e) => setCantidadDevolucion(e.target.value)}
                      min="1"
                      className="w-full rounded-md border border-zinc-600 bg-zinc-700 p-2 text-zinc-100"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAgregarItemDevuelto}
                  disabled={
                    !productoSeleccionadoParaDev ||
                    !cantidadDevolucion ||
                    Number(cantidadDevolucion) <= 0
                  }
                  className={`w-full rounded-md px-3 py-1.5 text-sm font-medium transition ${!productoSeleccionadoParaDev || !cantidadDevolucion || Number(cantidadDevolucion) <= 0 ? 'cursor-not-allowed bg-zinc-500 text-zinc-400' : 'bg-sky-600 text-white hover:bg-sky-700'} inline-flex items-center justify-center`}
                >
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  Agregar Producto a Devolución
                </button>
                {itemsDevueltos.length > 0 && (
                  <div className="mt-2 max-h-32 space-y-1 overflow-y-auto pr-1">
                    <p className="mb-1 text-xs text-zinc-400">
                      Ítems a devolver:
                    </p>
                    {itemsDevueltos.map((item, index) => (
                      <div
                        key={`${item.id}-${index}`}
                        className="flex items-center justify-between rounded bg-zinc-700/70 p-1.5 text-xs"
                      >
                        <span className="text-zinc-200">
                          {item.nombre} (x{item.cantidad})
                        </span>
                        <button
                          onClick={() => handleQuitarItemDevuelto(index)}
                          className="p-0.5 text-red-400 hover:text-red-300"
                          title="Quitar"
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="mt-4 text-right">
              <motion.button
                onClick={handleLocalGenerarNotaClick}
                disabled={isProcessing}
                className={`inline-flex w-full items-center justify-center rounded-md px-3 py-2 font-bold text-white sm:w-auto ${isProcessing ? 'cursor-not-allowed bg-gray-600' : 'bg-purple-600 hover:bg-purple-700'}`}
                whileHover={!isProcessing ? { scale: 1.03 } : {}}
                whileTap={!isProcessing ? { scale: 0.97 } : {}}
              >
                {isProcessing ? (
                  <span>Generando en AFIP...</span>
                ) : (
                  <>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Generar Nota
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg bg-zinc-800 p-4 shadow-md sm:p-5">
          <h3 className="mb-3 border-b border-zinc-700 pb-2 text-lg font-medium text-white sm:text-xl">
            Notas Generadas
          </h3>
          {notasCD.length === 0 ? (
            <p className="py-6 text-center text-sm italic text-zinc-400">
              No hay notas generadas.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b-zinc-700 hover:bg-transparent">
                  <TableHead className={thClasses}>N° Comp</TableHead>
                  <TableHead className={thClasses}>Tipo</TableHead>
                  <TableHead className={thClasses}>Fecha</TableHead>
                  <TableHead className={thClasses}>Cliente</TableHead>
                  <TableHead className={`${thClasses} text-right`}>
                    Monto
                  </TableHead>
                  <TableHead className={`${thClasses} text-center`}>
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notasCD
                  .slice()
                  .sort(
                    (a, b) =>
                      new Date(b.timestamp || 0) - new Date(a.timestamp || 0),
                  )
                  .map((n) => (
                    <TableRow
                      key={n.id || `nota_fb_${Date.now()}${Math.random()}`}
                      className="border-b-zinc-700 hover:bg-zinc-700/30"
                    >
                      <TableCell className={`${tdClasses} text-zinc-200`}>
                        {n.cbteNro ? `#${n.cbteNro}` : 'Pendiente'}
                        {n.cae && (
                          <span className="ml-2 rounded border border-green-400 px-1 text-[10px] text-green-400">
                            CAE
                          </span>
                        )}
                      </TableCell>
                      <TableCell
                        className={`${tdClasses} font-medium ${n.tipo === 'credito' ? 'text-red-400' : 'text-green-400'}`}
                      >
                        {n.tipo === 'credito' ? 'Crédito' : 'Débito'}
                      </TableCell>
                      <TableCell className={`${tdClasses} text-zinc-400`}>
                        {n.fecha} {n.hora}
                      </TableCell>
                      <TableCell className={`${tdClasses} text-zinc-200`}>
                        {n.clienteNombre}
                      </TableCell>
                      <TableCell
                        className={`${tdClasses} text-right font-semibold ${n.tipo === 'credito' ? 'monto-negativo' : 'monto-positivo'}`}
                      >
                        ${formatCurrency(n.monto)}
                      </TableCell>
                      <TableCell
                        className={`${tdClasses} whitespace-nowrap text-center`}
                      >
                        {typeof onViewDetailsNotaCD === 'function' && (
                          <motion.button
                            onClick={() => onViewDetailsNotaCD(n.id)}
                            className="mr-2 rounded p-1 text-purple-400 hover:text-purple-300"
                            title="Ver Detalle"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            disabled={isActionDisabled(n)}
                          >
                            <Eye className="inline-block h-4 w-4" />
                          </motion.button>
                        )}
                        {typeof onPrintNotaCD === 'function' && (
                          <motion.button
                            onClick={() => onPrintNotaCD(n.id)}
                            className="mr-2 rounded p-1 text-blue-400 hover:text-blue-300"
                            title="Imprimir Nota"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            disabled={isActionDisabled(n)}
                          >
                            <Printer className="inline-block h-4 w-4" />
                          </motion.button>
                        )}
                        <motion.button
                          onClick={() => handleEliminarNotaCD(n.id)}
                          className="rounded p-1 text-red-500 hover:text-red-400"
                          title="Eliminar Nota"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          disabled={isActionDisabled(n)}
                        >
                          <Trash2 className="inline-block h-4 w-4" />
                        </motion.button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
export default NotasCDTab;
