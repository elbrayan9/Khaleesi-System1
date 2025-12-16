import React, { useState, useRef, useEffect } from 'react';
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

function ReceiptTypeSelect({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedType =
    RECEIPT_TYPES.find((t) => t.value === value) || RECEIPT_TYPES[0];

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
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
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
        <div className="absolute z-50 mt-1 w-max min-w-full max-w-[300px] rounded-md border border-zinc-600 bg-zinc-800 shadow-lg">
          {RECEIPT_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => handleSelect(type.value)}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-zinc-200 first:rounded-t-md last:rounded-b-md hover:bg-zinc-700"
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
