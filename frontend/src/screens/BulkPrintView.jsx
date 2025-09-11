// frontend/src/screens/BulkPrintView.jsx
import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';

const BulkPrintView = () => {
  const [products, setProducts] = useState([]);
  const [options, setOptions] = useState({ includeQR: true, includeBarcode: true });

  useEffect(() => {
    const productsData = sessionStorage.getItem('productsToPrint');
    const optionsData = sessionStorage.getItem('printOptions');

    if (productsData) {
      setProducts(JSON.parse(productsData));
    }
    if (optionsData) {
      setOptions(JSON.parse(optionsData));
    }
    
    // La impresión se activa solo si hay datos
    if (productsData) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, []);

  if (products.length === 0) {
    return <div>Cargando productos para imprimir o no se seleccionaron productos.</div>;
  }

  return (
    <div className="p-4">
      <style type="text/css" media="print">
        {`
          @page { size: auto; margin: 10mm; }
          body { margin: 0; }
          .label-container { 
            page-break-inside: avoid;
            border: 1px dashed #ccc;
            padding: 10px;
            margin-bottom: 10px;
            text-align: center;
          }
          .print-button { display: none; }
        `}
      </style>
      <button onClick={() => window.print()} className="print-button fixed top-4 right-4 bg-cyan-600 text-white p-2 rounded">
        Imprimir
      </button>
      {products.map(p => {
        const productUrl = `${window.location.origin}/product/${p.id}`;
        return (
          <div key={p.id} className="label-container">
            <h3 className="font-bold text-lg">{p.nombre}</h3>
            
            {/* --- LÓGICA CONDICIONAL --- */}
            {options.includeBarcode && p.codigoBarras && (
              <Barcode value={p.codigoBarras} height={50} fontSize={12} />
            )}
            
            {options.includeQR && (
              <div className="mt-2">
                <QRCodeSVG value={productUrl} size={100} />
              </div>
            )}
            {/* ------------------------- */}

          </div>
        );
      })}
    </div>
  );
};

export default BulkPrintView;