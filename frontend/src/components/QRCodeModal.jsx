// frontend/src/components/QRCodeModal.jsx
import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { FiX, FiPrinter } from 'react-icons/fi';

const QRCodeModal = ({ product, onClose }) => {
  const qrCodeRef = useRef(null);
  const productUrl = `${window.location.origin}/product/${product.id}`;

  const handlePrint = () => {
    const svgElement = qrCodeRef.current.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head><title>Código QR - ${product.nombre}</title></head>
        <body style="text-align: center; margin-top: 50px; font-family: sans-serif;">
          <h2>${product.nombre}</h2>
          <p>Escanear para ver precio actualizado</p>
          <div style="display: inline-block; border: 1px solid #ccc; padding: 20px;">
            ${svgData}
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-6 text-center">
        <h3 className="mb-2 text-xl font-bold text-white">{product.nombre}</h3>
        <p className="mb-4 text-zinc-400">Código QR para precio dinámico</p>
        <div ref={qrCodeRef} className="inline-block rounded-md bg-white p-4">
          <QRCodeSVG value={productUrl} size={256} />
        </div>
        <div className="mt-6 flex justify-center gap-4">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-md bg-cyan-600 px-4 py-2 font-bold text-white hover:bg-cyan-500"
          >
            <FiPrinter /> Imprimir
          </button>
          <button
            onClick={onClose}
            className="rounded-md bg-zinc-600 px-4 py-2 font-bold text-white hover:bg-zinc-500"
          >
            <FiX /> Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;
