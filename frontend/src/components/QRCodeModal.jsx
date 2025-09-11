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
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
      <div className="bg-zinc-800 p-6 rounded-lg text-center border border-zinc-700">
        <h3 className="text-xl font-bold text-white mb-2">{product.nombre}</h3>
        <p className="text-zinc-400 mb-4">Código QR para precio dinámico</p>
        <div ref={qrCodeRef} className="bg-white p-4 rounded-md inline-block">
          <QRCodeSVG value={productUrl} size={256} />
        </div>
        <div className="mt-6 flex justify-center gap-4">
          <button onClick={handlePrint} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-md">
            <FiPrinter /> Imprimir
          </button>
          <button onClick={onClose} className="bg-zinc-600 hover:bg-zinc-500 text-white font-bold py-2 px-4 rounded-md">
            <FiX /> Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;