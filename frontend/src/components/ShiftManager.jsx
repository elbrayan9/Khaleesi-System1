// frontend/src/components/ShiftManager.jsx
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { getOpenShift } from '../services/firestoreService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { formatCurrency } from '../utils/helpers';
import { PlayCircle, StopCircle, Loader2 } from 'lucide-react';

// --- MODAL PARA ABRIR TURNO ---
const OpenShiftModal = ({ isOpen, onClose, onConfirm }) => {
    const [montoInicial, setMontoInicial] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onConfirm(montoInicial);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-800 p-6 rounded-lg w-full max-w-sm">
                <h3 className="text-lg font-bold text-white mb-4">Iniciar Turno</h3>
                <form onSubmit={handleSubmit}>
                    <Label htmlFor="monto-inicial">Monto Inicial en Caja ($)</Label>
                    <Input
                        id="monto-inicial"
                        type="number"
                        value={montoInicial}
                        onChange={(e) => setMontoInicial(e.target.value)}
                        placeholder="Ej: 5000"
                        className="my-2 text-center text-lg"
                        required
                    />
                    <Button type="submit" className="w-full mt-4 bg-green-600 hover:bg-green-700">Confirmar e Iniciar</Button>
                    <Button type="button" variant="ghost" onClick={onClose} className="w-full mt-2">Cancelar</Button>
                </form>
            </motion.div>
        </div>
    );
};

// --- MODAL PARA CERRAR TURNO (POR AHORA SIMPLE, LUEGO LO MEJORAMOS) ---
const CloseShiftModal = ({ isOpen, onClose, onConfirm, turnoActivo, ventas }) => {
    const turnoVentas = ventas.filter(v => turnoActivo?.ventasIds?.includes(v.id));
    const totalVentasTurno = turnoVentas.reduce((sum, v) => sum + v.total, 0);
    const totalEsperado = (turnoActivo?.montoInicial || 0) + totalVentasTurno;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-800 p-6 rounded-lg w-full max-w-sm">
                <h3 className="text-lg font-bold text-white mb-4">Resumen y Cierre de Turno</h3>
                <div className="space-y-2 text-zinc-300">
                    <div className="flex justify-between"><span>Vendedor:</span> <span className="font-bold text-white">{turnoActivo.vendedorNombre}</span></div>
                    <div className="flex justify-between"><span>Monto Inicial:</span> <span>{formatCurrency(turnoActivo.montoInicial)}</span></div>
                    <div className="flex justify-between"><span>Ventas del Turno:</span> <span>{formatCurrency(totalVentasTurno)}</span></div>
                    <div className="flex justify-between font-bold text-lg border-t border-zinc-600 pt-2 mt-2"><span>Total Esperado en Caja:</span> <span className="text-cyan-400">{formatCurrency(totalEsperado)}</span></div>
                </div>
                 <Button onClick={() => onConfirm({ totalVentas: totalVentasTurno, totalFinal: totalEsperado })} className="w-full mt-6 bg-red-600 hover:bg-red-700">Confirmar y Cerrar Turno</Button>
                 <Button type="button" variant="ghost" onClick={onClose} className="w-full mt-2">Cancelar</Button>
            </motion.div>
        </div>
    );
};


// --- COMPONENTE PRINCIPAL DEL MANAGER ---
const ShiftManager = () => {
    const { 
        vendedorActivoId, 
        currentUserId, 
        turnoActivo, 
        setTurnoActivo, 
        handleAbrirTurno, 
        handleCerrarTurno,
        ventas
    } = useAppContext();
    
    const [isLoading, setIsLoading] = useState(true);
    const [openModal, setOpenModal] = useState(false);
    const [closeModal, setCloseModal] = useState(false);

    useEffect(() => {
        const checkForOpenShift = async () => {
            if (vendedorActivoId && currentUserId) {
                setIsLoading(true);
                const openShiftSnap = await getOpenShift(currentUserId, vendedorActivoId);
                if (!openShiftSnap.empty) {
                    const shiftDoc = openShiftSnap.docs[0];
                    setTurnoActivo({ id: shiftDoc.id, ...shiftDoc.data() });
                } else {
                    setTurnoActivo(null);
                }
                setIsLoading(false);
            } else {
                setTurnoActivo(null);
                setIsLoading(false);
            }
        };
        checkForOpenShift();
    }, [vendedorActivoId, currentUserId, setTurnoActivo]);

    if (!vendedorActivoId) {
        return <div className="bg-zinc-800 text-center p-3 rounded-md text-sm text-zinc-400 border border-zinc-700">Selecciona un vendedor para gestionar el turno.</div>;
    }

    if (isLoading) {
        return <div className="bg-zinc-800 text-center p-3 rounded-md text-sm text-zinc-400 border border-zinc-700"><Loader2 className="animate-spin inline-block mr-2" /> Verificando turno...</div>;
    }

    return (
        <div className="bg-zinc-800 p-3 rounded-md border border-zinc-700">
            {turnoActivo ? (
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-sm text-green-400 font-bold">Turno Abierto</p>
                        <p className="text-xs text-zinc-300">Iniciado a las {turnoActivo.horaApertura}</p>
                    </div>
                    <Button variant="destructive" onClick={() => setCloseModal(true)}>
                        <StopCircle className="mr-2 h-4 w-4"/>
                        Cerrar Turno
                    </Button>
                </div>
            ) : (
                <div className="flex justify-between items-center">
                    <p className="text-sm text-zinc-400">No hay un turno activo.</p>
                    <Button className="bg-green-600 hover:bg-green-700" onClick={() => setOpenModal(true)}>
                        <PlayCircle className="mr-2 h-4 w-4"/>
                        Abrir Turno
                    </Button>
                </div>
            )}

            <OpenShiftModal 
                isOpen={openModal} 
                onClose={() => setOpenModal(false)}
                onConfirm={(monto) => {
                    handleAbrirTurno(vendedorActivoId, monto);
                    setOpenModal(false);
                }}
            />
            <CloseShiftModal
                isOpen={closeModal}
                onClose={() => setCloseModal(false)}
                onConfirm={(datosCierre) => {
                    handleCerrarTurno(datosCierre);
                    setCloseModal(false);
                }}
                turnoActivo={turnoActivo}
                ventas={ventas}
            />
        </div>
    );
};

export default ShiftManager;