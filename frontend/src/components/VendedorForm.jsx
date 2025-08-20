import React, { useState, useEffect } from 'react';
import { Button } from './ui/button.jsx';
import { Input } from './ui/input.jsx';

function VendedorForm({ onSave, vendedorAEditar, onCancelEdit }) {
    const [nombre, setNombre] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (vendedorAEditar) {
            setNombre(vendedorAEditar.nombre);
        } else {
            setNombre('');
        }
    }, [vendedorAEditar]);

const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setIsSubmitting(true);
    // El cambio clave es pasar el ID si existe
    await onSave({ nombre }, vendedorAEditar ? vendedorAEditar.id : null);
    setIsSubmitting(false);
    if (!vendedorAEditar) {
         setNombre('');
    }
};
    return (
        <div className="bg-zinc-800 p-4 rounded-lg shadow-md mb-6 border border-zinc-700">
            <h3 className="text-lg font-medium text-white mb-4">{vendedorAEditar ? 'Editar Vendedor' : 'Agregar Nuevo Vendedor'}</h3>
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
                <Input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Nombre completo del vendedor"
                    required
                    className="bg-zinc-700 border-zinc-600"
                />
                <div className="flex gap-2">
                    <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : (vendedorAEditar ? 'Actualizar' : 'Agregar')}</Button>
                    {vendedorAEditar && <Button type="button" variant="outline" onClick={onCancelEdit}>Cancelar</Button>}
                </div>
            </form>
        </div>
    );
}
export default VendedorForm;