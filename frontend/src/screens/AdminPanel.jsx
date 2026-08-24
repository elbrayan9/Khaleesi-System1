// frontend/src/screens/AdminPanel.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { motion } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import {
  forceAssignAllDataToSucursal,
  getSucursales,
} from '../services/firestoreService';
const functions = getFunctions();
const listAllUsers = httpsCallable(functions, 'listAllUsers');
const updateUserSubscription = httpsCallable(
  functions,
  'updateUserSubscription',
);

function AdminPanel() {
  const { mostrarMensaje, confirmarAccion, datosNegocio, handleGuardarDatosNegocio } = useAppContext();
  const [nuevoPin, setNuevoPin] = useState('');
  const [isSavingPin, setIsSavingPin] = useState(false);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const result = await listAllUsers();
      const sortedUsers = result.data.sort(
        (a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion),
      );
      setUsers(sortedUsers);
      setFilteredUsers(sortedUsers);
    } catch (err) {
      console.error('Error al obtener usuarios:', err);
      setError(
        'No se pudo cargar la lista de usuarios. Asegúrate de tener permisos de administrador.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const results = users.filter((user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    setFilteredUsers(results);
    setCurrentPage(1);
  }, [searchTerm, users]);

  const handleStatusChange = async (userId, userEmail, newStatus) => {
    let actionText = '';
    if (newStatus === 'active') actionText = 'activar';
    else if (newStatus === 'trial') actionText = 'poner en prueba';
    else actionText = 'desactivar/vencer';

    if (
      await confirmarAccion(
        'Cambiar Estado',
        `¿Estás seguro de que quieres cambiar el estado de ${userEmail} a ${newStatus.toUpperCase()}?`,
        'warning',
        'Sí, Cambiar',
      )
    ) {
      try {
        await updateUserSubscription({ userId, newStatus });
        mostrarMensaje('Estado actualizado con éxito.', 'success');
        fetchUsers();
      } catch (err) {
        mostrarMensaje('Error al actualizar el estado.', 'error');
        console.error(err);
      }
    }
  };

  const handlePlanChange = async (userId, userEmail, newPlan) => {
    if (
      await confirmarAccion(
        '¿Cambiar Plan?',
        `¿Estás seguro de que quieres cambiar el plan de ${userEmail} a ${newPlan.toUpperCase()}?`,
        'warning',
        'Sí, Cambiar Plan',
      )
    ) {
      try {
        await updateUserSubscription({ userId, plan: newPlan });
        mostrarMensaje('Plan actualizado con éxito.', 'success');
        fetchUsers();
      } catch (err) {
        mostrarMensaje('Error al actualizar el plan.', 'error');
        console.error(err);
      }
    }
  };

  const handleRepairData = async (userId, userEmail) => {
    if (
      await confirmarAccion(
        '¿Reparar Datos?',
        `Esto asignará FORZOSAMENTE todos los datos de ${userEmail} a su Sucursal Principal. Úsalo solo si el usuario no ve sus ventas antiguas.`,
        'warning',
        'Sí, Reparar',
      )
    ) {
      try {
        mostrarMensaje('Iniciando reparación...', 'info');
        // 1. Obtener sucursales del usuario
        const sucursales = await getSucursales(userId);
        const sucursalPrincipal =
          sucursales.find((s) => s.esPrincipal) || sucursales[0];

        if (!sucursalPrincipal) {
          mostrarMensaje(
            'El usuario no tiene sucursales. No se puede reparar.',
            'error',
          );
          return;
        }

        // 2. Ejecutar migración forzada para colecciones clave
        const colecciones = [
          'ventas',
          'productos',
          'clientes',
          'proveedores',
          'vendedores',
          'egresos',
          'ingresos_manuales',
          'notas_cd',
          'pedidos',
          'presupuestos',
          'turnos',
        ];

        let totalMigrados = 0;
        for (const coll of colecciones) {
          const count = await forceAssignAllDataToSucursal(
            userId,
            sucursalPrincipal.id,
            coll,
          );
          totalMigrados += count;
        }

        mostrarMensaje(
          `Reparación completada. Se actualizaron ${totalMigrados} documentos.`,
          'success',
        );
      } catch (err) {
        console.error(err);
        mostrarMensaje('Error durante la reparación.', 'error');
      }
    }
  };

  const handleSavePin = async () => {
    if (nuevoPin.length < 4) {
      mostrarMensaje('El PIN debe tener al menos 4 caracteres.', 'error');
      return;
    }
    setIsSavingPin(true);
    try {
      await handleGuardarDatosNegocio({
        ...datosNegocio,
        pinSeguridad: nuevoPin,
      });
      mostrarMensaje('PIN de seguridad activado con éxito.', 'success');
      setNuevoPin('');
    } catch (err) {
      mostrarMensaje('Error al guardar el PIN.', 'error');
    }
    setIsSavingPin(false);
  };

  const handleRemovePin = async () => {
    if (await confirmarAccion('¿Desactivar PIN?', 'Esto permitirá acceso libre a tu Panel.', 'warning', 'Sí, Desactivar')) {
      setIsSavingPin(true);
      try {
        await handleGuardarDatosNegocio({
          ...datosNegocio,
          pinSeguridad: null,
        });
        mostrarMensaje('PIN de seguridad desactivado.', 'success');
      } catch (err) {
        mostrarMensaje('Error al quitar el PIN.', 'error');
      }
      setIsSavingPin(false);
    }
  };

  const handleManageClientPin = async (userId, userEmail, currentPin = null) => {
    const { value: newPin } = await Swal.fire({
      title: `PIN de ${userEmail}`,
      input: 'text',
      inputValue: currentPin || '',
      inputLabel: currentPin 
        ? `Puedes ver el PIN actual arriba. Edítalo para cambiarlo, o déjalo vacío para desactivar la seguridad.` 
        : 'Asignar PIN de bloqueo a este cliente (Ej: 1234):',
      inputPlaceholder: 'Escribe el PIN aquí...',
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      background: '#1f2937',
      color: '#f9fafb',
    });

    if (newPin !== undefined) {
      setIsLoading(true);
      try {
        const { doc, setDoc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../firebaseConfig');
        
        // 1. Guardar en Global
        await setDoc(doc(db, 'datosNegocio', userId), { pinSeguridad: newPin || null }, { merge: true });
        
        // 2. Propagar a todas las sucursales (para que aplique inmediatamente al entrar al POS)
        const sucursales = await getSucursales(userId);
        for (const s of sucursales) {
          const sucursalRef = doc(db, 'sucursales', s.id);
          const snap = await getDoc(sucursalRef);
          if (snap.exists()) {
            const data = snap.data();
            const updatedConfig = { ...(data.configuracion || {}), pinSeguridad: newPin || null };
            if (!newPin) delete updatedConfig.pinSeguridad;
            await setDoc(sucursalRef, { configuracion: updatedConfig }, { merge: true });
          }
        }

        mostrarMensaje('PIN actualizado correctamente para ' + userEmail, 'success');
        fetchUsers();
      } catch (err) {
        mostrarMensaje('Error al cambiar PIN al cliente.', 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // --- FUNCIÓN CORREGIDA ---
  const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    // Si es un objeto de Firestore con segundos (formato de la Cloud Function)
    if (dateValue && typeof dateValue === 'object' && dateValue._seconds) {
      return new Date(dateValue._seconds * 1000).toLocaleDateString('es-AR');
    }
    // Si ya es un objeto Date o un string/número válido
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return 'Fecha inválida';
    }
    return date.toLocaleDateString('es-AR');
  };

  // Stats Calculation
  const totalUsers = users.length;
  const activeUsers = users.filter(
    (u) => u.datosNegocio.subscriptionStatus === 'active',
  ).length;
  const trialUsers = users.filter(
    (u) => u.datosNegocio.subscriptionStatus === 'trial',
  ).length;
  const expiredUsers = users.filter(
    (u) =>
      u.datosNegocio.subscriptionStatus !== 'active' &&
      u.datosNegocio.subscriptionStatus !== 'trial',
  ).length;

  // --- Cuánto factura el mes ---
  // Precios de lista; deben coincidir con PLANES_PRECIO en functions/index.js.
  const PRECIO_LISTA = { basic: 20000, premium: 35000 };

  // Lo que se le cobra a UN cliente: su precio congelado si lo tiene vigente,
  // si no el de lista. Es el mismo criterio que usa crearPagoSuscripcion.
  const cuotaDe = (u) => {
    const plan = u.datosNegocio?.plan === 'premium' ? 'premium' : 'basic';
    const legacy = u.datosNegocio?.precioLegacy?.[plan];
    if (legacy?.mensual > 0) {
      const hasta = u.datosNegocio?.precioLegacyHasta;
      const fin = hasta?.toDate
        ? hasta.toDate()
        : hasta
          ? new Date(hasta)
          : null;
      if (!fin || fin.getTime() > Date.now()) return Number(legacy.mensual);
    }
    return PRECIO_LISTA[plan];
  };

  // Facturación mensual: solo los que pagan hoy (los de prueba todavía no).
  const facturacionMensual = users
    .filter((u) => u.datosNegocio?.subscriptionStatus === 'active')
    .reduce((total, u) => total + cuotaDe(u), 0);

  // --- Quién está por caerse ---
  const diasHasta = (valor) => {
    if (!valor) return null;
    const d = valor?.toDate ? valor.toDate() : new Date(valor);
    if (isNaN(d.getTime())) return null;
    return Math.ceil((d.getTime() - Date.now()) / 86400000);
  };

  // Pruebas que se terminan dentro de la semana: son los que hay que llamar
  // antes de que se vayan.
  const pruebasPorVencer = users.filter((u) => {
    if (u.datosNegocio?.subscriptionStatus !== 'trial') return false;
    const d = diasHasta(u.datosNegocio?.subscriptionEndDate);
    return d !== null && d >= 0 && d <= 7;
  }).length;

  const diasSinEntrar = (u) => {
    const d = diasHasta(u.ultimoLogin);
    return d === null ? null : Math.abs(d);
  };

  // Paga pero hace más de 14 días que no entra: baja probable.
  const enRiesgo = users.filter((u) => {
    if (u.datosNegocio?.subscriptionStatus !== 'active') return false;
    const d = diasSinEntrar(u);
    return d !== null && d > 14;
  }).length;

  const pesos = (n) =>
    '$' + Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 });

  // --- Orden por urgencia ---
  // Lo que necesita atención va arriba: primero las pruebas que vencen, después
  // los que pagan pero no entran, después los vencidos, y al final el resto.
  const urgencia = (u) => {
    const estado = u.datosNegocio?.subscriptionStatus;
    if (estado === 'trial') {
      const d = diasHasta(u.datosNegocio?.subscriptionEndDate);
      if (d !== null && d >= 0 && d <= 7) return 0;
    }
    if (estado === 'active' && (diasSinEntrar(u) ?? 0) > 14) return 1;
    if (estado !== 'active' && estado !== 'trial') return 2;
    if (estado === 'trial') return 3;
    return 4;
  };

  // Pagination Logic
  const usuariosOrdenados = [...filteredUsers].sort((a, b) => {
    const dif = urgencia(a) - urgencia(b);
    if (dif !== 0) return dif;
    // Dentro del mismo grupo, los más nuevos primero.
    return new Date(b.fechaCreacion) - new Date(a.fechaCreacion);
  });
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = usuariosOrdenados.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (isLoading)
    return <div className="p-10 text-center">Cargando usuarios...</div>;
  if (error)
    return <div className="p-10 text-center text-red-500">{error}</div>;

  return (
    <div id="admin-panel" className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="rounded-md bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600"
          >
            &larr; Volver al Dashboard
          </Link>
          <h2 className="text-xl font-semibold text-white sm:text-2xl">
            Panel de Administrador
          </h2>
        </div>
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Buscar por email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Security settings for Device */}
      <div className="rounded-lg bg-zinc-800 p-6 shadow-md border border-zinc-700">
        <h3 className="text-lg font-bold text-white mb-2">Seguridad del Panel Administrador</h3>
        <p className="text-sm text-zinc-400 mb-4">
          Configura un PIN para bloquear tu sesión de Administrador en este navegador.
        </p>
        
        {datosNegocio?.pinSeguridad ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-2 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                PIN de Seguridad Activado
              </span>
              <button
                onClick={handleRemovePin}
                disabled={isSavingPin}
                className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-md text-sm font-medium transition-colors"
              >
                Desactivar PIN
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="w-full sm:w-1/3">
                <label className="block text-xs font-medium text-zinc-400 mb-1">Nuevo PIN Numérico</label>
                <input
                  type="password"
                  placeholder="Ej: 1234"
                  value={nuevoPin}
                  onChange={(e) => setNuevoPin(e.target.value)}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <button
                onClick={handleSavePin}
                disabled={isSavingPin || !nuevoPin}
                className="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50"
              >
                Proteger con PIN
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lo que mueve la aguja: plata arriba, y a quién hay que llamar */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-zinc-800 p-5 shadow-md lg:col-span-1">
          <p className="text-sm font-medium text-emerald-300">
            Facturación del mes
          </p>
          <p className="mt-1 text-4xl font-bold tabular-nums text-white">
            {pesos(facturacionMensual)}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {activeUsers} {activeUsers === 1 ? 'cuenta paga' : 'cuentas pagas'} ·
            respeta precios congelados
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          <div
            className={`rounded-xl border p-4 shadow-md ${
              pruebasPorVencer > 0
                ? 'border-amber-500/40 bg-amber-500/10'
                : 'border-zinc-700 bg-zinc-800'
            }`}
          >
            <p className="text-sm text-zinc-300">Pruebas que vencen</p>
            <p
              className={`text-3xl font-bold tabular-nums ${
                pruebasPorVencer > 0 ? 'text-amber-300' : 'text-zinc-500'
              }`}
            >
              {pruebasPorVencer}
            </p>
            <p className="text-xs text-zinc-500">en los próximos 7 días</p>
          </div>

          <div
            className={`rounded-xl border p-4 shadow-md ${
              enRiesgo > 0
                ? 'border-rose-500/40 bg-rose-500/10'
                : 'border-zinc-700 bg-zinc-800'
            }`}
          >
            <p className="text-sm text-zinc-300">Pagan y no entran</p>
            <p
              className={`text-3xl font-bold tabular-nums ${
                enRiesgo > 0 ? 'text-rose-300' : 'text-zinc-500'
              }`}
            >
              {enRiesgo}
            </p>
            <p className="text-xs text-zinc-500">hace más de 14 días</p>
          </div>

          <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-4 shadow-md">
            <p className="text-sm text-zinc-300">En prueba</p>
            <p className="text-3xl font-bold tabular-nums text-sky-300">
              {trialUsers}
            </p>
            <p className="text-xs text-zinc-500">de {totalUsers} cuentas</p>
          </div>

          <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-4 shadow-md">
            <p className="text-sm text-zinc-300">Vencidas</p>
            <p className="text-3xl font-bold tabular-nums text-zinc-400">
              {expiredUsers}
            </p>
            <p className="text-xs text-zinc-500">para recuperar</p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg bg-zinc-800 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-700 px-4 py-2.5">
          <p className="text-xs text-zinc-400">
            Ordenado por lo que necesita atención: primero las pruebas por
            vencer, después quienes pagan y no entran, y luego los vencidos.
          </p>
          <p className="text-xs text-zinc-500">
            {filteredUsers.length}{' '}
            {filteredUsers.length === 1 ? 'cuenta' : 'cuentas'}
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b-zinc-700 hover:bg-transparent">
                <TableHead className="text-zinc-300">Email</TableHead>
                <TableHead className="text-zinc-300">Plan</TableHead>
                <TableHead className="text-zinc-300">Estado</TableHead>
                <TableHead className="text-zinc-300">Vencimiento</TableHead>
                <TableHead className="text-zinc-300">Última conexión</TableHead>
                <TableHead className="text-zinc-300">Fecha Creación</TableHead>
                <TableHead className="text-center text-zinc-300">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentUsers.map((user) => (
                <TableRow
                  key={user.uid}
                  className="border-b-zinc-700 hover:bg-zinc-700/50"
                >
                  <TableCell className="font-medium text-zinc-100">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <select
                      value={user.datosNegocio.plan || 'basic'}
                      onChange={(e) =>
                        handlePlanChange(user.uid, user.email, e.target.value)
                      }
                      className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="basic">Básico</option>
                      <option value="premium">Premium</option>
                    </select>
                  </TableCell>
                  <TableCell>
                    <select
                      value={user.datosNegocio.subscriptionStatus}
                      onChange={(e) =>
                        handleStatusChange(user.uid, user.email, e.target.value)
                      }
                      className={`rounded border px-2 py-1 text-xs font-semibold focus:outline-none ${
                        user.datosNegocio.subscriptionStatus === 'active'
                          ? 'border-green-500/30 bg-green-500/20 text-green-400'
                          : user.datosNegocio.subscriptionStatus === 'trial'
                            ? 'border-blue-500/30 bg-blue-500/20 text-blue-400'
                            : 'border-red-500/30 bg-red-500/20 text-red-400'
                      }`}
                    >
                      <option value="active" className="bg-zinc-800 text-white">
                        Activo
                      </option>
                      <option value="trial" className="bg-zinc-800 text-white">
                        En Prueba
                      </option>
                      <option
                        value="expired"
                        className="bg-zinc-800 text-white"
                      >
                        Vencido
                      </option>
                    </select>
                  </TableCell>
                  <TableCell className="text-zinc-300">
                    {(() => {
                      const d = diasHasta(user.datosNegocio.subscriptionEndDate);
                      const texto = formatDate(
                        user.datosNegocio.subscriptionEndDate,
                      );
                      if (d === null) return texto;
                      if (d < 0)
                        return (
                          <span className="text-rose-400">
                            {texto}{' '}
                            <span className="text-xs">
                              (venció hace {Math.abs(d)} d)
                            </span>
                          </span>
                        );
                      if (d <= 7)
                        return (
                          <span className="font-semibold text-amber-300">
                            {texto}{' '}
                            <span className="text-xs">
                              ({d === 0 ? 'hoy' : `en ${d} d`})
                            </span>
                          </span>
                        );
                      return texto;
                    })()}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const d = diasSinEntrar(user);
                      if (d === null)
                        return <span className="text-zinc-600">nunca</span>;
                      const color =
                        d > 14
                          ? 'text-rose-400 font-semibold'
                          : d > 7
                            ? 'text-amber-300'
                            : 'text-zinc-300';
                      return (
                        <span className={color}>
                          {d === 0
                            ? 'hoy'
                            : d === 1
                              ? 'ayer'
                              : `hace ${d} días`}
                        </span>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-zinc-400">
                    {formatDate(user.fechaCreacion)}
                  </TableCell>
                  <TableCell className="space-x-2 text-center whitespace-nowrap">
                    <Link
                      to={`/admin/user/${user.uid}`}
                      className="text-sm text-purple-400 hover:underline"
                    >
                      Ver
                    </Link>
                    <button
                      onClick={() => handleRepairData(user.uid, user.email)}
                      className="text-sm text-orange-400 hover:underline border-l border-zinc-700 pl-2"
                    >
                      Reparar
                    </button>
                    <button
                      onClick={() => handleManageClientPin(user.uid, user.email, user.datosNegocio?.pinSeguridad)}
                      className="text-sm text-blue-400 hover:underline border-l border-zinc-700 pl-2"
                      title={user.datosNegocio?.pinSeguridad ? 'PIN Activado (Cambiar)' : 'Poner PIN'}
                    >
                      {user.datosNegocio?.pinSeguridad ? '🔒 PIN' : '🔑 PIN'}
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-700 px-4 py-3 sm:px-6">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center rounded-md border border-zinc-600 px-4 py-2 text-sm font-medium ${
                  currentPage === 1
                    ? 'bg-zinc-800 text-zinc-500'
                    : 'bg-zinc-700 text-white hover:bg-zinc-600'
                }`}
              >
                Anterior
              </button>
              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`relative ml-3 inline-flex items-center rounded-md border border-zinc-600 px-4 py-2 text-sm font-medium ${
                  currentPage === totalPages
                    ? 'bg-zinc-800 text-zinc-500'
                    : 'bg-zinc-700 text-white hover:bg-zinc-600'
                }`}
              >
                Siguiente
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-zinc-400">
                  Mostrando{' '}
                  <span className="font-medium">{indexOfFirstItem + 1}</span> a{' '}
                  <span className="font-medium">
                    {Math.min(indexOfLastItem, filteredUsers.length)}
                  </span>{' '}
                  de <span className="font-medium">{filteredUsers.length}</span>{' '}
                  resultados
                </p>
              </div>
              <div>
                <nav
                  className="isolate inline-flex -space-x-px rounded-md shadow-sm"
                  aria-label="Pagination"
                >
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-zinc-400 ring-1 ring-inset ring-zinc-700 hover:bg-zinc-700 focus:z-20 focus:outline-offset-0 ${
                      currentPage === 1 ? 'cursor-not-allowed opacity-50' : ''
                    }`}
                  >
                    <span className="sr-only">Anterior</span>
                    &larr;
                  </button>
                  {[...Array(totalPages)].map((_, index) => (
                    <button
                      key={index}
                      onClick={() => paginate(index + 1)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-zinc-700 focus:z-20 focus:outline-offset-0 ${
                        currentPage === index + 1
                          ? 'bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                          : 'text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-zinc-400 ring-1 ring-inset ring-zinc-700 hover:bg-zinc-700 focus:z-20 focus:outline-offset-0 ${
                      currentPage === totalPages
                        ? 'cursor-not-allowed opacity-50'
                        : ''
                    }`}
                  >
                    <span className="sr-only">Siguiente</span>
                    &rarr;
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { withPinProtection } from '../components/withPinProtection';
export default withPinProtection(AdminPanel);
