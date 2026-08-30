// src/components/CargarFacturaModal.jsx
//
// Sacás una foto a la factura/remito del proveedor y la IA (Gemini) extrae los
// productos. Revisás y aplicás: suma stock a los existentes o crea los nuevos.

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Upload } from 'lucide-react';
import { useAppContext } from '../context/AppContext.jsx';
import { formatCurrency } from '../utils/helpers.js';
import { resizeImage } from '../utils/image.js';
import {
  addProducto,
  addPedido,
  updateProducto,
  recibirPedidoYActualizarStock,
} from '../services/firestoreService';

function CargarFacturaModal({ onClose }) {
  const {
    productos = [],
    proveedores = [],
    currentUser,
    sucursalActual,
    mostrarMensaje,
  } = useAppContext();
  const [fase, setFase] = useState('subir'); // subir | procesando | revisar | aplicando
  const [items, setItems] = useState([]);
  const [cabecera, setCabecera] = useState(null); // proveedor, comprobante, fecha, total
  const [error, setError] = useState('');

  // El margen que el comercio ya aplica, sacado de sus propios productos: es
  // mejor referencia que un número inventado. Se usa la mediana para que dos o
  // tres productos con margen raro no arrastren la sugerencia.
  const margenHabitual = useMemo(() => {
    const margenes = productos
      .filter((p) => Number(p.costo) > 0 && Number(p.precio) > 0)
      .map((p) => Number(p.precio) / Number(p.costo))
      .filter((m) => m > 1 && m < 5)
      .sort((a, b) => a - b);
    if (!margenes.length) return 1.4; // 40%, un punto de partida razonable
    return margenes[Math.floor(margenes.length / 2)];
  }, [productos]);

  const sugerirPrecio = (costo) =>
    costo > 0 ? Math.round(costo * margenHabitual) : 0;

  // El proveedor de la factura, buscado entre los cargados. El CUIT manda
  // porque es exacto; el nombre puede estar escrito de mil formas.
  const proveedorDetectado = useMemo(() => {
    if (!cabecera) return null;
    const cuit = String(cabecera.cuit || '').replace(/\D/g, '');
    if (cuit) {
      const porCuit = proveedores.find(
        (p) => String(p.cuit || '').replace(/\D/g, '') === cuit,
      );
      if (porCuit) return porCuit;
    }
    const nombre = String(cabecera.nombre || '')
      .trim()
      .toLowerCase();
    if (!nombre) return null;
    return (
      proveedores.find((p) =>
        String(p.nombre || '')
          .trim()
          .toLowerCase()
          .includes(nombre),
      ) ||
      proveedores.find((p) =>
        nombre.includes(
          String(p.nombre || '')
            .trim()
            .toLowerCase(),
        ),
      ) ||
      null
    );
  }, [cabecera, proveedores]);

  const totalDetectado = Number(cabecera?.total) || 0;
  const sumaRenglones = items
    .filter((it) => it.incluir)
    .reduce(
      (s, it) => s + (Number(it.costo) || 0) * (Number(it.cantidad) || 0),
      0,
    );

  /** Convierte una planilla a texto plano para que la lea el modelo. */
  const planillaATexto = async (file) => {
    // xlsx ya estaba en el proyecto; entiende .xlsx, .xls y .csv por igual.
    const XLSX = await import('xlsx');
    // Con FileReader y no con file.arrayBuffer(): es el mismo camino que usa el
    // resto del componente, y anda también en los Safari viejos de iPhone, que
    // en un mostrador siguen existiendo.
    const buffer = await new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = rej;
      fr.readAsArrayBuffer(file);
    });
    const libro = XLSX.read(buffer, { type: 'array' });
    // Todas las hojas: el proveedor puede mandar el detalle en la segunda.
    return libro.SheetNames.map((nombre) => {
      const filas = XLSX.utils.sheet_to_csv(libro.Sheets[nombre]);
      return `--- Hoja: ${nombre} ---\n${filas}`;
    }).join('\n\n');
  };

  /** Lee un archivo como base64, sin el encabezado del data URL. */
  const aBase64 = (blobOArchivo) =>
    new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result).split(',')[1]);
      fr.onerror = rej;
      fr.readAsDataURL(blobOArchivo);
    });

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFase('procesando');
    setError('');
    try {
      // Los tres caminos que puede tomar una factura, según cómo llegó.
      //
      // La foto se achica antes de mandarla: una foto de celular moderno pesa
      // varios megas y no hace falta tanto para leer un renglón.
      //
      // El PDF va tal cual, sin tocar: es lo que el proveedor manda por mail y
      // suele estar mejor que cualquier foto, porque el texto ya es texto. No
      // se le puede aplicar resizeImage, que espera una imagen.
      //
      // La planilla no se manda como archivo: son celdas, no hay nada que
      // mirar. Se convierte a texto acá, en el navegador, y encima viaja
      // muchísimo más liviana.
      const esPdf = file.type === 'application/pdf';
      const esPlanilla =
        /\.(xlsx|xls|csv)$/i.test(file.name) ||
        file.type.includes('spreadsheet') ||
        file.type.includes('excel') ||
        file.type === 'text/csv';

      let payload;
      if (esPlanilla) {
        const texto = await planillaATexto(file);
        if (!texto.trim()) {
          setError('La planilla está vacía.');
          setFase('subir');
          return;
        }
        payload = { texto };
      } else if (esPdf) {
        payload = {
          imageBase64: await aBase64(file),
          mimeType: 'application/pdf',
        };
      } else {
        const blob = await resizeImage(file, 1500, 0.85);
        payload = { imageBase64: await aBase64(blob), mimeType: 'image/jpeg' };
      }

      const { getFunctions, httpsCallable } =
        await import('firebase/functions');
      const fn = httpsCallable(getFunctions(), 'leerFacturaProveedor');
      const res = await fn(payload);
      const data = (res.data?.items || []).map((it) => ({
        ...it,
        incluir: true,
        // Precio de venta sugerido con el margen que el comercio ya usa. Antes
        // el producto quedaba a precio de costo, sin ganancia, y había que
        // corregirlo uno por uno después.
        precio: sugerirPrecio(Number(it.costo) || 0),
      }));
      if (data.length === 0) {
        setError(
          'No se detectaron productos. Si es una foto, probá con una más nítida.',
        );
        setFase('subir');
        return;
      }
      setCabecera(res.data?.proveedor || null);
      setItems(data);
      setFase('revisar');
    } catch (err) {
      setError(err?.message || 'No se pudo leer la factura.');
      setFase('subir');
    }
  };

  const setItem = (i, campo, val) =>
    setItems((prev) =>
      prev.map((it, k) => (k === i ? { ...it, [campo]: val } : it)),
    );

  const aplicar = async () => {
    const incluidos = items.filter(
      (it) => it.incluir && it.nombre && Number(it.cantidad) > 0,
    );
    if (incluidos.length === 0) {
      mostrarMensaje?.('No hay items para aplicar.', 'warning');
      return;
    }
    setFase('aplicando');

    // El match busca primero por código de barras, que es exacto, y recién
    // después por nombre. Antes solo comparaba nombres en minúsculas, así que
    // "Coca Cola 2.25" y "Coca-Cola 2,25L" creaban dos productos distintos.
    const buscarExistente = (it) => {
      const cod = String(it.codigo || '').replace(/\D/g, '');
      if (cod) {
        const porCodigo = productos.find(
          (p) => String(p.codigoBarras || '').replace(/\D/g, '') === cod,
        );
        if (porCodigo) return porCodigo;
      }
      const nombre = it.nombre.trim().toLowerCase();
      return productos.find(
        (p) =>
          String(p.nombre || '')
            .trim()
            .toLowerCase() === nombre,
      );
    };

    // El orden importa, y antes estaba al revés.
    //
    // Se sumaba el stock leyendo el valor actual y escribiendo la suma desde el
    // navegador, y recién después se anotaba el pedido. Dos personas cargando
    // facturas al mismo tiempo en dos máquinas leían el mismo stock viejo y la
    // segunda pisaba a la primera: una factura entera desaparecía sin dejar
    // señal. Y si el registro del pedido fallaba, el stock ya estaba sumado sin
    // nada que lo explicara ni forma de revertirlo.
    //
    // Ahora: primero se resuelve qué producto es cada renglón, después se anota
    // el pedido, y el stock lo suma recibirPedidoYActualizarStock con
    // increment() en un solo lote. increment() lo resuelve el servidor sobre el
    // valor real del momento, así que dos cargas simultáneas se suman en vez de
    // pisarse, y el pedido queda escrito antes de que el stock se mueva.
    let ok = 0;
    const itemsDelPedido = [];

    for (const it of incluidos) {
      const existente = buscarExistente(it);
      const cantidad = Number(it.cantidad) || 0;
      const costo = Number(it.costo) || 0;
      try {
        let productoId;
        if (existente) {
          productoId = existente.id;
          // El código de barras se completa si el producto no lo tenía: es lo
          // que después permite escanearlo en la caja. Va aparte del stock
          // porque no es una suma: escribir el mismo código dos veces da el
          // mismo resultado.
          if (it.codigo && !existente.codigoBarras) {
            await updateProducto(existente.id, { codigoBarras: it.codigo });
          }
        } else {
          // Nace en cero: las unidades de esta factura las suma el lote de
          // abajo, como a cualquier otro producto. Si se creara ya con el
          // stock, el increment() posterior lo duplicaría.
          productoId = await addProducto(
            currentUser?.uid,
            {
              nombre: it.nombre,
              codigoBarras: it.codigo || null,
              costo,
              precio: Number(it.precio) || costo,
              stock: 0,
              categoria: it.categoria || null,
              vendidoPor: it.vendidoPor || 'unidad',
            },
            sucursalActual?.id,
          );
        }
        if (!productoId) continue;
        itemsDelPedido.push({
          productoId,
          nombre: existente ? existente.nombre : it.nombre,
          cantidad,
          costoUnitario: costo,
        });
        ok += 1;
      } catch (_) {
        /* seguimos con el resto */
      }
    }

    // La compra queda registrada como un pedido, y recién entonces se toca el
    // stock. Se anota aunque no se haya reconocido al proveedor: sin este
    // documento no hay de dónde salió ese stock ni cómo revertirlo, que es
    // justamente lo que se quiere evitar.
    if (itemsDelPedido.length) {
      const pedidoId = await addPedido(
        currentUser?.uid,
        {
          proveedorId: proveedorDetectado?.id || null,
          proveedorNombre:
            proveedorDetectado?.nombre ||
            cabecera?.proveedor?.nombre ||
            'Proveedor sin identificar',
          fechaPedido: new Date().toISOString().split('T')[0],
          // Nace pendiente: lo pasa a recibido el mismo lote que suma el stock,
          // así el estado y las unidades no pueden quedar contando cosas
          // distintas.
          estado: 'pendiente',
          items: itemsDelPedido,
          totalCosto: itemsDelPedido.reduce(
            (t, i) => t + i.cantidad * i.costoUnitario,
            0,
          ),
          notas: [
            'Cargado desde una foto de la factura.',
            cabecera?.comprobante ? `Comprobante ${cabecera.comprobante}` : '',
            cabecera?.fecha ? `Fecha ${cabecera.fecha}` : '',
          ]
            .filter(Boolean)
            .join(' · '),
        },
        sucursalActual?.id,
      );

      const sumado = await recibirPedidoYActualizarStock({
        id: pedidoId,
        items: itemsDelPedido,
      });
      if (!sumado) {
        // El pedido quedó pendiente, con todo lo que hay que recibir adentro.
        // Se puede recibir a mano desde Proveedores sin volver a sacarle la
        // foto a la factura.
        mostrarMensaje?.(
          'No se pudo sumar el stock. La compra quedó anotada como pedido pendiente en Proveedores: recibila desde ahí.',
          'error',
        );
        onClose?.();
        return;
      }
    }

    mostrarMensaje?.(
      `Listo: ${ok} producto(s) cargados/actualizados.`,
      'success',
    );
    onClose?.();
  };

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-zinc-800 shadow-xl"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <div className="flex items-center justify-between border-b border-zinc-700 px-5 py-3">
          <h3 className="text-lg font-semibold text-white">
            Cargar factura del proveedor
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

          {fase === 'subir' && (
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-zinc-600 p-8 text-center hover:border-blue-500">
              <Upload className="h-8 w-8 text-blue-400" />
              <span className="font-semibold text-white">
                Subí la factura del proveedor
              </span>
              <span className="text-xs text-zinc-400">
                Foto, PDF o planilla (Excel o CSV). La IA lee los productos y
                cantidades.
              </span>
              <input
                type="file"
                accept="image/*,application/pdf,.xlsx,.xls,.csv"
                className="hidden"
                onChange={onFile}
              />
            </label>
          )}

          {fase === 'procesando' && (
            <p className="py-10 text-center text-sm text-zinc-400">
              Leyendo la factura con IA… (unos segundos)
            </p>
          )}

          {fase === 'aplicando' && (
            <p className="py-10 text-center text-sm text-zinc-400">
              Cargando productos…
            </p>
          )}

          {fase === 'revisar' && (
            <div>
              {/* Lo que se leyó de la cabecera. Antes se descartaba entero, así
                  que no quedaba registro de qué factura entró. */}
              {cabecera && (
                <div className="mb-3 rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 text-sm">
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <span className="font-semibold text-white">
                      {cabecera.nombre || 'Proveedor no detectado'}
                    </span>
                    {cabecera.comprobante && (
                      <span className="text-zinc-400">
                        Comprobante {cabecera.comprobante}
                      </span>
                    )}
                    {cabecera.fecha && (
                      <span className="text-zinc-400">{cabecera.fecha}</span>
                    )}
                    {totalDetectado > 0 && (
                      <span className="ml-auto text-zinc-300">
                        Total factura:{' '}
                        <strong className="text-white">
                          ${formatCurrency(totalDetectado)}
                        </strong>
                      </span>
                    )}
                  </div>

                  <p className="mt-1.5 text-xs">
                    {proveedorDetectado ? (
                      <span className="text-emerald-400">
                        Se va a registrar como una compra a{' '}
                        {proveedorDetectado.nombre}
                      </span>
                    ) : (
                      <span className="text-amber-400">
                        Este proveedor no está en tu lista: el stock se carga
                        igual, pero la compra no queda asociada a nadie.
                      </span>
                    )}
                  </p>

                  {/* El total de la factura contra la suma de los renglones: si
                      no coinciden, la IA leyó mal algún número. */}
                  {totalDetectado > 0 &&
                    Math.abs(totalDetectado - sumaRenglones) >
                      totalDetectado * 0.15 && (
                      <p className="mt-1.5 rounded bg-amber-500/10 px-2 py-1 text-xs text-amber-300">
                        Los renglones suman ${formatCurrency(sumaRenglones)} y
                        la factura dice ${formatCurrency(totalDetectado)}.
                        Revisá las cantidades y los costos antes de aplicar.
                      </p>
                    )}
                </div>
              )}

              <p className="mb-2 text-sm text-zinc-300">
                Revisá y corregí lo que haga falta. Los que ya existen suman
                stock; los nuevos se crean con el precio sugerido.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-zinc-500">
                      <th className="p-1">Incluir</th>
                      <th className="p-1">Producto</th>
                      <th className="p-1">Código</th>
                      <th className="p-1 text-center">Cant.</th>
                      <th className="p-1 text-right">Costo u.</th>
                      <th className="p-1 text-right">Precio venta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, i) => (
                      <tr key={i} className="border-t border-zinc-700">
                        <td className="p-1">
                          <input
                            type="checkbox"
                            checked={it.incluir}
                            onChange={(e) =>
                              setItem(i, 'incluir', e.target.checked)
                            }
                            aria-label={`Incluir ${it.nombre}`}
                          />
                        </td>
                        <td className="p-1">
                          <input
                            value={it.nombre}
                            onChange={(e) =>
                              setItem(i, 'nombre', e.target.value)
                            }
                            className="w-full min-w-[150px] rounded bg-zinc-700 px-2 py-1 text-white"
                          />
                          {it.categoria && (
                            <span className="text-[11px] text-zinc-500">
                              {it.categoria}
                              {it.vendidoPor === 'peso' ? ' · por kilo' : ''}
                            </span>
                          )}
                        </td>
                        <td className="p-1">
                          <input
                            value={it.codigo || ''}
                            onChange={(e) =>
                              setItem(i, 'codigo', e.target.value)
                            }
                            placeholder="sin código"
                            className="w-28 rounded bg-zinc-700 px-2 py-1 font-mono text-xs text-white"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            value={it.cantidad}
                            onChange={(e) =>
                              setItem(i, 'cantidad', e.target.value)
                            }
                            className="w-16 rounded bg-zinc-700 px-2 py-1 text-center text-white"
                          />
                          {it.bultos > 0 && it.unidadesPorBulto > 0 && (
                            <span className="block text-center text-[11px] text-zinc-500">
                              {it.bultos} x {it.unidadesPorBulto}
                            </span>
                          )}
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            value={it.costo}
                            onChange={(e) => {
                              const nuevoCosto = Number(e.target.value) || 0;
                              setItems((prev) =>
                                prev.map((x, k) =>
                                  k === i
                                    ? {
                                        ...x,
                                        costo: e.target.value,
                                        // El precio sugerido acompaña al costo
                                        // mientras no se haya tocado a mano.
                                        precio: sugerirPrecio(nuevoCosto),
                                      }
                                    : x,
                                ),
                              );
                            }}
                            className="w-20 rounded bg-zinc-700 px-2 py-1 text-right text-white"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            value={it.precio ?? ''}
                            onChange={(e) =>
                              setItem(i, 'precio', e.target.value)
                            }
                            className="w-20 rounded bg-zinc-700 px-2 py-1 text-right font-semibold text-emerald-300"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                El precio de venta se sugiere con el margen que usás en tus
                otros productos. Cambialo si querés.
              </p>
            </div>
          )}
        </div>

        {fase === 'revisar' && (
          <div className="border-t border-zinc-700 p-4 text-right">
            <button
              type="button"
              onClick={aplicar}
              className="rounded-md bg-green-600 px-5 py-2 font-semibold text-white hover:bg-green-700"
            >
              Aplicar al inventario
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export default CargarFacturaModal;
