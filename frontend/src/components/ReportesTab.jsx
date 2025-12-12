import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Printer,
  Trash2,
  PlusCircle,
  MinusCircle,
  Archive,
  Search,
  ArrowUp,
  ArrowDown,
  Minus,
  Eye,
  Calendar,
  Download,
  ChevronLeft,
  ChevronRight,
  CornerDownLeft,
} from 'lucide-react';
import Swal from 'sweetalert2'; // Se puede quitar si mostrarMensaje del contexto es suficiente
import PaginationControls from './PaginationControls.jsx';
import SalesChart from './SalesChart.jsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAppContext } from '../context/AppContext.jsx'; // Importar hook
import { formatCurrency, obtenerNombreMes } from '../utils/helpers.js'; // Importar helpers directamente
import * as XLSX from 'xlsx';
import SalesHeatmap from './SalesHeatmap.jsx';
import HistorialTurnos from './HistorialTurnos.jsx';
import CajaGeneral from './CajaGeneral.jsx';

const ITEMS_PER_PAGE_REPORTE = 10;

function ReportesTab({ onPrintRequest, onViewDetailsRequest }) {
  // Solo recibe props para modales/impresión
  const {
    ventas,
    egresos,
    ingresosManuales,
    clientes,
    // datosNegocio, // Se obtiene del contexto
    handleRegistrarIngresoManual, // Renombrado
    handleEliminarIngresoManual, // Renombrado
    handleRegistrarEgreso, // Renombrado
    handleEliminarEgreso, // Renombrado
    handleEliminarVenta, // Renombrado
    mostrarMensaje,
    // confirmarAccion // Si se usa directamente aquí, o a través de los handlers del contexto
  } = useAppContext();
  const { datosNegocio } = useAppContext(); // Obtener datosNegocio específicamente si no se desestructuró antes
  if (!ventas || !egresos || !ingresosManuales) {
    console.log('Context missing arrays:', {
      ventas,
      egresos,
      ingresosManuales,
    });
    return null;
  }
  // Versión corregida
  const getCleanToday = () => {
    const today = new Date();
    // Esto toma el año, mes y día de TU calendario local y crea una fecha UTC
    // a la medianoche. Elimina el problema de la zona horaria.
    return new Date(
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
    );
  };
  const [selectedDate, setSelectedDate] = useState(getCleanToday());
  // Estados locales para los formularios de esta pestaña se mantienen
  const [formIngresoDesc, setFormIngresoDesc] = useState('');
  const [formIngresoMonto, setFormIngresoMonto] = useState('');
  const [formEgresoDesc, setFormEgresoDesc] = useState('');
  const [formEgresoMonto, setFormEgresoMonto] = useState('');

  const [searchTermDia, setSearchTermDia] = useState('');
  const [sortConfigDia, setSortConfigDia] = useState({
    key: 'timestamp',
    direction: 'descending',
  });
  const [currentPageDia, setCurrentPageDia] = useState(1);
  const [searchTermMes, setSearchTermMes] = useState('');
  const [sortConfigMes, setSortConfigMes] = useState({
    key: 'timestamp',
    direction: 'descending',
  });
  const [currentPageMes, setCurrentPageMes] = useState(1);

  // --- FASE 2: La lógica ahora se basa en 'selectedDate' en lugar de 'new Date()' ---
  // Creamos un formateador de fecha que siempre respete la fecha UTC.
  const dateFormatter = new Intl.DateTimeFormat('es-AR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    timeZone: 'UTC', // Le decimos que la fecha que le damos ya está en UTC
  });

  const diaSeleccionadoStr = dateFormatter.format(selectedDate);
  const mesSeleccionado = selectedDate.getUTCMonth();
  const anioSeleccionado = selectedDate.getFullYear();
  // Versión corregida
  const nombreMesSeleccionado = obtenerNombreMes(selectedDate.getUTCMonth());

  // Filtramos los datos basados en la fecha seleccionada
  const safeVentas = Array.isArray(ventas) ? ventas : [];
  const safeEgresos = Array.isArray(egresos) ? egresos : [];
  const safeIngresos = Array.isArray(ingresosManuales) ? ingresosManuales : [];

  const ventasDelDia = safeVentas.filter((v) => v.fecha === diaSeleccionadoStr);
  const egresosDelDia = safeEgresos.filter(
    (e) => e.fecha === diaSeleccionadoStr,
  );
  const ingresosManualesDelDia = safeIngresos.filter(
    (i) => i.fecha === diaSeleccionadoStr,
  );

  const filterByMonthAndYear = (item) => {
    // Usamos una forma más robusta de obtener la fecha del item
    const itemDate = new Date(
      item.timestamp || item.fecha.split('/').reverse().join('-'),
    );
    return (
      itemDate.getMonth() === mesSeleccionado &&
      itemDate.getFullYear() === anioSeleccionado
    );
  };

  const ventasMes = safeVentas.filter(filterByMonthAndYear);
  const egresosMes = safeEgresos.filter(filterByMonthAndYear);
  const ingresosManualesMes = safeIngresos.filter(filterByMonthAndYear);

  // --- Lógica de cálculo (CORREGIDA) ---
  const totalVentasDia = ventasDelDia.reduce(
    (s, v) => s + (Number(v.total) || 0),
    0,
  );

  const ventasPorMedioDia = useMemo(() => {
    return ventasDelDia.reduce((acc, venta) => {
      if (venta.pagos && Array.isArray(venta.pagos)) {
        venta.pagos.forEach((p) => {
          acc[p.metodo] = (acc[p.metodo] || 0) + (Number(p.monto) || 0);
        });
      }
      return acc;
    }, {});
  }, [ventasDelDia]);

  const totalEgresosDia = egresosDelDia.reduce(
    (s, e) => s + (Number(e.monto) || 0),
    0,
  );
  const totalIngresosManualesDia = ingresosManualesDelDia.reduce(
    (s, i) => s + (Number(i.monto) || 0),
    0,
  );
  const saldoEfectivoEsperado =
    (ventasPorMedioDia['efectivo'] || 0) +
    totalIngresosManualesDia -
    totalEgresosDia;
  const totalVentasMes = ventasMes.reduce(
    (s, v) => s + (Number(v.total) || 0),
    0,
  );

  const ventasPorVendedorDia = useMemo(() => {
    return ventasDelDia.reduce((acc, venta) => {
      const vendedor = venta.vendedorNombre || 'N/A';
      if (!acc[vendedor]) acc[vendedor] = { total: 0, cantidadVentas: 0 };
      acc[vendedor].total += venta.total;
      acc[vendedor].cantidadVentas += 1;
      return acc;
    }, {});
  }, [ventasDelDia]);

  // --- FUNCIÓN DE ORDENAMIENTO CORREGIDA ---
  const defaultSort = (a, b) => {
    // Esta función convierte la fecha de Firestore a un número para poder comparar.
    const getTime = (item) => {
      // Primero busca 'createdAt', si no lo encuentra, busca 'timestamp' como respaldo.
      const timestamp = item.createdAt || item.timestamp;
      if (!timestamp) return 0;
      // El método .toDate() es la forma correcta de manejar Timestamps de Firestore.
      if (typeof timestamp.toDate === 'function') {
        return timestamp.toDate().getTime();
      }
      // Si es un texto, lo convierte a fecha.
      return new Date(timestamp).getTime();
    };
    return getTime(b) - getTime(a); // Ordena del más reciente al más antiguo
  };

  // Lógica de agrupación de movimientos (sin cambios, ahora usa el defaultSort corregido)
  // Reemplaza esto en ReportesTab.jsx
  const todosMovimientosDia = useMemo(() => {
    const getMetodosPagoString = (venta) => {
      if (venta.pagos && Array.isArray(venta.pagos)) {
        return venta.pagos
          .map((p) => p.metodo.charAt(0).toUpperCase() + p.metodo.slice(1))
          .join(' + ');
      }
      return venta.metodoPago || 'N/A';
    };

    // CORRECCIÓN: Usamos un nuevo nombre de variable 'ventasMapeadas'
    const ventasMapeadas = ventasDelDia.map((v) => ({
      ...v,
      tipo: 'Venta',
      montoDisplay: v.total,
      desc: `Venta #${(v.id || '').substring(0, 8)}... (${getMetodosPagoString(v)})`,
    }));

    return [
      ...ventasMapeadas, // Y la usamos aquí
      ...ingresosManualesDelDia.map((i) => ({
        ...i,
        tipo: 'Ingreso Manual',
        montoDisplay: i.monto,
        desc: i.descripcion,
      })),
      ...egresosDelDia.map((e) => ({
        ...e,
        tipo: 'Egreso',
        montoDisplay: -(Number(e.monto) || 0),
        desc: e.descripcion,
      })),
    ].sort(defaultSort);
  }, [ventasDelDia, ingresosManualesDelDia, egresosDelDia]);

  const todosMovimientosMes = useMemo(() => {
    const getMetodosPagoString = (venta) => {
      if (venta.pagos && Array.isArray(venta.pagos)) {
        return venta.pagos
          .map((p) => p.metodo.charAt(0).toUpperCase() + p.metodo.slice(1))
          .join(' + ');
      }
      return venta.metodoPago || 'N/A';
    };
    return [
      ...ventasMes.map((v) => ({
        ...v,
        tipo: 'Venta',
        montoDisplay: v.total,
        desc: `${v.clienteNombre || 'Cons. Final'} (${getMetodosPagoString(v)})`,
      })),
      ...ingresosManualesMes.map((i) => ({
        ...i,
        tipo: 'Ingreso Manual',
        montoDisplay: i.monto,
        desc: i.descripcion,
      })),
      ...egresosMes.map((e) => ({
        ...e,
        tipo: 'Egreso',
        montoDisplay: -(Number(e.monto) || 0),
        desc: e.descripcion,
      })),
    ].sort(defaultSort);
  }, [ventasMes, ingresosManualesMes, egresosMes]);

  const salesDataForChart = useMemo(() => {
    const salesByDay = ventasMes.reduce((acc, venta) => {
      try {
        if (venta.fecha && typeof venta.fecha === 'string') {
          const day = venta.fecha.split('/')[0];
          if (day) {
            acc[day] = (acc[day] || 0) + (Number(venta.total) || 0);
          }
        }
      } catch (e) {
        console.error('Error parsing date for chart:', venta.fecha, e);
      }
      return acc;
    }, {});
    return Object.entries(salesByDay)
      .map(([dia, total]) => ({ dia, total }))
      .sort((a, b) => parseInt(a.dia, 10) - parseInt(b.dia, 10));
  }, [ventasMes]);
  // frontend/src/components/ReportesTab.jsx

  const productosMasVendidosMes = useMemo(() => {
    const productCounts = ventasMes.reduce((acc, venta) => {
      venta.items.forEach((item) => {
        // Usamos el ID del producto como clave única
        const key = item.id || item.nombre;

        if (acc[key]) {
          // Si ya existe, simplemente sumamos la cantidad y el precio final
          acc[key].cantidad += item.cantidad;
          acc[key].totalVendido += item.precioFinal; // <-- CORREGIDO
        } else {
          // Si es nuevo, lo creamos con el precio final ya calculado
          acc[key] = {
            nombre: item.nombre,
            cantidad: item.cantidad,
            totalVendido: item.precioFinal, // <-- CORREGIDO
          };
        }
      });
      return acc;
    }, {});

    // 4. Convertimos el objeto a un array, lo ordenamos de mayor a menor
    //    y nos quedamos con los 5 primeros (el Top 5).
    return Object.values(productCounts)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
  }, [ventasMes]); // Esta lógica se recalcula solo si las ventas del mes cambian

  // frontend/src/components/ReportesTab.jsx

  const rankingVendedoresMes = useMemo(() => {
    // 1. Usamos reduce para agrupar las ventas por el nombre del vendedor
    const statsPorVendedor = ventasMes.reduce((acc, venta) => {
      const vendedor = venta.vendedorNombre || 'N/A'; // Usamos 'N/A' si no hay vendedor

      if (!acc[vendedor]) {
        acc[vendedor] = {
          nombre: vendedor,
          totalVendido: 0,
          cantidadVentas: 0,
        };
      }

      // 2. Acumulamos el total vendido y la cantidad de ventas
      acc[vendedor].totalVendido += venta.total;
      acc[vendedor].cantidadVentas += 1;

      return acc;
    }, {});

    // 3. Convertimos el objeto a un array y lo ordenamos por el total vendido
    return Object.values(statsPorVendedor).sort(
      (a, b) => b.totalVendido - a.totalVendido,
    );
  }, [ventasMes]); // Esta lógica se recalcula solo si las ventas del mes cambian

  // frontend/src/components/ReportesTab.jsx

  const datosMapaDeCalor = useMemo(() => {
    // Creamos una estructura para contar las ventas: un objeto para cada día de la semana.
    const dias = [
      'Domingo',
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
    ];
    const ventasPorHoraYDia = {}; // Ej: { Lunes: { '09': 5, '10': 12 }, Martes: { ... } }

    ventasMes.forEach((venta) => {
      const fechaVenta = venta.createdAt?.toDate() || new Date(venta.timestamp);
      if (!fechaVenta) return;

      const diaSemana = dias[fechaVenta.getDay()];
      const hora = fechaVenta.getHours().toString().padStart(2, '0'); // Formato "09", "10", etc.

      if (!ventasPorHoraYDia[diaSemana]) {
        ventasPorHoraYDia[diaSemana] = {};
      }
      if (!ventasPorHoraYDia[diaSemana][hora]) {
        ventasPorHoraYDia[diaSemana][hora] = 0;
      }

      ventasPorHoraYDia[diaSemana][hora] += 1; // Contamos una venta más
    });

    return ventasPorHoraYDia;
  }, [ventasMes]);

  const sortItems = (items, config) => {
    if (!config.key) return items;
    return [...items].sort((a, b) => {
      let valA = a[config.key];
      let valB = b[config.key];
      if (config.key === 'timestamp') {
        valA = new Date(valA || 0).getTime();
        valB = new Date(valB || 0).getTime();
      } else if (typeof valA === 'number' && typeof valB === 'number') {
      } else {
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
      }
      if (valA < valB) return config.direction === 'ascending' ? -1 : 1;
      if (valA > valB) return config.direction === 'ascending' ? 1 : -1;
      return 0;
    });
  };

  const filteredSortedMovimientosDia = useMemo(() => {
    let items = todosMovimientosDia;
    if (searchTermDia) {
      const lower = searchTermDia.toLowerCase();
      items = items.filter(
        (m) =>
          String(m.tipo).toLowerCase().includes(lower) ||
          String(m.desc).toLowerCase().includes(lower) ||
          String(m.montoDisplay).includes(lower) ||
          String(m.hora).toLowerCase().includes(lower),
      );
    }
    return sortItems(items, sortConfigDia);
  }, [todosMovimientosDia, searchTermDia, sortConfigDia]);
  const totalPagesDia = Math.ceil(
    filteredSortedMovimientosDia.length / ITEMS_PER_PAGE_REPORTE,
  );
  const paginatedMovimientosDia = useMemo(() => {
    const first = (currentPageDia - 1) * ITEMS_PER_PAGE_REPORTE;
    return filteredSortedMovimientosDia.slice(
      first,
      first + ITEMS_PER_PAGE_REPORTE,
    );
  }, [currentPageDia, filteredSortedMovimientosDia]);
  useEffect(() => {
    if (currentPageDia > totalPagesDia && totalPagesDia > 0)
      setCurrentPageDia(totalPagesDia);
    else if (currentPageDia <= 0 && totalPagesDia > 0) setCurrentPageDia(1);
    else if (filteredSortedMovimientosDia.length === 0 && currentPageDia !== 1)
      setCurrentPageDia(1);
  }, [currentPageDia, totalPagesDia, filteredSortedMovimientosDia.length]);
  const requestSortDia = (key) => {
    let d =
      sortConfigDia.key === key && sortConfigDia.direction === 'ascending'
        ? 'descending'
        : 'ascending';
    setSortConfigDia({ key, direction: d });
    setCurrentPageDia(1);
  };

  const filteredSortedMovimientosMes = useMemo(() => {
    let items = todosMovimientosMes;
    if (searchTermMes) {
      const lower = searchTermMes.toLowerCase();
      items = items.filter(
        (m) =>
          String(m.fecha).toLowerCase().includes(lower) ||
          String(m.tipo).toLowerCase().includes(lower) ||
          String(m.desc).toLowerCase().includes(lower) ||
          String(m.montoDisplay).includes(lower) ||
          String(m.hora).toLowerCase().includes(lower),
      );
    }
    return sortItems(items, sortConfigMes);
  }, [todosMovimientosMes, searchTermMes, sortConfigMes]);
  const totalPagesMes = Math.ceil(
    filteredSortedMovimientosMes.length / ITEMS_PER_PAGE_REPORTE,
  );
  const paginatedMovimientosMes = useMemo(() => {
    const first = (currentPageMes - 1) * ITEMS_PER_PAGE_REPORTE;
    return filteredSortedMovimientosMes.slice(
      first,
      first + ITEMS_PER_PAGE_REPORTE,
    );
  }, [currentPageMes, filteredSortedMovimientosMes]);
  useEffect(() => {
    if (currentPageMes > totalPagesMes && totalPagesMes > 0)
      setCurrentPageMes(totalPagesMes);
    else if (currentPageMes <= 0 && totalPagesMes > 0) setCurrentPageMes(1);
    else if (filteredSortedMovimientosMes.length === 0 && currentPageMes !== 1)
      setCurrentPageMes(1);
  }, [currentPageMes, totalPagesMes, filteredSortedMovimientosMes.length]);
  const requestSortMes = (key) => {
    let d =
      sortConfigMes.key === key && sortConfigMes.direction === 'ascending'
        ? 'descending'
        : 'ascending';
    setSortConfigMes({ key, direction: d });
    setCurrentPageMes(1);
  };

  const handleLocalRegistrarIngreso = () => {
    const montoNum = parseFloat(formIngresoMonto);
    if (!formIngresoDesc.trim() || isNaN(montoNum) || montoNum <= 0) {
      mostrarMensaje('Ingrese descripción y monto válido.', 'warning');
      return;
    }
    handleRegistrarIngresoManual(formIngresoDesc.trim(), montoNum); // Llama al handler del contexto
    setFormIngresoDesc('');
    setFormIngresoMonto('');
  };
  const handleLocalRegistrarEgreso = () => {
    const montoNum = parseFloat(formEgresoMonto);
    if (!formEgresoDesc.trim() || isNaN(montoNum) || montoNum <= 0) {
      mostrarMensaje('Ingrese descripción y monto válido.', 'warning');
      return;
    }
    handleRegistrarEgreso(formEgresoDesc.trim(), montoNum); // Llama al handler del contexto
    setFormEgresoDesc('');
    setFormEgresoMonto('');
  };

  const checkIdValidityForAction = (id, itemType) => {
    const isInvalid =
      !id ||
      typeof id !== 'string' ||
      id.startsWith('local_') ||
      id.includes('_h_') ||
      id.includes('_m_') ||
      id.includes('_flt_') ||
      (id && id._id_original_invalid);
    if (isInvalid) {
      mostrarMensaje(
        `Este ${itemType.toLowerCase()} tiene ID inválido. Acción no completada.`,
        'warning',
      );
      return false;
    }
    return true;
  };
  const handleLocalEliminarMovimiento = (id, tipo, descripcion) => {
    if (!checkIdValidityForAction(id, tipo)) return;
    if (tipo === 'Ingreso Manual') handleEliminarIngresoManual(id, descripcion);
    else if (tipo === 'Egreso') handleEliminarEgreso(id, descripcion);
  };
  const handleLocalEliminarVenta = (ventaId) => {
    if (!checkIdValidityForAction(ventaId, 'Venta')) return;
    handleEliminarVenta(ventaId);
  };
  const handleLocalPrintClick = (ventaId) => {
    if (!checkIdValidityForAction(ventaId, 'Venta')) {
      mostrarMensaje('ID de venta inválido.', 'error');
      return;
    }
    const ventaToPrintObj = ventas.find((v) => v.id === ventaId);
    const clienteInfoObj =
      ventaToPrintObj && clientes
        ? clientes.find((c) => c.id === ventaToPrintObj.clienteId)
        : null;
    if (ventaToPrintObj && onPrintRequest)
      onPrintRequest(ventaToPrintObj, 'print');
    else mostrarMensaje('Venta no encontrada.', 'error');
  };
  const handleLocalViewDetailsClick = (itemId) => {
    if (!checkIdValidityForAction(itemId, 'elemento')) {
      mostrarMensaje('ID inválido.', 'error');
      return;
    }
    if (onViewDetailsRequest) onViewDetailsRequest(itemId);
  };

  const handleCerrarCaja = () => {
    let resumenVendedorHtml = '';
    if (ventasPorVendedorDia && Object.keys(ventasPorVendedorDia).length > 0) {
      resumenVendedorHtml += `<hr class="border-zinc-600 my-2"/><h4 class="font-semibold text-zinc-200 pt-1 text-left">Resumen por Vendedor:</h4><div class="pl-4 space-y-1">`;
      Object.entries(ventasPorVendedorDia).forEach(([vendedor, data]) => {
        resumenVendedorHtml += `<div class="flex justify-between items-center"><span class="text-zinc-400">${vendedor}:</span><span class="font-medium text-zinc-200">$${formatCurrency(data.total)} <span class="text-xs text-zinc-500">(${data.cantidadVentas} v.)</span></span></div>`;
      });
      resumenVendedorHtml += `</div>`;
    }

    Swal.fire({
      title: 'Cierre de Caja (Simulado)',
      html: `<div class="text-left text-sm space-y-1 text-zinc-300">
                  <p>Total Ventas del Día: <strong class="text-zinc-100">$${formatCurrency(totalVentasDia)}</strong></p>
                  <hr class="border-zinc-600 my-2"/>
                  <p>+ Ventas en Efectivo: <span class="monto-positivo">$${formatCurrency(ventasPorMedioDia['efectivo'] || 0)}</span></p>
                  <p>+ Ingresos Manuales: <span class="monto-positivo">$${formatCurrency(totalIngresosManualesDia)}</span></p>
                  <p>- Egresos en Efectivo: <span class="monto-negativo">-${formatCurrency(totalEgresosDia)}</span></p>
                  <hr class="border-zinc-600 my-2"/>
                  <p>Saldo Efectivo Esperado: <strong class="text-blue-400 text-base">$${formatCurrency(saldoEfectivoEsperado)}</strong></p>
                  ${resumenVendedorHtml}
               </div>`,
      icon: 'info',
      confirmButtonText: 'Entendido',
      // Asegúrate de mantener el resto de tu configuración de Swal aquí...
      heightAuto: false,
      background: '#27272a',
      color: '#d4d4d8',
      confirmButtonColor: '#3b82f6',
      customClass: {
        popup: 'text-sm rounded-lg',
        title: 'text-zinc-100 !text-lg',
        htmlContainer: 'text-zinc-300',
        confirmButton: 'px-4 py-2 rounded-md text-white hover:bg-blue-600',
      },
    });
  };

  const getSortIcon = (key, config) => {
    if (!config || config.key !== key)
      return (
        <Minus className="ml-1 inline-block h-3 w-3 text-zinc-500 opacity-50" />
      );
    return config.direction === 'ascending' ? (
      <ArrowUp className="ml-1 inline-block h-4 w-4 text-blue-400" />
    ) : (
      <ArrowDown className="ml-1 inline-block h-4 w-4 text-blue-400" />
    );
  };
  const headerButtonClasses =
    'flex items-center text-left text-xs font-medium text-zinc-300 uppercase tracking-wider hover:text-white focus:outline-none';
  // --- FASE 1: Funciones para cambiar la fecha ---
  const changeDate = (amount) => {
    setSelectedDate((prevDate) => {
      const newDate = new Date(prevDate);
      newDate.setDate(newDate.getDate() + amount);
      return newDate;
    });
  };

  const handleDateChange = (e) => {
    const [year, month, day] = e.target.value.split('-').map(Number);
    // Creamos la fecha en UTC para evitar que la zona horaria la cambie al día anterior.
    setSelectedDate(new Date(Date.UTC(year, month - 1, day)));
  };

  // --- FASE 3: Función para exportar el reporte del mes ---
  const handleExportarMes = () => {
    if (
      ventasMes.length === 0 &&
      egresosMes.length === 0 &&
      ingresosManualesMes.length === 0
    ) {
      mostrarMensaje(
        'No hay movimientos en el mes seleccionado para exportar.',
        'warning',
      );
      return;
    }

    const totalIngresosMes = ingresosManualesMes.reduce(
      (acc, item) => acc + item.monto,
      0,
    );
    const totalEgresosMes = egresosMes.reduce(
      (acc, item) => acc + item.monto,
      0,
    );

    const ventasPorVendedorMes = ventasMes.reduce((acc, venta) => {
      const vendedor = venta.vendedorNombre || 'N/A';
      if (!acc[vendedor]) acc[vendedor] = { total: 0, cantidadVentas: 0 };
      acc[vendedor].total += venta.total;
      acc[vendedor].cantidadVentas += 1;
      return acc;
    }, {});

    const resumenData = [
      {
        Concepto: 'Total Ventas del Mes',
        Valor: formatCurrency(totalVentasMes),
      },
      {
        Concepto: 'Total Ingresos Manuales',
        Valor: formatCurrency(totalIngresosMes),
      },
      { Concepto: 'Total Egresos', Valor: formatCurrency(totalEgresosMes) },
      {
        Concepto: 'Balance (Ventas + Ingresos - Egresos)',
        Valor: formatCurrency(
          totalVentasMes + totalIngresosMes - totalEgresosMes,
        ),
      },
    ];

    const desgloseVendedorData = Object.entries(ventasPorVendedorMes).map(
      ([vendedor, data]) => ({
        Vendedor: vendedor,
        'Ventas Realizadas': data.cantidadVentas,
        'Monto Total Vendido': formatCurrency(data.total),
      }),
    );

    const movimientosData = todosMovimientosMes.map((m) => ({
      Fecha: m.fecha,
      Hora: m.hora,
      Tipo: m.tipo,
      Descripción: m.desc,
      Monto: formatCurrency(m.montoDisplay),
    }));

    // Creamos hojas de cálculo separadas
    const wsResumen = XLSX.utils.json_to_sheet(resumenData, {
      skipHeader: true,
    });
    const wsVendedores = XLSX.utils.json_to_sheet(desgloseVendedorData);
    const wsMovimientos = XLSX.utils.json_to_sheet(movimientosData);

    // Nombramos las hojas
    XLSX.utils.sheet_add_aoa(wsResumen, [['Resumen del Mes']], {
      origin: 'A1',
    });
    XLSX.utils.sheet_add_aoa(wsVendedores, [['Desglose por Vendedor']], {
      origin: 'A1',
    });
    XLSX.utils.sheet_add_aoa(
      wsMovimientos,
      [['Todos los Movimientos del Mes']],
      { origin: 'A1' },
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');
    XLSX.utils.book_append_sheet(wb, wsVendedores, 'Vendedores');
    XLSX.utils.book_append_sheet(wb, wsMovimientos, 'Movimientos');

    XLSX.writeFile(
      wb,
      `Reporte_Mes_${nombreMesSeleccionado}_${anioSeleccionado}.xlsx`,
    );
  };

  return (
    <div id="reportes">
      {/* --- FASE 1: Controles de Fecha --- */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 p-3">
        <h2 className="mr-4 text-xl font-semibold text-white">
          Caja y Reportes
        </h2>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="date"
            value={selectedDate.toISOString().split('T')[0]}
            onChange={handleDateChange}
            className="rounded-md border border-zinc-600 bg-zinc-700 py-1.5 pl-9 pr-2 text-sm text-zinc-200 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <motion.button
          onClick={() => changeDate(-1)}
          className="rounded-md bg-zinc-700 p-2 hover:bg-zinc-600"
          title="Día Anterior"
          whileTap={{ scale: 0.9 }}
        >
          <ChevronLeft className="h-4 w-4" />
        </motion.button>
        <motion.button
          onClick={() => changeDate(1)}
          className="rounded-md bg-zinc-700 p-2 hover:bg-zinc-600"
          title="Día Siguiente"
          whileTap={{ scale: 0.9 }}
        >
          <ChevronRight className="h-4 w-4" />
        </motion.button>
        <motion.button
          onClick={() => setSelectedDate(getCleanToday())}
          className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm hover:bg-blue-700"
          whileTap={{ scale: 0.95 }}
        >
          <CornerDownLeft className="h-4 w-4" /> Volver a Hoy
        </motion.button>
        {/* --- FASE 3: Botón de Exportar --- */}
        <motion.button
          onClick={handleExportarMes}
          className="ml-auto flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-sm hover:bg-green-700"
          whileTap={{ scale: 0.95 }}
        >
          <Download className="h-4 w-4" /> Exportar Mes
        </motion.button>
      </div>
      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-1">
          <CajaGeneral />
          <div className="rounded-lg bg-zinc-800 p-4 shadow-md sm:p-5">
            <h3 className="mb-3 border-b border-zinc-700 pb-2 text-lg font-medium text-white sm:text-xl">
              Registrar Ingreso Manual
            </h3>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="ingreso-descripcion-rep"
                  className="mb-1 block text-sm font-medium text-zinc-300"
                >
                  Descripción:
                </label>
                <input
                  type="text"
                  id="ingreso-descripcion-rep"
                  value={formIngresoDesc}
                  onChange={(e) => setFormIngresoDesc(e.target.value)}
                  placeholder="Ej: Fondo inicial"
                  className="w-full rounded-md border border-zinc-600 bg-zinc-700 p-2 text-zinc-100 placeholder-zinc-400"
                />
              </div>
              <div>
                <label
                  htmlFor="ingreso-monto-rep"
                  className="mb-1 block text-sm font-medium text-zinc-300"
                >
                  Monto ($):
                </label>
                <input
                  type="number"
                  id="ingreso-monto-rep"
                  value={formIngresoMonto}
                  onChange={(e) => setFormIngresoMonto(e.target.value)}
                  step="0.01"
                  min="0"
                  placeholder="Ej: 1000.00"
                  className="w-full rounded-md border border-zinc-600 bg-zinc-700 p-2 text-zinc-100"
                />
              </div>
              <div className="text-right">
                <motion.button
                  onClick={handleLocalRegistrarIngreso}
                  className="inline-flex w-full items-center rounded-md bg-green-600 px-3 py-2 font-bold text-white hover:bg-green-700 sm:w-auto"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Registrar Ingreso
                </motion.button>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-zinc-800 p-4 shadow-md sm:p-5">
            <h3 className="mb-3 border-b border-zinc-700 pb-2 text-lg font-medium text-white sm:text-xl">
              Registrar Egreso
            </h3>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="egreso-descripcion-rep"
                  className="mb-1 block text-sm font-medium text-zinc-300"
                >
                  Descripción:
                </label>
                <input
                  type="text"
                  id="egreso-descripcion-rep"
                  value={formEgresoDesc}
                  onChange={(e) => setFormEgresoDesc(e.target.value)}
                  placeholder="Ej: Pago a proveedor"
                  className="w-full rounded-md border border-zinc-600 bg-zinc-700 p-2 text-zinc-100 placeholder-zinc-400"
                />
              </div>
              <div>
                <label
                  htmlFor="egreso-monto-rep"
                  className="mb-1 block text-sm font-medium text-zinc-300"
                >
                  Monto ($):
                </label>
                <input
                  type="number"
                  id="egreso-monto-rep"
                  value={formEgresoMonto}
                  onChange={(e) => setFormEgresoMonto(e.target.value)}
                  step="0.01"
                  min="0"
                  placeholder="Ej: 500.50"
                  className="w-full rounded-md border border-zinc-600 bg-zinc-700 p-2 text-zinc-100"
                />
              </div>
              <div className="text-right">
                <motion.button
                  onClick={handleLocalRegistrarEgreso}
                  className="inline-flex w-full items-center rounded-md bg-red-600 px-3 py-2 font-bold text-white hover:bg-red-700 sm:w-auto"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <MinusCircle className="mr-2 h-4 w-4" />
                  Registrar Gasto
                </motion.button>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-zinc-800 p-4 shadow-md sm:p-5">
            <h3 className="mb-3 border-b border-zinc-700 pb-2 text-lg font-medium text-white sm:text-xl">
              Resumen del Día ({diaSeleccionadoStr})
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Total Ventas (Todos):</span>
                <span className="font-semibold text-zinc-100">
                  ${formatCurrency(totalVentasDia)}
                </span>
              </div>
              <hr className="my-1 border-zinc-700" />
              <h4 className="pt-1 font-semibold text-zinc-200">
                Desglose Ventas:
              </h4>
              <div className="space-y-1 pl-4">
                {[
                  'efectivo',
                  'tarjeta',
                  'qr_banco',
                  'qr_billetera',
                  'transferencia',
                ].map((medio) => (
                  <div
                    key={medio}
                    className="flex items-center justify-between"
                  >
                    <span className="capitalize text-zinc-400">
                      {medio.replace('_', ' ')}:
                    </span>
                    <span className="font-medium text-zinc-200">
                      ${formatCurrency(ventasPorMedioDia[medio] || 0)}
                    </span>
                  </div>
                ))}
              </div>
              <hr className="my-1 border-zinc-700" />
              <h4 className="pt-1 font-semibold text-zinc-200">
                Movimientos Efectivo:
              </h4>
              <div className="space-y-1 pl-4">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Ingresos Manuales:</span>
                  <span className="monto-positivo font-medium">
                    ${formatCurrency(totalIngresosManualesDia)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Egresos Efectivo:</span>
                  <span className="monto-negativo font-medium">
                    -${formatCurrency(totalEgresosDia)}
                  </span>
                </div>
              </div>
              <hr className="my-1 border-zinc-700" />
              <div className="flex items-center justify-between pt-2">
                <span className="font-bold text-zinc-100">
                  Saldo Efectivo Esperado:
                </span>
                <span className="text-lg font-bold text-blue-400">
                  ${formatCurrency(saldoEfectivoEsperado)}
                </span>
              </div>
              {/* --- AÑADIDO: Resumen por vendedor en pantalla --- */}
              {Object.keys(ventasPorVendedorDia).length > 0 && (
                <div className="mt-3 border-t border-zinc-700 pt-3">
                  <h4 className="mb-1 font-semibold text-zinc-200">
                    Desglose por Vendedor:
                  </h4>
                  <div className="space-y-1 pl-4">
                    {Object.entries(ventasPorVendedorDia).map(
                      ([vendedor, data]) => (
                        <div
                          key={vendedor}
                          className="flex items-center justify-between"
                        >
                          <span className="text-zinc-400">{vendedor}:</span>
                          <span className="font-medium text-zinc-200">
                            ${formatCurrency(data.total)}
                            <span className="ml-2 text-xs text-zinc-500">
                              ({data.cantidadVentas} v.)
                            </span>
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 text-right">
              <motion.button
                onClick={handleCerrarCaja}
                className="inline-flex w-full items-center rounded-md bg-orange-500 px-3 py-2 font-bold text-white hover:bg-orange-600 sm:w-auto"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Archive className="mr-2 h-4 w-4" />
                Simular Cierre
              </motion.button>
            </div>
          </div>
        </div>
        <div className="space-y-5 lg:col-span-2">
          <div className="rounded-lg bg-zinc-800 p-4 shadow-md sm:p-5">
            <h3 className="mb-3 border-b border-zinc-700 pb-2 text-lg font-medium text-white sm:text-xl">
              Ventas Diarias del Mes ({nombreMesSeleccionado})
            </h3>
            <SalesChart data={salesDataForChart} />
          </div>
          <div className="overflow-hidden rounded-lg bg-zinc-800 p-4 shadow-md sm:p-5">
            <div className="mb-3 flex flex-col items-center justify-between gap-2 border-b border-zinc-700 pb-2 sm:flex-row">
              <h3 className="whitespace-nowrap text-lg font-medium text-white sm:text-xl">
                Movimientos Caja del Día ({diaSeleccionadoStr})
              </h3>
              <div className="relative w-full sm:w-auto">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 transform text-zinc-400">
                  <Search className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTermDia}
                  onChange={(e) => {
                    setSearchTermDia(e.target.value);
                    setCurrentPageDia(1);
                  }}
                  className="w-full rounded-md border border-zinc-600 bg-zinc-700 py-2 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-400 sm:w-64"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-zinc-700 hover:bg-transparent">
                    <TableHead>
                      <button
                        onClick={() => requestSortDia('timestamp')}
                        className={headerButtonClasses}
                      >
                        Hora {getSortIcon('timestamp', sortConfigDia)}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => requestSortDia('tipo')}
                        className={headerButtonClasses}
                      >
                        Tipo {getSortIcon('tipo', sortConfigDia)}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => requestSortDia('desc')}
                        className={headerButtonClasses}
                      >
                        Descripción {getSortIcon('desc', sortConfigDia)}
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        onClick={() => requestSortDia('montoDisplay')}
                        className={`${headerButtonClasses} w-full justify-end`}
                      >
                        Monto {getSortIcon('montoDisplay', sortConfigDia)}
                      </button>
                    </TableHead>
                    <TableHead className="text-center">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedMovimientosDia.length === 0 ? (
                    <TableRow className="border-b-zinc-700 hover:bg-transparent">
                      <TableCell
                        colSpan={5}
                        className="h-24 text-center italic text-zinc-400"
                      >
                        No hay movimientos hoy.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedMovimientosDia.map((m) => (
                      <TableRow
                        key={m.id || `mov_dia_fb_${Date.now()}${Math.random()}`}
                        className="border-b-zinc-700 hover:bg-zinc-700/50"
                      >
                        <TableCell className="whitespace-nowrap text-zinc-400">
                          {m.hora || 'N/A'}
                        </TableCell>
                        <TableCell
                          className={`whitespace-nowrap font-medium ${m.tipo === 'Venta' ? 'text-green-400' : m.tipo === 'Egreso' ? 'text-red-400' : 'text-blue-400'}`}
                        >
                          {m.tipo}
                        </TableCell>
                        <TableCell
                          className="max-w-xs truncate text-zinc-300"
                          title={m.desc}
                        >
                          {m.desc}
                        </TableCell>
                        <TableCell
                          className={`whitespace-nowrap text-right font-semibold ${m.montoDisplay >= 0 ? 'monto-positivo' : 'monto-negativo'}`}
                        >
                          ${formatCurrency(m.montoDisplay)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-center">
                          {m.tipo === 'Venta' && (
                            <motion.button
                              onClick={() => handleLocalViewDetailsClick(m.id)}
                              className="mr-2 rounded p-1 text-purple-400 hover:text-purple-300"
                              title="Ver Detalles"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              disabled={
                                !m.id ||
                                !!m._id_original_invalid ||
                                (typeof m.id === 'string' &&
                                  (m.id.startsWith('local_') ||
                                    m.id.includes('_h_') ||
                                    m.id.includes('_m_')))
                              }
                            >
                              <Eye className="inline-block h-4 w-4" />
                            </motion.button>
                          )}
                          {m.tipo === 'Venta' && (
                            <motion.button
                              onClick={() => handleLocalPrintClick(m.id)}
                              className="mr-2 rounded p-1 text-blue-400 hover:text-blue-300"
                              title="Imprimir"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              disabled={
                                !m.id ||
                                !!m._id_original_invalid ||
                                (typeof m.id === 'string' &&
                                  (m.id.startsWith('local_') ||
                                    m.id.includes('_h_') ||
                                    m.id.includes('_m_')))
                              }
                            >
                              <Printer className="inline-block h-4 w-4" />
                            </motion.button>
                          )}
                          <motion.button
                            onClick={() =>
                              m.tipo === 'Venta'
                                ? handleLocalEliminarVenta(m.id)
                                : handleLocalEliminarMovimiento(
                                    m.id,
                                    m.tipo,
                                    m.desc,
                                  )
                            }
                            className="rounded p-1 text-red-500 hover:text-red-400"
                            title={`Eliminar ${m.tipo}`}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            disabled={
                              !m.id ||
                              !!m._id_original_invalid ||
                              (typeof m.id === 'string' &&
                                (m.id.startsWith('local_') ||
                                  m.id.includes('_h_') ||
                                  m.id.includes('_m_')))
                            }
                          >
                            <Trash2 className="inline-block h-4 w-4" />
                          </motion.button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <PaginationControls
              currentPage={currentPageDia}
              totalPages={totalPagesDia}
              onPageChange={(page) => setCurrentPageDia(page)}
              itemsPerPage={ITEMS_PER_PAGE_REPORTE}
              totalItems={filteredSortedMovimientosDia.length}
            />
          </div>
          <div className="overflow-hidden rounded-lg bg-zinc-800 p-4 shadow-md sm:p-5">
            <div className="mb-3 flex flex-col items-center justify-between gap-2 border-b border-zinc-700 pb-2 sm:flex-row">
              <h3 className="whitespace-nowrap text-lg font-medium text-white sm:text-xl">
                Movimientos del Mes ({nombreMesSeleccionado})
              </h3>
              <div className="relative w-full sm:w-auto">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 transform text-zinc-400">
                  <Search className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTermMes}
                  onChange={(e) => {
                    setSearchTermMes(e.target.value);
                    setCurrentPageMes(1);
                  }}
                  className="w-full rounded-md border border-zinc-600 bg-zinc-700 py-2 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-400 sm:w-64"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-zinc-700 hover:bg-transparent">
                    <TableHead>
                      <button
                        onClick={() => requestSortMes('timestamp')}
                        className={headerButtonClasses}
                      >
                        Fecha/Hora {getSortIcon('timestamp', sortConfigMes)}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => requestSortMes('tipo')}
                        className={headerButtonClasses}
                      >
                        Tipo {getSortIcon('tipo', sortConfigMes)}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => requestSortMes('desc')}
                        className={headerButtonClasses}
                      >
                        Descripción {getSortIcon('desc', sortConfigMes)}
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        onClick={() => requestSortMes('montoDisplay')}
                        className={`${headerButtonClasses} w-full justify-end`}
                      >
                        Monto {getSortIcon('montoDisplay', sortConfigMes)}
                      </button>
                    </TableHead>
                    <TableHead className="text-center">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedMovimientosMes.length === 0 ? (
                    <TableRow className="border-b-zinc-700 hover:bg-transparent">
                      <TableCell
                        colSpan={5}
                        className="h-24 text-center italic text-zinc-400"
                      >
                        No hay movimientos este mes.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedMovimientosMes.map((m) => (
                      <TableRow
                        key={m.id || `mov_mes_fb_${Date.now()}${Math.random()}`}
                        className="border-b-zinc-700 hover:bg-zinc-700/50"
                      >
                        <TableCell className="whitespace-nowrap text-zinc-400">
                          {`${m.fecha || ''} ${m.hora || ''}`.trim()}
                        </TableCell>
                        <TableCell
                          className={`whitespace-nowrap font-medium ${m.tipo === 'Venta' ? 'text-green-400' : m.tipo === 'Egreso' ? 'text-red-400' : 'text-blue-400'}`}
                        >
                          {m.tipo}
                        </TableCell>
                        <TableCell
                          className="max-w-xs truncate text-zinc-300"
                          title={m.desc}
                        >
                          {m.desc}
                        </TableCell>
                        <TableCell
                          className={`whitespace-nowrap text-right font-semibold ${m.montoDisplay >= 0 ? 'monto-positivo' : 'monto-negativo'}`}
                        >
                          ${formatCurrency(m.montoDisplay)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-center">
                          {m.tipo === 'Venta' && (
                            <motion.button
                              onClick={() => handleLocalViewDetailsClick(m.id)}
                              className="mr-2 rounded p-1 text-purple-400 hover:text-purple-300"
                              title="Ver Detalles"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              disabled={
                                !m.id ||
                                !!m._id_original_invalid ||
                                (typeof m.id === 'string' &&
                                  (m.id.startsWith('local_') ||
                                    m.id.includes('_h_') ||
                                    m.id.includes('_m_')))
                              }
                            >
                              <Eye className="inline-block h-4 w-4" />
                            </motion.button>
                          )}
                          {m.tipo === 'Venta' && (
                            <motion.button
                              onClick={() => handleLocalPrintClick(m.id)}
                              className="mr-2 rounded p-1 text-blue-400 hover:text-blue-300"
                              title="Imprimir"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              disabled={
                                !m.id ||
                                !!m._id_original_invalid ||
                                (typeof m.id === 'string' &&
                                  (m.id.startsWith('local_') ||
                                    m.id.includes('_h_') ||
                                    m.id.includes('_m_')))
                              }
                            >
                              <Printer className="inline-block h-4 w-4" />
                            </motion.button>
                          )}
                          <motion.button
                            onClick={() =>
                              m.tipo === 'Venta'
                                ? handleLocalEliminarVenta(m.id)
                                : handleLocalEliminarMovimiento(
                                    m.id,
                                    m.tipo,
                                    m.desc,
                                  )
                            }
                            className="rounded p-1 text-red-500 hover:text-red-400"
                            title={`Eliminar ${m.tipo}`}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            disabled={
                              !m.id ||
                              !!m._id_original_invalid ||
                              (typeof m.id === 'string' &&
                                (m.id.startsWith('local_') ||
                                  m.id.includes('_h_') ||
                                  m.id.includes('_m_')))
                            }
                          >
                            <Trash2 className="inline-block h-4 w-4" />
                          </motion.button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <PaginationControls
              currentPage={currentPageMes}
              totalPages={totalPagesMes}
              onPageChange={(page) => setCurrentPageMes(page)}
              itemsPerPage={ITEMS_PER_PAGE_REPORTE}
              totalItems={filteredSortedMovimientosMes.length}
            />
            <div className="mt-3 text-right text-sm text-zinc-400">
              Total Ventas del Mes: ${formatCurrency(totalVentasMes)}
            </div>
          </div>
          {/* NUEVA SECCIÓN: PRODUCTOS MÁS VENDIDOS */}
          <div className="rounded-lg bg-zinc-800 p-4 shadow-md sm:p-5">
            <h3 className="mb-3 border-b border-zinc-700 pb-2 text-lg font-medium text-white sm:text-xl">
              Top 5 Productos Más Vendidos ({nombreMesSeleccionado})
            </h3>
            {productosMasVendidosMes.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-zinc-700">
                      <TableHead className="text-zinc-300">Producto</TableHead>
                      <TableHead className="text-right text-zinc-300">
                        Unidades Vendidas
                      </TableHead>
                      <TableHead className="text-right text-zinc-300">
                        Monto Total
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productosMasVendidosMes.map((producto, index) => (
                      <TableRow key={index} className="border-b-zinc-700/50">
                        <TableCell className="font-medium text-white">
                          {producto.nombre}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-blue-400">
                          {producto.cantidad}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-400">
                          ${formatCurrency(producto.totalVendido)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm italic text-zinc-400">
                No hay datos de ventas para generar un ranking este mes.
              </p>
            )}
          </div>
          {/* NUEVA SECCIÓN: RANKING DE VENDEDORES */}
          <div className="rounded-lg bg-zinc-800 p-4 shadow-md sm:p-5">
            <h3 className="mb-3 border-b border-zinc-700 pb-2 text-lg font-medium text-white sm:text-xl">
              Ranking de Vendedores ({nombreMesSeleccionado})
            </h3>
            {rankingVendedoresMes.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-zinc-700">
                      <TableHead className="text-zinc-300">Vendedor</TableHead>
                      <TableHead className="text-right text-zinc-300">
                        Ventas Realizadas
                      </TableHead>
                      <TableHead className="text-right text-zinc-300">
                        Monto Total
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rankingVendedoresMes.map((vendedor, index) => (
                      <TableRow key={index} className="border-b-zinc-700/50">
                        <TableCell className="font-medium text-white">
                          {vendedor.nombre}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-blue-400">
                          {vendedor.cantidadVentas}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-400">
                          ${formatCurrency(vendedor.totalVendido)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm italic text-zinc-400">
                No hay datos de ventas para generar un ranking de vendedores
                este mes.
              </p>
            )}
          </div>
          {/* NUEVA SECCIÓN: MAPA DE CALOR DE VENTAS */}
          <div className="rounded-lg bg-zinc-800 p-4 shadow-md sm:p-5">
            <h3 className="sm-text-xl mb-4 border-b border-zinc-700 pb-2 text-lg font-medium text-white">
              Días y Horarios Pico ({nombreMesSeleccionado})
            </h3>
            {ventasMes.length > 0 ? (
              <SalesHeatmap data={datosMapaDeCalor} />
            ) : (
              <p className="text-sm italic text-zinc-400">
                No hay datos de ventas para generar el mapa de calor este mes.
              </p>
            )}
          </div>
        </div>
      </div>
      <HistorialTurnos />
    </div>
  );
}
export default ReportesTab;
