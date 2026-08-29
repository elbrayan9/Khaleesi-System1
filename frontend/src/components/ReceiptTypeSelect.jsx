import React, { useState, useRef, useEffect } from 'react';
import useDesplegableTeclado from '../hooks/useDesplegableTeclado.js';
import { FileText, ChevronDown, ScrollText } from 'lucide-react';

const RECEIPT_TYPES = [
  {
    value: 'B',
    label: 'Factura B (Consumidor Final)',
    icon: FileText,
    color: 'text-blue-400',
  },
  {
    value: 'A',
    label: 'Factura A (Resp. Inscripto)',
    icon: FileText,
    color: 'text-purple-400',
  },
  {
    value: 'C',
    label: 'Factura C (Monotributo)',
    icon: FileText,
    color: 'text-green-400',
  },
  {
    value: 'X',
    label: 'Ticket X (Presupuesto)',
    icon: ScrollText,
    color: 'text-yellow-500',
  },
];

function ReceiptTypeSelect({
  value,
  onChange,
  condicionEmisor,
  canAccessAfip,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = contenedorRef;

  // Solo mostramos los comprobantes que el emisor PUEDE emitir según su
  // condición: Monotributo/Exento -> C; Responsable Inscripto -> A/B.
  const cond = (condicionEmisor || '').toLowerCase();
  let permitidos = ['A', 'B', 'C', 'X'];
  if (cond.includes('inscripto')) permitidos = ['A', 'B', 'X'];
  else if (cond.includes('monotributo') || cond.includes('exento'))
    permitidos = ['C', 'X'];
  // Sin facturación electrónica (plan Básico): solo Ticket X.
  if (!canAccessAfip) permitidos = ['X'];
  const tipos = RECEIPT_TYPES.filter((t) => permitidos.includes(t.value));

  const indiceActual = Math.max(
    0,
    tipos.findIndex((t) => t.value === value),
  );
  const selectedType = tipos[indiceActual];

  const {
    marcado,
    setMarcado,
    contenedorRef,
    triggerRef,
    alTeclear,
    alPerderFoco,
  } = useDesplegableTeclado({
    abierto: isOpen,
    setAbierto: setIsOpen,
    cantidad: tipos.length,
    indiceActual,
    alElegir: (i) => onChange(tipos[i].value),
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (typeValue) => {
    onChange(typeValue);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef} onBlur={alPerderFoco}>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={alTeclear}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Comprobante: ${selectedType.label}`}
        className="flex w-full items-center justify-between rounded-md border border-zinc-600 bg-zinc-700 p-2 text-left text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <selectedType.icon
            className={`h-5 w-5 shrink-0 ${selectedType.color}`}
          />
          <span className="truncate text-sm">{selectedType.label}</span>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Tipos de comprobante"
          className="absolute z-50 mt-1 w-max min-w-full max-w-[300px] rounded-md border border-zinc-600 bg-zinc-800 shadow-lg"
        >
          {tipos.map((type, i) => (
            <button
              key={type.value}
              type="button"
              role="option"
              aria-selected={i === marcado}
              tabIndex={-1}
              onClick={() => handleSelect(type.value)}
              onMouseEnter={() => setMarcado(i)}
              className={
                'flex w-full items-center gap-2 px-4 py-2 text-left text-zinc-200 first:rounded-t-md last:rounded-b-md hover:bg-zinc-700 ' +
                (i === marcado ? 'bg-zinc-700' : '')
              }
            >
              <type.icon className={`h-5 w-5 shrink-0 ${type.color}`} />
              <span className="text-sm">{type.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ReceiptTypeSelect;
