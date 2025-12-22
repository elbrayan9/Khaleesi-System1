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
  FileBarChart,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
} from 'lucide-react';
import Swal from 'sweetalert2';
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
import { useAppContext } from '../context/AppContext.jsx';
import { formatCurrency, obtenerNombreMes } from '../utils/helpers.js';
import * as XLSX from 'xlsx';
import SalesHeatmap from './SalesHeatmap.jsx';
import HistorialTurnos from './HistorialTurnos.jsx';
import CajaGeneral from './CajaGeneral.jsx';

const ITEMS_PER_PAGE_REPORTE = 10;

function ReportesTab({ onPrintRequest, onViewDetailsRequest }) {
  const {
    ventas,
    egresos,
    ingresosManuales,
    clientes,
    handleRegistrarIngresoManual,
    handleEliminarIngresoManual,
    handleRegistrarEgreso,
    handleEliminarEgreso,
    handleEliminarVenta,
    mostrarMensaje,
  } = useAppContext();
  const { datosNegocio } = useAppContext();

  if (!ventas || !egresos || !ingresosManuales) {
    return null;
  }

  const getCleanToday = () => {
    const today = new Date();
    return new Date(
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
    );
  };

  const [selectedDate, setSelectedDate] = useState(getCleanToday());
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

  const dateFormatter = new Intl.DateTimeFormat('es-AR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    timeZone: 'UTC',
  });

  const diaSeleccionadoStr = dateFormatter.format(selectedDate);
  const mesSeleccionado = selectedDate.getUTCMonth();
  const anioSeleccionado = selectedDate.getFullYear();
  const nombreMesSeleccionado = obtenerNombreMes(selectedDate.getUTCMonth());

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

  const defaultSort = (a, b) => {
    const getTime = (item) => {
      const timestamp = item.createdAt || item.timestamp;
      if (!timestamp) return 0;
      if (typeof timestamp.toDate === 'function') {
        return timestamp.toDate().getTime();
      }
      return new Date(timestamp).getTime();
    };
    return getTime(b) - getTime(a);
  };

  const todosMovimientosDia = useMemo(() => {
    const getMetodosPagoString = (venta) => {
      if (venta.pagos && Array.isArray(venta.pagos)) {
        return venta.pagos
          .map((p) => p.metodo.charAt(0).toUpperCase() + p.metodo.slice(1))
          .join(' + ');
      }
      return venta.metodoPago || 'N/A';
    };

    const ventasMapeadas = ventasDelDia.map((v) => ({
      ...v,
      tipo: 'Venta',
      montoDisplay: v.total,
      desc: `Venta #${(v.id || '').substring(0, 8)}... (${getMetodosPagoString(v)})`,
    }));

    return [
      ...ventasMapeadas,
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

  const productosMasVendidosMes = useMemo(() => {
    const productCounts = ventasMes.reduce((acc, venta) => {
      venta.items.forEach((item) => {
        const key = item.id || item.nombre;

        if (acc[key]) {
          acc[key].cantidad += item.cantidad;
          acc[key].totalVendido += item.precioFinal;
        } else {
          acc[key] = {
            nombre: item.nombre,
            cantidad: item.cantidad,
            totalVendido: item.precioFinal,
          };
        }
      });
      return acc;
    }, {});

    return Object.values(productCounts)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
  }, [ventasMes]);

  const rankingVendedoresMes = useMemo(() => {
    const statsPorVendedor = ventasMes.reduce((acc, venta) => {
      const vendedor = venta.vendedorNombre || 'N/A';

      if (!acc[vendedor]) {
        acc[vendedor] = {
          nombre: vendedor,
          totalVendido: 0,
          cantidadVentas: 0,
        };
      }

      acc[vendedor].totalVendido += venta.total;
      acc[vendedor].cantidadVentas += 1;

      return acc;
    }, {});

    return Object.values(statsPorVendedor).sort(
      (a, b) => b.totalVendido - a.totalVendido,
    );
  }, [ventasMes]);

  const datosMapaDeCalor = useMemo(() => {
    const dias = [
      'Domingo',
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
    ];
    const ventasPorHoraYDia = {};

    ventasMes.forEach((venta) => {
      const fechaVenta = venta.createdAt?.toDate() || new Date(venta.timestamp);
      if (!fechaVenta) return;

      const diaSemana = dias[fechaVenta.getDay()];
      const hora = fechaVenta.getHours().toString().padStart(2, '0');

      if (!ventasPorHoraYDia[diaSemana]) {
        ventasPorHoraYDia[diaSemana] = {};
      }
      if (!ventasPorHoraYDia[diaSemana][hora]) {
        ventasPorHoraYDia[diaSemana][hora] = 0;
      }

      ventasPorHoraYDia[diaSemana][hora] += 1;
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
    handleRegistrarIngresoManual(formIngresoDesc.trim(), montoNum);
    setFormIngresoDesc('');
    setFormIngresoMonto('');
  };
  const handleLocalRegistrarEgreso = () => {
    const montoNum = parseFloat(formEgresoMonto);
    if (!formEgresoDesc.trim() || isNaN(montoNum) || montoNum <= 0) {
      mostrarMensaje('Ingrese descripción y monto válido.', 'warning');
      return;
    }
    handleRegistrarEgreso(formEgresoDesc.trim(), montoNum);
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

  const changeDate = (amount) => {
    setSelectedDate((prevDate) => {
      const newDate = new Date(prevDate);
      newDate.setDate(newDate.getDate() + amount);
      return newDate;
    });
  };

  const handleDateChange = (e) => {
    const [year, month, day] = e.target.value.split('-').map(Number);
    setSelectedDate(new Date(Date.UTC(year, month - 1, day)));
  };

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

    const wsResumen = XLSX.utils.json_to_sheet(resumenData, {
      skipHeader: true,
    });
    const wsVendedores = XLSX.utils.json_to_sheet(desgloseVendedorData);
    const wsMovimientos = XLSX.utils.json_to_sheet(movimientosData);

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
    <div id="reportes" className="space-y-6">
      {/* --- HEADER: Título y Controles --- */}
      <div className="flex flex-col gap-4 rounded-xl border border-zinc-700 bg-zinc-800/50 p-4 backdrop-blur-md md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-orange-500/10 p-2 text-orange-500">
            <FileBarChart className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Caja y Reportes</h2>
            <p className="text-xs text-zinc-400">
              Gestión diaria y métricas clave
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="date"
              value={selectedDate.toISOString().split('T')[0]}
              onChange={handleDateChange}
              className="rounded-lg border border-zinc-600 bg-zinc-900 py-2 pl-9 pr-3 text-sm text-zinc-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center rounded-lg border border-zinc-700 bg-zinc-900 p-1">
            <motion.button
              onClick={() => changeDate(-1)}
              className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              title="Día Anterior"
              whileTap={{ scale: 0.9 }}
            >
              <ChevronLeft className="h-4 w-4" />
            </motion.button>
            <div className="mx-1 h-4 w-px bg-zinc-700"></div>
            <motion.button
              onClick={() => changeDate(1)}
              className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              title="Día Siguiente"
              whileTap={{ scale: 0.9 }}
            >
              <ChevronRight className="h-4 w-4" />
            </motion.button>
          </div>

          <motion.button
            onClick={() => setSelectedDate(getCleanToday())}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600/10 px-3 py-2 text-sm font-medium text-blue-400 hover:bg-blue-600/20"
            whileTap={{ scale: 0.95 }}
          >
            <CornerDownLeft className="h-4 w-4" /> Hoy
          </motion.button>

          <motion.button
            onClick={handleExportarMes}
            className="ml-2 flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white shadow-lg shadow-green-900/20 hover:bg-green-700"
          >
            <Download className="h-4 w-4" /> Exportar Mes
          </motion.button>
        </div>
      </div>

      {/* --- TOP ROW: KPI Cards --- */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* KPI 1: Caja General (Prominent) */}
        <CajaGeneral />

        {/* KPI 2: Ventas del Día */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-400">Ventas del Día</p>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-400">
            {formatCurrency(totalVentasDia)}
          </p>
          <p className="text-xs text-zinc-500">
            {ventasDelDia.length} transacciones
          </p>
        </div>

        {/* KPI 3: Ingresos & Egresos (Combined) */}
        {/* KPI 3: Ingresos & Egresos (Combined with Forms) */}
        <div className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
          {/* Ingresos Section */}
          <div className="flex flex-col gap-1 border-b border-zinc-800 pb-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-zinc-400">
                Ingresos Extra
              </p>
              <p className="text-sm font-bold text-blue-400">
                {formatCurrency(totalIngresosManualesDia)}
              </p>
            </div>
            {/* Ingreso Form */}
            <div className="flex gap-1">
              <input
                type="text"
                value={formIngresoDesc}
                onChange={(e) => setFormIngresoDesc(e.target.value)}
                placeholder="Desc"
                className="h-7 w-full min-w-0 rounded border border-zinc-700 bg-zinc-800 px-2 text-[10px] text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="number"
                value={formIngresoMonto}
                onChange={(e) => setFormIngresoMonto(e.target.value)}
                placeholder="$"
                className="h-7 w-16 rounded border border-zinc-700 bg-zinc-800 px-2 text-[10px] text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={handleLocalRegistrarIngreso}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                <PlusCircle className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Egresos Section */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-zinc-400">Egresos</p>
              <p className="text-sm font-bold text-red-400">
                {formatCurrency(totalEgresosDia)}
              </p>
            </div>
            {/* Egreso Form */}
            <div className="flex gap-1">
              <input
                type="text"
                value={formEgresoDesc}
                onChange={(e) => setFormEgresoDesc(e.target.value)}
                placeholder="Desc"
                className="h-7 w-full min-w-0 rounded border border-zinc-700 bg-zinc-800 px-2 text-[10px] text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
              <input
                type="number"
                value={formEgresoMonto}
                onChange={(e) => setFormEgresoMonto(e.target.value)}
                placeholder="$"
                className="h-7 w-16 rounded border border-zinc-700 bg-zinc-800 px-2 text-[10px] text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
              <button
                onClick={handleLocalRegistrarEgreso}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-red-600 text-white hover:bg-red-700"
              >
                <MinusCircle className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- MAIN CONTENT GRID (Zero-Gap) --- */}
      <div className="grid h-[calc(100vh-220px)] min-h-[800px] grid-cols-1 gap-6 lg:grid-cols-12">
        {/* --- LEFT COLUMN: Chart + Tables (65-70%) --- */}
        <div className="flex h-full flex-col gap-4 lg:col-span-8 xl:col-span-9">
          {/* 1. Chart Section (Fixed Height) */}
          <div className="h-[300px] w-full shrink-0">
            <SalesChart data={salesDataForChart} />
          </div>

          {/* 2. Tables Section (Flex Fill) */}
          <div className="min-h-0 flex-1">
            <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Daily Movements Table */}
              <div className="flex h-full flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 shadow-lg">
                <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/80 p-3 backdrop-blur-sm">
                  <h3 className="text-sm font-semibold text-white">
                    Movimientos del Día
                  </h3>
                  <div className="relative w-32">
                    <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Buscar..."
                      value={searchTermDia}
                      onChange={(e) => setSearchTermDia(e.target.value)}
                      className="w-full rounded-md border border-zinc-700 bg-zinc-800 py-1 pl-7 pr-2 text-xs text-zinc-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-hidden">
                  <div className="custom-scrollbar h-full overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-zinc-900 shadow-sm">
                        <TableRow className="border-b border-zinc-800 hover:bg-transparent">
                          <TableHead
                            className="cursor-pointer text-zinc-400 hover:text-white"
                            onClick={() => requestSortDia('hora')}
                          >
                            Hora {getSortIcon('hora', sortConfigDia)}
                          </TableHead>
                          <TableHead
                            className="cursor-pointer text-zinc-400 hover:text-white"
                            onClick={() => requestSortDia('tipo')}
                          >
                            Tipo {getSortIcon('tipo', sortConfigDia)}
                          </TableHead>
                          <TableHead
                            className="cursor-pointer text-zinc-400 hover:text-white"
                            onClick={() => requestSortDia('desc')}
                          >
                            Desc. {getSortIcon('desc', sortConfigDia)}
                          </TableHead>
                          <TableHead
                            className="cursor-pointer text-right text-zinc-400 hover:text-white"
                            onClick={() => requestSortDia('montoDisplay')}
                          >
                            Monto {getSortIcon('montoDisplay', sortConfigDia)}
                          </TableHead>
                          <TableHead className="text-right text-zinc-400"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedMovimientosDia.length > 0 ? (
                          paginatedMovimientosDia.map((item, idx) => (
                            <TableRow
                              key={item.id || idx}
                              className="border-b border-zinc-800/50 hover:bg-zinc-800/30"
                            >
                              <TableCell className="py-3 font-mono text-sm text-zinc-300">
                                {item.hora}
                              </TableCell>
                              <TableCell className="py-3">
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                    item.tipo === 'Venta'
                                      ? 'bg-emerald-500/10 text-emerald-400'
                                      : item.tipo === 'Ingreso Manual'
                                        ? 'bg-blue-500/10 text-blue-400'
                                        : 'bg-red-500/10 text-red-400'
                                  }`}
                                >
                                  {item.tipo}
                                </span>
                              </TableCell>
                              <TableCell
                                className="max-w-[120px] truncate py-3 text-sm text-zinc-300"
                                title={item.desc}
                              >
                                {item.desc}
                              </TableCell>
                              <TableCell
                                className={`py-3 text-right text-sm font-medium ${item.montoDisplay >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                              >
                                {formatCurrency(item.montoDisplay)}
                              </TableCell>
                              <TableCell className="py-3 text-right">
                                <div className="flex justify-end gap-1">
                                  {item.tipo === 'Venta' && (
                                    <>
                                      <button
                                        onClick={() =>
                                          handleLocalViewDetailsClick(item.id)
                                        }
                                        className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-blue-400"
                                        title="Ver"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleLocalPrintClick(item.id)
                                        }
                                        className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-purple-400"
                                        title="Imprimir"
                                      >
                                        <Printer className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleLocalEliminarVenta(item.id)
                                        }
                                        className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-red-400"
                                        title="Eliminar"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </>
                                  )}
                                  {(item.tipo === 'Ingreso Manual' ||
                                    item.tipo === 'Egreso') && (
                                    <button
                                      onClick={() =>
                                        handleLocalEliminarMovimiento(
                                          item.id,
                                          item.tipo,
                                          item.desc,
                                        )
                                      }
                                      className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-red-400"
                                      title="Eliminar"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="py-8 text-center text-zinc-500"
                            >
                              Sin movimientos hoy.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                <div className="border-t border-zinc-800 bg-zinc-900/50 p-2">
                  <PaginationControls
                    currentPage={currentPageDia}
                    totalPages={totalPagesDia}
                    onPageChange={setCurrentPageDia}
                  />
                </div>
              </div>

              {/* Monthly History Table */}
              <div className="flex h-full flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 shadow-lg">
                <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/80 p-3 backdrop-blur-sm">
                  <h3 className="text-sm font-semibold text-white">
                    Historial ({nombreMesSeleccionado})
                  </h3>
                  <div className="relative w-32">
                    <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Buscar..."
                      value={searchTermMes}
                      onChange={(e) => setSearchTermMes(e.target.value)}
                      className="w-full rounded-md border border-zinc-700 bg-zinc-800 py-1 pl-7 pr-2 text-xs text-zinc-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-hidden">
                  <div className="custom-scrollbar h-full overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-zinc-900 shadow-sm">
                        <TableRow className="border-b border-zinc-800 hover:bg-transparent">
                          <TableHead
                            className="cursor-pointer text-zinc-400 hover:text-white"
                            onClick={() => requestSortMes('fecha')}
                          >
                            Fecha {getSortIcon('fecha', sortConfigMes)}
                          </TableHead>
                          <TableHead
                            className="cursor-pointer text-zinc-400 hover:text-white"
                            onClick={() => requestSortMes('tipo')}
                          >
                            Tipo {getSortIcon('tipo', sortConfigMes)}
                          </TableHead>
                          <TableHead
                            className="cursor-pointer text-zinc-400 hover:text-white"
                            onClick={() => requestSortMes('desc')}
                          >
                            Desc. {getSortIcon('desc', sortConfigMes)}
                          </TableHead>
                          <TableHead
                            className="cursor-pointer text-right text-zinc-400 hover:text-white"
                            onClick={() => requestSortMes('montoDisplay')}
                          >
                            Monto {getSortIcon('montoDisplay', sortConfigMes)}
                          </TableHead>
                          <TableHead className="text-right text-zinc-400"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedMovimientosMes.length > 0 ? (
                          paginatedMovimientosMes.map((item, idx) => (
                            <TableRow
                              key={item.id || idx}
                              className="border-b border-zinc-800/50 hover:bg-zinc-800/30"
                            >
                              <TableCell className="py-3 font-mono text-sm text-zinc-300">
                                {item.fecha}
                              </TableCell>
                              <TableCell className="py-3">
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                    item.tipo === 'Venta'
                                      ? 'bg-emerald-500/10 text-emerald-400'
                                      : item.tipo === 'Ingreso Manual'
                                        ? 'bg-blue-500/10 text-blue-400'
                                        : 'bg-red-500/10 text-red-400'
                                  }`}
                                >
                                  {item.tipo}
                                </span>
                              </TableCell>
                              <TableCell
                                className="max-w-[120px] truncate py-3 text-sm text-zinc-300"
                                title={item.desc}
                              >
                                {item.desc}
                              </TableCell>
                              <TableCell
                                className={`py-3 text-right text-sm font-medium ${item.montoDisplay >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                              >
                                {formatCurrency(item.montoDisplay)}
                              </TableCell>
                              <TableCell className="py-3 text-right">
                                <div className="flex justify-end gap-1">
                                  {item.tipo === 'Venta' && (
                                    <>
                                      <button
                                        onClick={() =>
                                          handleLocalViewDetailsClick(item.id)
                                        }
                                        className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-blue-400"
                                        title="Ver"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleLocalPrintClick(item.id)
                                        }
                                        className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-purple-400"
                                        title="Imprimir"
                                      >
                                        <Printer className="h-4 w-4" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="py-8 text-center text-zinc-500"
                            >
                              Sin movimientos.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                <div className="border-t border-zinc-800 bg-zinc-900/50 p-2">
                  <PaginationControls
                    currentPage={currentPageMes}
                    totalPages={totalPagesMes}
                    onPageChange={setCurrentPageMes}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- RIGHT COLUMN: Sidebar (Caja, Actions, Stack) (30-35%) --- */}
        <div className="custom-scrollbar flex h-full flex-col gap-6 overflow-y-auto pr-1 lg:col-span-4 xl:col-span-3">
          <motion.button
            onClick={handleCerrarCaja}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 p-4 font-bold text-white shadow-lg shadow-purple-900/20 hover:from-purple-700 hover:to-indigo-700"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Archive className="h-5 w-5" />
            Simular Cierre
          </motion.button>

          {/* Stack Components */}
          <div className="space-y-6">
            <HistorialTurnos />
            {/* Top Productos */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 shadow-lg">
              <div className="border-b border-zinc-800 p-4">
                <h3 className="text-sm font-semibold text-white">
                  Top Productos
                </h3>
              </div>
              <div className="custom-scrollbar max-h-[250px] overflow-y-auto">
                {productosMasVendidosMes.length > 0 ? (
                  <Table>
                    <TableBody>
                      {productosMasVendidosMes.map((producto, index) => (
                        <TableRow
                          key={index}
                          className="border-b border-zinc-800/50 hover:bg-zinc-800/30"
                        >
                          <TableCell className="py-3 text-sm font-medium text-white">
                            {producto.nombre}
                          </TableCell>
                          <TableCell className="py-3 text-right text-sm font-semibold text-blue-400">
                            {producto.cantidad}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-6 text-center text-sm text-zinc-500">
                    Sin datos.
                  </div>
                )}
              </div>
            </div>

            {/* Ranking Vendedores */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 shadow-lg">
              <div className="border-b border-zinc-800 p-4">
                <h3 className="text-sm font-semibold text-white">
                  Ranking Vendedores
                </h3>
              </div>
              <div className="custom-scrollbar max-h-[250px] overflow-y-auto">
                {rankingVendedoresMes.length > 0 ? (
                  <Table>
                    <TableBody>
                      {rankingVendedoresMes.map((vendedor, index) => (
                        <TableRow
                          key={index}
                          className="border-b border-zinc-800/50 hover:bg-zinc-800/30"
                        >
                          <TableCell className="py-3 text-sm font-medium text-white">
                            {vendedor.nombre}
                          </TableCell>
                          <TableCell className="py-3 text-right text-sm font-semibold text-green-400">
                            ${formatCurrency(vendedor.totalVendido)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-6 text-center text-sm text-zinc-500">
                    Sin datos.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 shadow-lg">
              <h3 className="mb-4 text-sm font-semibold text-white">
                Mapa de Calor
              </h3>
              {ventasMes.length > 0 ? (
                <div className="h-[200px] overflow-hidden">
                  <SalesHeatmap data={datosMapaDeCalor} />
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-zinc-500">
                  Sin datos.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReportesTab;
