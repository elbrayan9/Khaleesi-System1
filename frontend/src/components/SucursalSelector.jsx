import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Store, ChevronDown, PlusCircle, Check } from 'lucide-react';
import SucursalesManager from './SucursalesManager';

const SucursalSelector = () => {
  const { sucursales, sucursalActual, handleChangeSucursal } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!sucursalActual) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
      >
        <Store size={16} className="text-blue-400" />
        <span className="max-w-[150px] truncate">{sucursalActual.nombre}</span>
        <ChevronDown
          size={14}
          className={`text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 z-50 mt-2 w-64 origin-top-left rounded-xl border border-zinc-700 bg-zinc-800 p-1 shadow-xl ring-1 ring-black/5">
          <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Cambiar Sucursal
          </div>

          <div className="mb-1 max-h-60 space-y-0.5 overflow-y-auto">
            {sucursales.map((sucursal) => (
              <button
                key={sucursal.id}
                onClick={() => {
                  handleChangeSucursal(sucursal.id);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm transition-colors ${
                  sucursalActual.id === sucursal.id
                    ? 'bg-blue-600/10 text-blue-400'
                    : 'text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100'
                }`}
              >
                <div className="flex flex-col items-start overflow-hidden">
                  <span className="truncate font-medium">
                    {sucursal.nombre}
                  </span>
                  {sucursal.esPrincipal && (
                    <span className="text-[10px] text-zinc-500">Principal</span>
                  )}
                </div>
                {sucursalActual.id === sucursal.id && <Check size={14} />}
              </button>
            ))}
          </div>

          <div className="mt-1 border-t border-zinc-700 pt-1">
            <button
              onClick={() => {
                setShowManager(true);
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-600/10"
            >
              <PlusCircle size={16} />
              Gestionar Sucursales
            </button>
          </div>
        </div>
      )}

      <SucursalesManager
        isOpen={showManager}
        onClose={() => setShowManager(false)}
      />
    </div>
  );
};

export default SucursalSelector;
