// src/components/CobroMercadoPagoModal.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, ExternalLink, MessageCircle, Copy } from 'lucide-react';
import QRCode from 'qrcode';
import { useAppContext } from '../context/AppContext.jsx';
import { formatCurrency } from '../utils/helpers.js';

function CobroMercadoPagoModal({ monto, descripcion, cliente, onClose }) {
  const { sucursalActual, mostrarMensaje } = useAppContext();
  const [estado, setEstado] = useState('cargando'); // cargando | listo | error
  const [link, setLink] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let cancelado = false;
    const generar = async () => {
      setEstado('cargando');
      try {
        const { getFunctions, httpsCallable } = await import(
          'firebase/functions'
        );
        const functions = getFunctions();
        const crearPagoMP = httpsCallable(functions, 'crearPagoMP');
        const res = await crearPagoMP({
          monto,
          descripcion: descripcion || 'Venta',
          sucursalId: sucursalActual?.id || null,
        });
        const url = res.data?.initPoint || res.data?.sandboxInitPoint;
        if (!url) throw new Error('No se recibió el link de pago.');
        if (cancelado) return;
        setLink(url);
        const qr = await QRCode.toDataURL(url, { width: 260, margin: 1 });
        if (cancelado) return;
        setQrDataUrl(qr);
        setEstado('listo');
      } catch (e) {
        if (cancelado) return;
        setErrorMsg(
          e?.message || 'No se pudo generar el cobro con Mercado Pago.',
        );
        setEstado('error');
      }
    };
    generar();
    return () => {
      cancelado = true;
    };
  }, [monto, descripcion, sucursalActual]);

  const enviarWhatsapp = () => {
    let tel = String(cliente?.telefono || '').replace(/\D/g, '');
    if (tel && !tel.startsWith('54')) tel = `549${tel}`;
    const texto = `Hola! Podés pagar tu compra de $${formatCurrency(monto)} con Mercado Pago acá:\n${link}`;
    window.open(
      `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      mostrarMensaje?.('Link copiado.', 'success');
    } catch {
      mostrarMensaje?.('No se pudo copiar el link.', 'warning');
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-md rounded-lg bg-zinc-800 p-5 text-center shadow-xl"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            Cobro con Mercado Pago
          </h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-3 text-2xl font-bold text-white">
          ${formatCurrency(monto)}
        </p>

        {estado === 'cargando' && (
          <p className="py-10 text-sm text-zinc-400">Generando cobro…</p>
        )}

        {estado === 'error' && (
          <p className="py-6 text-sm text-red-400">{errorMsg}</p>
        )}

        {estado === 'listo' && (
          <>
            <div className="mx-auto mb-3 inline-block rounded-lg bg-white p-3">
              <img src={qrDataUrl} alt="QR de pago Mercado Pago" width={220} />
            </div>
            <p className="mb-3 text-xs text-zinc-400">
              El cliente escanea el QR o abre el link para pagar.
            </p>
            <div className="flex flex-col gap-2">
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700"
              >
                <ExternalLink className="h-4 w-4" /> Abrir link de pago
              </a>
              <div className="flex gap-2">
                <button
                  onClick={enviarWhatsapp}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </button>
                <button
                  onClick={copiarLink}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-zinc-600 px-4 py-2 font-semibold text-white hover:bg-zinc-500"
                >
                  <Copy className="h-4 w-4" /> Copiar
                </button>
              </div>
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              Cuando el cliente pague, registrá el cobro y confirmá la venta.
            </p>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

export default CobroMercadoPagoModal;
