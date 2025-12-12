import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { X, Plus, Store, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';

const SucursalesManager = ({ isOpen, onClose }) => {
  const {
    sucursales,
    handleCreateSucursal,
    handleDeleteSucursal,
    handleMigrarDatosHuérfanos,
    handleForzarRecuperacionTotal,
    handleImportarProductos,
    isLoadingData,
  } = useAppContext();
  const [isCreating, setIsCreating] = useState(false);

  // Form states
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [importarDePrincipal, setImportarDePrincipal] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    await handleCreateSucursal(nombre, direccion, importarDePrincipal);
    // Reset form and close creator view
    setNombre('');
    setDireccion('');
    setImportarDePrincipal(true);
    setIsCreating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-900 p-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-100">
            <Store className="text-blue-500" size={20} />
            Gestión de Sucursales
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          {!isCreating ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-400">Sucursales Activas</p>
                  <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-1 rounded-lg bg-blue-600/10 px-2 py-1 text-xs font-medium text-blue-400 transition-colors hover:bg-blue-600/20"
                  >
                    <Plus size={14} />
                    Nueva
                  </button>
                </div>

                <div className="space-y-2">
                  {sucursales.map((sucursal) => (
                    <div
                      key={sucursal.id}
                      className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-800/50 p-3"
                    >
                      <div>
                        <p className="font-medium text-zinc-200">
                          {sucursal.nombre}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {sucursal.direccion || 'Sin dirección'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {sucursal.esPrincipal && (
                          <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-400">
                            Principal
                          </span>
                        )}
                        {!sucursal.esPrincipal && (
                          <button
                            onClick={() => handleImportarProductos(sucursal.id)}
                            className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-blue-400/10 hover:text-blue-400"
                            title="Importar productos de Principal (Stock 0)"
                          >
                            <RefreshCw size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteSucursal(sucursal.id)}
                          className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-red-400/10 hover:text-red-400"
                          title="Eliminar sucursal"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sección de Recuperación */}
              <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-yellow-500">
                  <AlertTriangle size={16} />
                  Recuperación de Datos
                </h3>
                <p className="mb-3 text-xs text-zinc-400">
                  Si tus productos o ventas no aparecen en la sucursal actual,
                  usa esta opción para buscar datos sin asignar y traerlos aquí.
                </p>
                <button
                  onClick={handleMigrarDatosHuérfanos}
                  disabled={isLoadingData}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white disabled:opacity-50"
                >
                  <RefreshCw
                    size={16}
                    className={isLoadingData ? 'animate-spin' : ''}
                  />
                  {isLoadingData
                    ? 'Procesando...'
                    : 'Buscar y Asignar Datos Huérfanos'}
                </button>

                <div className="mt-4 border-t border-yellow-500/20 pt-4">
                  <p className="mb-2 text-xs font-bold text-red-400">
                    ¿Sigues sin ver tus datos?
                  </p>
                  <button
                    onClick={handleForzarRecuperacionTotal}
                    disabled={isLoadingData}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                  >
                    <AlertTriangle size={16} />
                    Forzar Recuperación TOTAL
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-400">
                    Nombre de la Sucursal
                  </label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                    placeholder="Ej. Sucursal Centro"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-400">
                    Dirección (Opcional)
                  </label>
                  <input
                    type="text"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                    placeholder="Ej. Av. Principal 123"
                  />
                </div>

                <div className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-800/30 p-3">
                  <input
                    type="checkbox"
                    id="importar"
                    checked={importarDePrincipal}
                    onChange={(e) => setImportarDePrincipal(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-zinc-600 bg-zinc-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-900"
                  />
                  <label
                    htmlFor="importar"
                    className="cursor-pointer text-sm text-zinc-300"
                  >
                    <span className="block font-medium text-zinc-200">
                      Importar catálogo de productos
                    </span>
                    <span className="mt-0.5 block text-xs text-zinc-500">
                      Copia todos los productos de la sucursal principal con{' '}
                      <strong>stock en cero</strong>.
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="flex-1 rounded-lg border border-zinc-700 bg-transparent px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoadingData}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoadingData ? 'Creando...' : 'Crear Sucursal'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default SucursalesManager;
