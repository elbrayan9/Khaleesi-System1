import React, { useState, useRef, useEffect } from 'react';
import {
  Banknote,
  CreditCard,
  Landmark,
  QrCode,
  Smartphone,
  ChevronDown,
} from 'lucide-react';

const PAYMENT_METHODS = [
  {
    value: 'efectivo',
    label: 'Efectivo',
    icon: Banknote,
    color: 'text-green-500',
  },
  {
    value: 'tarjeta',
    label: 'Tarjeta',
    icon: CreditCard,
    color: 'text-blue-500',
  },
  {
    value: 'transferencia',
    label: 'Transferencia',
    icon: Landmark,
    color: 'text-purple-500',
  },
  {
    value: 'qr_banco',
    label: 'QR Banco',
    icon: QrCode,
    color: 'text-orange-500',
  },
  {
    value: 'qr_billetera',
    label: 'QR Billetera',
    icon: Smartphone,
    color: 'text-pink-500',
  },
];

function PaymentMethodSelect({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedMethod =
    PAYMENT_METHODS.find((m) => m.value === value) || PAYMENT_METHODS[0];

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

  const handleSelect = (methodValue) => {
    onChange(methodValue);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-md border border-zinc-600 bg-zinc-700 p-2 text-left text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <div className="flex items-center gap-2">
          <selectedMethod.icon className={`h-5 w-5 ${selectedMethod.color}`} />
          <span>{selectedMethod.label}</span>
        </div>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-zinc-600 bg-zinc-800 shadow-lg">
          {PAYMENT_METHODS.map((method) => (
            <button
              key={method.value}
              type="button"
              onClick={() => handleSelect(method.value)}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-zinc-200 first:rounded-t-md last:rounded-b-md hover:bg-zinc-700"
            >
              <method.icon className={`h-5 w-5 ${method.color}`} />
              <span>{method.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default PaymentMethodSelect;
