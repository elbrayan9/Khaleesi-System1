// src/components/ImpresoraTermicaConfig.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Printer,
  CheckCircle2,
  AlertTriangle,
  Bluetooth,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useAppContext } from '../context/AppContext.jsx';
import {
  isWebUsbSupported,
  isAutoPrintEnabled,
  setAutoPrintEnabled,
  getPairedPrinter,
  requestPrinter,
  printTestPage,
} from '../services/thermalPrinterService';
import {
  soportaBluetooth,
  conectarImpresora,
  imprimirPrueba,
} from '../services/bluetoothPrinter';

function ImpresoraTermicaConfig() {
  const { datosNegocio } = useAppContext();
  const supported = isWebUsbSupported();

  const [connected, setConnected] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [autoPrint, setAutoPrint] = useState(isAutoPrintEnabled());
  const [busy, setBusy] = useState(false);

  // Bluetooth (para celular).
  const btSupported = soportaBluetooth();
  const [btConnected, setBtConnected] = useState(false);
  const [usarBt, setUsarBt] = useState(
    () => localStorage.getItem('impresoraMetodo') === 'bluetooth',
  );

  const handleBtConectar = async () => {
    setBusy(true);
    try {
      await conectarImpresora();
      setBtConnected(true);
      Swal.fire({
        icon: 'success',
        title: 'Impresora Bluetooth vinculada',
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      if (error?.name !== 'NotFoundError') {
        Swal.fire('Error', error.message || 'No se pudo vincular.', 'error');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleBtPrueba = async () => {
    setBusy(true);
    try {
      await imprimirPrueba();
    } catch (error) {
      Swal.fire('Error', error.message || 'No se pudo imprimir.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleMetodo = (checked) => {
    setUsarBt(checked);
    localStorage.setItem('impresoraMetodo', checked ? 'bluetooth' : 'usb');
  };

  // Reconectar la impresora ya autorizada al cargar.
  useEffect(() => {
    if (!supported) return;
    getPairedPrinter()
      .then((device) => {
        if (device) {
          setConnected(true);
          setDeviceName(device.productName || 'Impresora térmica');
        }
      })
      .catch(() => {});
  }, [supported]);

  const handleConectar = async () => {
    setBusy(true);
    try {
      const device = await requestPrinter();
      setConnected(true);
      setDeviceName(device.productName || 'Impresora térmica');
      Swal.fire({
        icon: 'success',
        title: 'Impresora vinculada',
        text: device.productName || 'Lista para imprimir.',
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      // El usuario puede cancelar el diálogo (NotFoundError); no es un error real.
      if (error?.name !== 'NotFoundError') {
        Swal.fire('Error', error.message || 'No se pudo vincular.', 'error');
      }
    } finally {
      setBusy(false);
    }
  };

  const handlePrueba = async () => {
    setBusy(true);
    try {
      await printTestPage(datosNegocio);
    } catch (error) {
      Swal.fire('Error', error.message || 'No se pudo imprimir.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleAuto = (checked) => {
    setAutoPrint(checked);
    setAutoPrintEnabled(checked);
  };

  return (
    <>
      <h3 className="mb-4 mt-6 flex items-center gap-2 text-lg font-medium text-white sm:text-xl">
        <Printer className="h-5 w-5 text-blue-400" />
        Impresora térmica (ticket 58mm)
      </h3>

      {!supported ? (
        <div className="flex items-start gap-2 rounded-md bg-yellow-900/40 p-3 text-sm text-yellow-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            Este navegador no soporta impresión directa por USB. Usá{' '}
            <strong>Chrome</strong> o <strong>Edge</strong> de escritorio.
          </span>
        </div>
      ) : (
        <div className="space-y-3 rounded-md bg-zinc-700/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-100">Estado</p>
              {connected ? (
                <p className="flex items-center gap-1 text-xs text-green-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Vinculada: {deviceName}
                </p>
              ) : (
                <p className="text-xs text-zinc-400">
                  Sin impresora vinculada.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <motion.button
                onClick={handleConectar}
                disabled={busy}
                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                whileTap={{ scale: 0.97 }}
              >
                {connected ? 'Cambiar' : 'Conectar'}
              </motion.button>
              {connected && (
                <motion.button
                  onClick={handlePrueba}
                  disabled={busy}
                  className="rounded-md bg-zinc-600 px-3 py-2 text-sm font-bold text-zinc-100 hover:bg-zinc-500 disabled:opacity-50"
                  whileTap={{ scale: 0.97 }}
                >
                  Prueba
                </motion.button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-zinc-600 pt-3">
            <div>
              <label
                htmlFor="toggle-autoprint"
                className="font-medium text-zinc-100"
              >
                Imprimir ticket automáticamente
              </label>
              <p className="text-xs text-zinc-400">
                Al confirmar cada venta, sale el ticket solo.
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                id="toggle-autoprint"
                checked={autoPrint}
                onChange={(e) => handleToggleAuto(e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-zinc-600 after:absolute after:left-[2px] after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:ring-2 peer-focus:ring-blue-500"></div>
            </label>
          </div>
        </div>
      )}

      {/* IMPRESORA BLUETOOTH (celular) */}
      <h3 className="mb-3 mt-6 flex items-center gap-2 text-lg font-medium text-white sm:text-xl">
        <Bluetooth className="h-5 w-5 text-blue-400" />
        Impresora Bluetooth (celular)
      </h3>

      {!btSupported ? (
        <div className="flex items-start gap-2 rounded-md bg-yellow-900/40 p-3 text-sm text-yellow-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            Este navegador no soporta Bluetooth. Usá <strong>Chrome</strong> o{' '}
            <strong>Edge</strong> (en Android o PC).
          </span>
        </div>
      ) : (
        <div className="space-y-3 rounded-md bg-zinc-700/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-100">Estado</p>
              {btConnected ? (
                <p className="flex items-center gap-1 text-xs text-green-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Impresora Bluetooth vinculada
                </p>
              ) : (
                <p className="text-xs text-zinc-400">Sin vincular.</p>
              )}
            </div>
            <div className="flex gap-2">
              <motion.button
                onClick={handleBtConectar}
                disabled={busy}
                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                whileTap={{ scale: 0.97 }}
              >
                {btConnected ? 'Cambiar' : 'Conectar'}
              </motion.button>
              {btConnected && (
                <motion.button
                  onClick={handleBtPrueba}
                  disabled={busy}
                  className="rounded-md bg-zinc-600 px-3 py-2 text-sm font-bold text-zinc-100 hover:bg-zinc-500 disabled:opacity-50"
                  whileTap={{ scale: 0.97 }}
                >
                  Prueba
                </motion.button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-zinc-600 pt-3">
            <div>
              <label
                htmlFor="toggle-metodo-bt"
                className="font-medium text-zinc-100"
              >
                Usar Bluetooth para imprimir
              </label>
              <p className="text-xs text-zinc-400">
                En vez de USB. Ideal para celular o tablet.
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                id="toggle-metodo-bt"
                checked={usarBt}
                onChange={(e) => handleToggleMetodo(e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-zinc-600 after:absolute after:left-[2px] after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:ring-2 peer-focus:ring-blue-500"></div>
            </label>
          </div>
        </div>
      )}
    </>
  );
}

export default ImpresoraTermicaConfig;
