// frontend/src/screens/UserDetailAdmin.jsx

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '../utils/helpers'; // Importamos el formateador de moneda

const functions = getFunctions();
const getUserDetails = httpsCallable(functions, 'getUserDetails');

function UserDetailAdmin() {
  const { uid } = useParams();
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    const fetchDetails = async () => {
      if (!uid) return;
      setIsLoading(true);
      try {
        const result = await getUserDetails({ userId: uid });
        // Ordenamos los datos por fecha/timestamp al recibirlos
        const sortedData = {
          ...result.data,
          ventas: result.data.ventas.sort(
            (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
          ),
          productos: result.data.productos.sort((a, b) =>
            a.nombre.localeCompare(b.nombre),
          ),
          clientes: result.data.clientes.sort((a, b) =>
            a.nombre.localeCompare(b.nombre),
          ),
          // Asumiendo que notasCD viene en la respuesta, si no, habría que manejarlo
          notasCD: result.data.notasCD
            ? result.data.notasCD.sort(
                (a, b) => new Date(b.fecha) - new Date(a.fecha),
              )
            : [],
        };
        setUserData(sortedData);
      } catch (err) {
        console.error('Error al obtener detalles:', err);
        setError('No se pudieron cargar los detalles de este usuario.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [uid]);

  if (isLoading)
    return (
      <div className="p-10 text-center">Cargando detalles del usuario...</div>
    );
  if (error)
    return <div className="p-10 text-center text-red-500">{error}</div>;

  // Email del usuario, obtenido de los datos del perfil si existen
  const userEmail =
    userData?.ventas?.[0]?.email ||
    userData?.productos?.[0]?.email ||
    'No disponible';

  // Stats Calculation
  const totalVentas = userData?.ventas?.length || 0;
  const totalProductos = userData?.productos?.length || 0;
  const totalClientes = userData?.clientes?.length || 0;
  const totalNotas = userData?.notasCD?.length || 0;
  const totalIngresos = userData?.ventas?.reduce(
    (acc, curr) => acc + curr.total,
    0,
  );

  return (
    <div id="user-detail-admin" className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-4">
            <Link
              to="/admin"
              className="rounded-md bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600"
            >
              &larr; Volver
            </Link>
            <h2 className="text-xl font-semibold text-white sm:text-2xl">
              Detalle del Usuario
            </h2>
          </div>
          <p className="text-zinc-400">
            Email: {userEmail} | UID: {uid}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-zinc-800 p-4 shadow-md">
          <p className="text-sm text-zinc-400">Total Ventas</p>
          <p className="text-2xl font-bold text-white">{totalVentas}</p>
          <p className="text-xs text-zinc-500">
            {formatCurrency(totalIngresos)}
          </p>
        </div>
        <div className="rounded-lg bg-zinc-800 p-4 shadow-md">
          <p className="text-sm text-zinc-400">Productos</p>
          <p className="text-2xl font-bold text-blue-400">{totalProductos}</p>
        </div>
        <div className="rounded-lg bg-zinc-800 p-4 shadow-md">
          <p className="text-sm text-zinc-400">Clientes</p>
          <p className="text-2xl font-bold text-green-400">{totalClientes}</p>
        </div>
        <div className="rounded-lg bg-zinc-800 p-4 shadow-md">
          <p className="text-sm text-zinc-400">Notas C/D</p>
          <p className="text-2xl font-bold text-purple-400">{totalNotas}</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-zinc-700">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {['general', 'ventas', 'productos', 'clientes', 'notas'].map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-500'
                    : 'border-transparent text-zinc-400 hover:border-zinc-300 hover:text-zinc-300'
                } whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium capitalize`}
              >
                {tab}
              </button>
            ),
          )}
        </nav>
      </div>

      {/* Tabs Content */}
      <div className="mt-4">
        {activeTab === 'general' && (
          <div className="rounded-lg bg-zinc-800 p-6 shadow-md">
            <h3 className="mb-4 text-lg font-medium text-white">
              Información General
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-zinc-400">UID</p>
                <p className="text-white">{uid}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-400">Email (Detectado)</p>
                <p className="text-white">{userEmail}</p>
              </div>
              {/* Aquí se podrían agregar más datos si vinieran del backend */}
            </div>
          </div>
        )}

        {activeTab === 'ventas' && (
          <div className="rounded-lg bg-zinc-800 p-4 shadow-md sm:p-5">
            <h3 className="mb-3 text-lg font-medium text-white">
              Historial de Ventas
            </h3>
            <div className="max-h-96 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-zinc-700 hover:bg-transparent">
                    <TableHead className="text-zinc-300">Fecha</TableHead>
                    <TableHead className="text-zinc-300">Cliente</TableHead>
                    <TableHead className="text-zinc-300">Items</TableHead>
                    <TableHead className="text-right text-zinc-300">
                      Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userData?.ventas.map((venta) => (
                    <TableRow
                      key={venta.id}
                      className="border-b-zinc-700 hover:bg-zinc-700/50"
                    >
                      <TableCell className="text-zinc-400">
                        {venta.fecha} {venta.hora}
                      </TableCell>
                      <TableCell className="text-zinc-200">
                        {venta.clienteNombre}
                      </TableCell>
                      <TableCell className="text-zinc-300">
                        {venta.items.length}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-400">
                        {formatCurrency(venta.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {userData?.ventas.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-zinc-500"
                      >
                        No hay ventas registradas.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {activeTab === 'productos' && (
          <div className="rounded-lg bg-zinc-800 p-4 shadow-md sm:p-5">
            <h3 className="mb-3 text-lg font-medium text-white">
              Catálogo de Productos
            </h3>
            <div className="max-h-96 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-zinc-700 hover:bg-transparent">
                    <TableHead className="text-zinc-300">Nombre</TableHead>
                    <TableHead className="text-zinc-300">Código</TableHead>
                    <TableHead className="text-right text-zinc-300">
                      Precio
                    </TableHead>
                    <TableHead className="text-right text-zinc-300">
                      Stock
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userData?.productos.map((prod) => (
                    <TableRow
                      key={prod.id}
                      className="border-b-zinc-700 hover:bg-zinc-700/50"
                    >
                      <TableCell className="font-medium text-zinc-100">
                        {prod.nombre}
                      </TableCell>
                      <TableCell className="text-zinc-400">
                        {prod.codigoBarras || 'N/A'}
                      </TableCell>
                      <TableCell className="text-right text-zinc-200">
                        {formatCurrency(prod.precio)}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {prod.stock}
                      </TableCell>
                    </TableRow>
                  ))}
                  {userData?.productos.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-zinc-500"
                      >
                        No hay productos registrados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {activeTab === 'clientes' && (
          <div className="rounded-lg bg-zinc-800 p-4 shadow-md sm:p-5">
            <h3 className="mb-3 text-lg font-medium text-white">
              Lista de Clientes
            </h3>
            <div className="max-h-96 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-zinc-700 hover:bg-transparent">
                    <TableHead className="text-zinc-300">Nombre</TableHead>
                    <TableHead className="text-zinc-300">Documento</TableHead>
                    <TableHead className="text-zinc-300">Teléfono</TableHead>
                    <TableHead className="text-zinc-300">Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userData?.clientes.map((cliente) => (
                    <TableRow
                      key={cliente.id}
                      className="border-b-zinc-700 hover:bg-zinc-700/50"
                    >
                      <TableCell className="font-medium text-zinc-100">
                        {cliente.nombre}
                      </TableCell>
                      <TableCell className="text-zinc-400">
                        {cliente.documento || 'N/A'}
                      </TableCell>
                      <TableCell className="text-zinc-400">
                        {cliente.telefono || 'N/A'}
                      </TableCell>
                      <TableCell className="text-zinc-400">
                        {cliente.email || 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {userData?.clientes.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-zinc-500"
                      >
                        No hay clientes registrados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {activeTab === 'notas' && (
          <div className="rounded-lg bg-zinc-800 p-4 shadow-md sm:p-5">
            <h3 className="mb-3 text-lg font-medium text-white">
              Notas de Crédito / Débito
            </h3>
            <div className="max-h-96 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-zinc-700 hover:bg-transparent">
                    <TableHead className="text-zinc-300">Fecha</TableHead>
                    <TableHead className="text-zinc-300">Tipo</TableHead>
                    <TableHead className="text-zinc-300">Cliente</TableHead>
                    <TableHead className="text-right text-zinc-300">
                      Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userData?.notasCD.map((nota) => (
                    <TableRow
                      key={nota.id}
                      className="border-b-zinc-700 hover:bg-zinc-700/50"
                    >
                      <TableCell className="text-zinc-400">
                        {nota.fecha}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${
                            nota.tipo === 'Credito'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-blue-500/20 text-blue-400'
                          }`}
                        >
                          {nota.tipo}
                        </span>
                      </TableCell>
                      <TableCell className="text-zinc-200">
                        {nota.clienteNombre}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-zinc-100">
                        {formatCurrency(nota.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {userData?.notasCD.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-zinc-500"
                      >
                        No hay notas registradas.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserDetailAdmin;
