// frontend/src/components/ChatbotModal.jsx
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Bot } from 'lucide-react';
// --- AÑADIDO: Herramientas para llamar a la Cloud Function ---
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAppContext } from '../context/AppContext.jsx';
import { updateProducto } from '../services/firestoreService';

function ChatbotModal({ isOpen, onClose }) {
  const { productos = [] } = useAppContext();
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: '¡Hola! Soy Asistente Khaleesi. ¿Cómo puedo ayudarte hoy?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- MODIFICADO: La función ahora llama a Gemini ---
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { sender: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const functions = getFunctions();
      const asistenteAccion = httpsCallable(functions, 'asistenteAccion');
      const result = await asistenteAccion({
        prompt: userMessage.text,
        productos: productos.map((p) => p.nombre).slice(0, 250),
      });
      const d = result.data || {};
      if (d.accion && d.producto && d.campo && d.operacion) {
        // Propuesta de acción: la mostramos con confirmación.
        setMessages((prev) => [
          ...prev,
          { sender: 'action', accion: d, estado: 'pendiente' },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { sender: 'bot', text: d.reply || 'No entendí, probá de nuevo.' },
        ]);
      }
    } catch (error) {
      console.error('Error al llamar a la función de Gemini:', error);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: `Lo siento, hubo un error: ${error.message || 'No pude procesar tu solicitud.'}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const marcar = (idx, estado) =>
    setMessages((prev) =>
      prev.map((m, k) => (k === idx ? { ...m, estado } : m)),
    );
  const decirBot = (text) =>
    setMessages((prev) => [...prev, { sender: 'bot', text }]);

  const ejecutarAccion = async (idx, accion) => {
    const prod = productos.find(
      (p) =>
        String(p.nombre || '')
          .trim()
          .toLowerCase() === String(accion.producto || '').trim().toLowerCase(),
    );
    if (!prod) {
      marcar(idx, 'cancelado');
      decirBot('No encontré ese producto en tu lista.');
      return;
    }
    const valor = Number(accion.valor) || 0;
    let update = {};
    if (accion.campo === 'stock') {
      const cur = Number(prod.stock) || 0;
      let nuevo =
        accion.operacion === 'sumar'
          ? cur + valor
          : accion.operacion === 'restar'
            ? cur - valor
            : valor;
      if (nuevo < 0) nuevo = 0;
      update = { stock: nuevo };
    } else if (accion.campo === 'precio') {
      const cur = Number(prod.precio) || 0;
      let nuevo =
        accion.operacion === 'fijar'
          ? valor
          : accion.operacion === 'subir_pct'
            ? cur * (1 + valor / 100)
            : accion.operacion === 'bajar_pct'
              ? cur * (1 - valor / 100)
              : cur;
      update = { precio: Math.round(nuevo * 100) / 100 };
    } else {
      marcar(idx, 'cancelado');
      return;
    }
    try {
      await updateProducto(prod.id, update);
      marcar(idx, 'hecho');
      decirBot(
        accion.campo === 'stock'
          ? `Hecho ✅ ${prod.nombre} — nuevo stock: ${update.stock}`
          : `Hecho ✅ ${prod.nombre} — nuevo precio: $${update.precio}`,
      );
    } catch (e) {
      marcar(idx, 'cancelado');
      decirBot(`No se pudo aplicar: ${e?.message || 'error'}`);
    }
  };

  if (!isOpen) return null;

  return (
    // El resto de tu JSX no necesita cambios
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-end bg-black bg-opacity-60 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="flex h-[70vh] w-full max-w-md flex-col rounded-xl border border-zinc-700 bg-zinc-800 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-700 p-4">
              <div className="flex items-center gap-3">
                <Bot className="text-blue-400" />
                <h3 className="text-lg font-semibold text-white">
                  Asistente Khaleesi
                </h3>
              </div>
              <button
                onClick={onClose}
                className="text-zinc-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-grow space-y-4 overflow-y-auto p-4">
              {messages.map((msg, index) =>
                msg.sender === 'action' ? (
                  <div key={index} className="flex justify-start">
                    <div className="max-w-xs rounded-2xl rounded-bl-none border border-amber-500/40 bg-amber-500/15 p-3 md:max-w-sm">
                      <p className="text-sm text-amber-100">
                        ¿Confirmás? <strong>{msg.accion.resumen}</strong>
                      </p>
                      {msg.estado === 'pendiente' ? (
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => ejecutarAccion(index, msg.accion)}
                            className="rounded bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700"
                          >
                            Confirmar
                          </button>
                          <button
                            onClick={() => marcar(index, 'cancelado')}
                            className="rounded bg-zinc-600 px-3 py-1 text-xs font-semibold text-white hover:bg-zinc-500"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-zinc-400">
                          {msg.estado === 'hecho' ? 'Aplicado.' : 'Cancelado.'}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    key={index}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs rounded-2xl p-3 md:max-w-sm ${
                        msg.sender === 'user'
                          ? 'rounded-br-none bg-blue-600 text-white'
                          : 'rounded-bl-none bg-zinc-700 text-zinc-200'
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-sm">{msg.text}</p>
                    </div>
                  </div>
                ),
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-xs rounded-2xl rounded-bl-none bg-zinc-700 p-3 text-zinc-200 md:max-w-sm">
                    <p className="text-sm italic">
                      Asistente está escribiendo...
                    </p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="shrink-0 border-t border-zinc-700 p-4">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Escribe tu pregunta..."
                  className="w-full rounded-lg border border-zinc-600 bg-zinc-700 p-2 text-zinc-100 placeholder-zinc-400 focus:border-blue-500 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="rounded-lg bg-blue-600 p-2 text-white disabled:bg-zinc-500"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ChatbotModal;
