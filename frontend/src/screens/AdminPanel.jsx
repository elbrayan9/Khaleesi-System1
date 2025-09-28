// frontend/src/screens/AdminPanel.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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

const functions = getFunctions();
const listAllUsers = httpsCallable(functions, 'listAllUsers');
const updateUserSubscription = httpsCallable(
  functions,
  'updateUserSubscription',
);

function AdminPanel() {
  const { mostrarMensaje, confirmarAccion } = useAppContext();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const result = await listAllUsers();
      const sortedUsers = result.data.sort(
        (a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion),
      );
      setUsers(sortedUsers);
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

  const handleStatusChange = async (userId, userEmail, newStatus) => {
    const actionText = newStatus === 'active' ? 'activar' : 'desactivar';
    if (
      await confirmarAccion(
        `¿${actionText.charAt(0).toUpperCase() + actionText.slice(1)} usuario?`,
        `¿Estás seguro de que quieres ${actionText} la cuenta de ${userEmail}?`,
        'warning',
        `Sí, ${actionText}`,
      )
    ) {
      try {
        await updateUserSubscription({ userId, newStatus });
        mostrarMensaje(`Usuario ${actionText} con éxito.`, 'success');
        fetchUsers();
      } catch (err) {
        mostrarMensaje(`Error al ${actionText} el usuario.`, 'error');
        console.error(err);
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

  if (isLoading)
    return <div className="p-10 text-center">Cargando usuarios...</div>;
  if (error)
    return <div className="p-10 text-center text-red-500">{error}</div>;

  return (
    <div id="admin-panel">
      <h2 className="mb-4 text-xl font-semibold text-white sm:text-2xl">
        Panel de Administrador - Usuarios
      </h2>
      <div className="overflow-hidden rounded-lg bg-zinc-800 shadow-md">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b-zinc-700 hover:bg-transparent">
                <TableHead className="text-zinc-300">Email</TableHead>
                <TableHead className="text-zinc-300">Estado</TableHead>
                <TableHead className="text-zinc-300">Vencimiento</TableHead>
                <TableHead className="text-zinc-300">Fecha Creación</TableHead>
                <TableHead className="text-center text-zinc-300">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow
                  key={user.uid}
                  className="border-b-zinc-700 hover:bg-zinc-700/50"
                >
                  <TableCell className="font-medium text-zinc-100">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        user.datosNegocio.subscriptionStatus === 'active'
                          ? 'bg-green-500/20 text-green-400'
                          : user.datosNegocio.subscriptionStatus === 'trial'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {user.datosNegocio.subscriptionStatus}
                    </span>
                  </TableCell>
                  <TableCell className="text-zinc-300">
                    {formatDate(user.datosNegocio.subscriptionEndDate)}
                  </TableCell>
                  <TableCell className="text-zinc-400">
                    {formatDate(user.fechaCreacion)}
                  </TableCell>
                  <TableCell className="space-x-2 text-center">
                    {user.datosNegocio.subscriptionStatus !== 'active' && (
                      <button
                        onClick={() =>
                          handleStatusChange(user.uid, user.email, 'active')
                        }
                        className="text-sm text-green-400 hover:underline"
                      >
                        Activar
                      </button>
                    )}
                    {user.datosNegocio.subscriptionStatus === 'active' && (
                      <button
                        onClick={() =>
                          handleStatusChange(user.uid, user.email, 'expired')
                        }
                        className="text-sm text-red-400 hover:underline"
                      >
                        Desactivar
                      </button>
                    )}
                    <Link
                      to={`/admin/user/${user.uid}`}
                      className="text-sm text-purple-400 hover:underline"
                    >
                      Ver
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;
