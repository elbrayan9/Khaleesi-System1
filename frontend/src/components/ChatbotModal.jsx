// frontend/src/components/ChatbotModal.jsx
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Bot } from 'lucide-react';
// --- AÑADIDO: Herramientas para llamar a la Cloud Function ---
import { getFunctions, httpsCallable } from 'firebase/functions';

function ChatbotModal({ isOpen, onClose }) {
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
      // 1. Preparamos la conexión a nuestra Cloud Function
      const functions = getFunctions();
      const askGemini = httpsCallable(functions, 'askGemini');

      // 2. Llamamos a la función con el texto del usuario
      const result = await askGemini({ prompt: userMessage.text });

      // 3. Obtenemos la respuesta y la añadimos a la conversación
      const botResponse = result.data.reply;
      setMessages((prev) => [...prev, { sender: 'bot', text: botResponse }]);
    } catch (error) {
      console.error('Error al llamar a la función de Gemini:', error);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: 'Lo siento, no pude procesar tu solicitud en este momento.',
        },
      ]);
    } finally {
      setIsLoading(false);
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
              {messages.map((msg, index) => (
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
                    <p className="text-sm">{msg.text}</p>
                  </div>
                </div>
              ))}
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
