import React, { useState, useEffect } from 'react';
import { Button } from './ui/button.jsx';
import { Input } from './ui/input.jsx';

function VendedorForm({ onSave, vendedorAEditar, onCancelEdit }) {
  const [nombre, setNombre] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [puedeModificarPrecios, setPuedeModificarPrecios] = useState(false);
  const [verArqueoCompleto, setVerArqueoCompleto] = useState(false);
  const [verEstadisticasCaja, setVerEstadisticasCaja] = useState(true);

  useEffect(() => {
    if (vendedorAEditar) {
      setNombre(vendedorAEditar.nombre);
      setPuedeModificarPrecios(vendedorAEditar.puedeModificarPrecios || false);
      setVerArqueoCompleto(vendedorAEditar.verArqueoCompleto || false);
      setVerEstadisticasCaja(vendedorAEditar.verEstadisticasCaja !== false);
    } else {
      setNombre('');
      setPuedeModificarPrecios(false);
      setVerArqueoCompleto(false);
      setVerEstadisticasCaja(true);
    }
  }, [vendedorAEditar]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setIsSubmitting(true);
    // El cambio clave es pasar el ID si existe
    await onSave({ nombre, puedeModificarPrecios, verArqueoCompleto, verEstadisticasCaja }, vendedorAEditar ? vendedorAEditar.id : null);
    setIsSubmitting(false);
    if (!vendedorAEditar) {
      setNombre('');
      setPuedeModificarPrecios(false);
      setVerArqueoCompleto(false);
      setVerEstadisticasCaja(true);
    }
  };
  return (
    <div className="mb-6 rounded-lg border border-zinc-700 bg-zinc-800 p-4 shadow-md">
      <h3 className="mb-4 text-lg font-medium text-white">
        {vendedorAEditar ? 'Editar Vendedor' : 'Agregar Nuevo Vendedor'}
      </h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre completo del vendedor"
            required
            className="flex-grow border-zinc-600 bg-zinc-700"
          />
        </div>
        <div className="flex flex-col gap-2 text-sm text-zinc-300 sm:flex-row">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={puedeModificarPrecios}
              onChange={(e) => setPuedeModificarPrecios(e.target.checked)}
              className="rounded bg-zinc-700 border-zinc-600"
            />
            Permitir modificar precios manuales
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={verArqueoCompleto}
              onChange={(e) => setVerArqueoCompleto(e.target.checked)}
              className="rounded bg-zinc-700 border-zinc-600"
            />
            Detalle completo en cierre de caja (Evita Arqueo Ciego)
          </label>
        </div>
        <div className="flex flex-col gap-2 text-sm text-zinc-300 sm:flex-row mt-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={verEstadisticasCaja}
              onChange={(e) => setVerEstadisticasCaja(e.target.checked)}
              className="rounded bg-zinc-700 border-zinc-600"
            />
            Permitir ver "Total en Caja" y "Ventas del Día" en Reportes
          </label>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? 'Guardando...'
              : vendedorAEditar
                ? 'Actualizar'
                : 'Agregar'}
          </Button>
          {vendedorAEditar && (
            <Button type="button" variant="outline" onClick={onCancelEdit}>
              Cancelar
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
export default VendedorForm;
