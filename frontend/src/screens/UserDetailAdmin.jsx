// frontend/src/screens/UserDetailAdmin.jsx

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getFunctions, httpsCallable } from "firebase/functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from '../utils/helpers'; // Importamos el formateador de moneda

const functions = getFunctions();
const getUserDetails = httpsCallable(functions, 'getUserDetails');

function UserDetailAdmin() {
    const { uid } = useParams();
    const [userData, setUserData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDetails = async () => {
            if (!uid) return;
            setIsLoading(true);
            try {
                const result = await getUserDetails({ userId: uid });
                // Ordenamos los datos por fecha/timestamp al recibirlos
                const sortedData = {
                    ...result.data,
                    ventas: result.data.ventas.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
                    productos: result.data.productos.sort((a, b) => a.nombre.localeCompare(b.nombre)),
                    clientes: result.data.clientes.sort((a, b) => a.nombre.localeCompare(b.nombre)),
                };
                setUserData(sortedData);
            } catch (err) {
                console.error("Error al obtener detalles:", err);
                setError("No se pudieron cargar los detalles de este usuario.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchDetails();
    }, [uid]);

    if (isLoading) return <div className="text-center p-10">Cargando detalles del usuario...</div>;
    if (error) return <div className="text-center p-10 text-red-500">{error}</div>;

    // Email del usuario, obtenido de los datos del perfil si existen
    const userEmail = userData?.ventas?.[0]?.email || userData?.productos?.[0]?.email || 'No disponible';

    return (
        <div id="user-detail-admin" className="space-y-6">
            <Link to="/admin" className="text-blue-400 hover:underline mb-4 inline-block">&larr; Volver al Panel de Admin</Link>
            <div>
                <h2 className="text-xl sm:text-2xl font-semibold text-white">Detalles del Usuario</h2>
                <p className="text-zinc-400">Email: {userEmail} | UID: {uid}</p>
            </div>

            {/* Tabla de Ventas */}
            <div className="bg-zinc-800 p-4 sm:p-5 rounded-lg shadow-md">
                <h3 className="text-lg font-medium text-white mb-3">Ventas ({userData?.ventas.length || 0})</h3>
                <div className="overflow-x-auto max-h-96">
                    <Table>
                        <TableHeader><TableRow className="hover:bg-transparent border-b-zinc-700"><TableHead className="text-zinc-300">Fecha</TableHead><TableHead className="text-zinc-300">Cliente</TableHead><TableHead className="text-zinc-300">Items</TableHead><TableHead className="text-zinc-300 text-right">Total</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {userData?.ventas.map(venta => (
                                <TableRow key={venta.id} className="hover:bg-zinc-700/50 border-b-zinc-700">
                                    <TableCell className="text-zinc-400">{venta.fecha} {venta.hora}</TableCell>
                                    <TableCell className="text-zinc-200">{venta.clienteNombre}</TableCell>
                                    <TableCell className="text-zinc-300">{venta.items.length}</TableCell>
                                    <TableCell className="text-right text-green-400 font-semibold">{formatCurrency(venta.total)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

             {/* Tabla de Productos */}
            <div className="bg-zinc-800 p-4 sm:p-5 rounded-lg shadow-md">
                <h3 className="text-lg font-medium text-white mb-3">Productos ({userData?.productos.length || 0})</h3>
                 <div className="overflow-x-auto max-h-96">
                    <Table>
                        <TableHeader><TableRow className="hover:bg-transparent border-b-zinc-700"><TableHead className="text-zinc-300">Nombre</TableHead><TableHead className="text-zinc-300">Código</TableHead><TableHead className="text-zinc-300 text-right">Precio</TableHead><TableHead className="text-zinc-300 text-right">Stock</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {userData?.productos.map(prod => (
                                <TableRow key={prod.id} className="hover:bg-zinc-700/50 border-b-zinc-700">
                                    <TableCell className="font-medium text-zinc-100">{prod.nombre}</TableCell>
                                    <TableCell className="text-zinc-400">{prod.codigoBarras || 'N/A'}</TableCell>
                                    <TableCell className="text-right text-zinc-200">{formatCurrency(prod.precio)}</TableCell>
                                    <TableCell className="text-right font-bold">{prod.stock}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Puedes añadir más tablas para Clientes y Notas C/D siguiendo el mismo patrón */}

        </div>
    );
}

export default UserDetailAdmin;