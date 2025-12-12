// src/components/ConfiguracionTab.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '../context/AppContext.jsx';
import {
  Save,
  Download,
  Settings,
  Database,
  Trash2,
  CreditCard,
} from 'lucide-react';
import ImportDataTab from './ImportDataTab';
import Swal from 'sweetalert2';
import { getFunctions, httpsCallable } from 'firebase/functions';

function ConfiguracionTab() {
  const {
    datosNegocio,
    handleGuardarDatosNegocio,
    handleBackupData,
    isLoading,
    currentUser,
    canAccessAfip, // Importar permiso
    canAccessDailyReport,
    isPremium,
    isAdmin,
    plan,
  } = useAppContext();

  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'import' | 'subscription'

  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [cuit, setCuit] = useState('');
  const [ventaRapidaHabilitada, setVentaRapidaHabilitada] = useState(false);
  const [umbralStockBajo, setUmbralStockBajo] = useState(10);
  const [recibirReporteDiario, setRecibirReporteDiario] = useState(false);

  const [afipCert, setAfipCert] = useState('');
  const [afipKey, setAfipKey] = useState('');
  const [puntoVenta, setPuntoVenta] = useState(1);

  useEffect(() => {
    if (datosNegocio) {
      setNombre(datosNegocio.nombre || '');
      setDireccion(datosNegocio.direccion || '');
      setCuit(datosNegocio.cuit || '');
      setVentaRapidaHabilitada(datosNegocio.habilitarVentaRapida || false);
      setUmbralStockBajo(datosNegocio.umbralStockBajo || 10);
      setRecibirReporteDiario(datosNegocio.recibirReporteDiario || false);
      // Cargar certificados si existen (no mostramos el contenido por seguridad, solo indicamos si hay)
      setAfipCert(datosNegocio.afipCert || '');
      setAfipKey(datosNegocio.afipKey || '');
      setPuntoVenta(datosNegocio.puntoVenta || 1);
    }
  }, [datosNegocio]);

  const handleFileUpload = (e, setFunction) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFunction(event.target.result);
      };
      reader.readAsText(file);
    }
  };

  const handleLocalGuardar = () => {
    const updatedData = {
      nombre: nombre.trim(),
      direccion: direccion.trim(),
      cuit: cuit.trim(),
      habilitarVentaRapida: ventaRapidaHabilitada,
      umbralStockBajo: Number(umbralStockBajo) || 0,
      recibirReporteDiario: recibirReporteDiario,
      email: currentUser?.email || datosNegocio?.email || '',
      afipCert: afipCert, // Guardamos el contenido del certificado
      afipKey: afipKey, // Guardamos el contenido de la clave
      puntoVenta: Number(puntoVenta) || 1,
    };
    handleGuardarDatosNegocio(updatedData);
  };

  return (
    <div id="configuracion" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold text-white sm:text-2xl">
          Configuración
        </h2>

        {/* Tab Navigation */}
        <div className="flex space-x-2 rounded-lg bg-zinc-800 p-1">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'general'
                ? 'bg-zinc-700 text-white shadow'
                : 'text-zinc-400 hover:bg-zinc-700/50 hover:text-white'
            }`}
          >
            <Settings size={16} />
            General
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'import'
                ? 'bg-zinc-700 text-white shadow'
                : 'text-zinc-400 hover:bg-zinc-700/50 hover:text-white'
            }`}
          >
            <Database size={16} />
            Importar Datos
          </button>
          <button
            onClick={() => setActiveTab('subscription')}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'subscription'
                ? 'bg-zinc-700 text-white shadow'
                : 'text-zinc-400 hover:bg-zinc-700/50 hover:text-white'
            }`}
          >
            <CreditCard size={16} />
            Suscripción
          </button>
        </div>
      </div>

      {activeTab === 'subscription' ? (
        <div className="mx-auto max-w-2xl space-y-6">
          {isAdmin && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-yellow-200">
              <div className="flex items-center gap-3">
                <Settings className="h-6 w-6" />
                <div>
                  <h3 className="font-bold">Modo Super Admin Activo</h3>
                  <p className="text-sm">
                    Tienes acceso total a todas las funcionalidades del sistema,
                    independientemente del plan asignado al negocio.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {/* Plan Básico */}
            <div
              className={`relative overflow-hidden rounded-xl border p-6 transition-all ${
                plan === 'basic'
                  ? 'border-blue-500 bg-zinc-800 shadow-lg shadow-blue-500/10'
                  : 'border-zinc-700 bg-zinc-800/50 opacity-75 hover:opacity-100'
              }`}
            >
              {plan === 'basic' && (
                <div className="absolute right-0 top-0 rounded-bl-lg bg-blue-500 px-3 py-1 text-xs font-bold text-white">
                  ACTUAL
                </div>
              )}
              <h3 className="mb-2 text-xl font-bold text-white">Plan Básico</h3>
              <p className="mb-4 text-3xl font-bold text-white">
                $15.000
                <span className="text-sm font-normal text-zinc-400">/mes</span>
              </p>
              <ul className="mb-6 space-y-3 text-sm text-zinc-300">
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> Control de Stock
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> Ventas y Caja
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> Gestión de Clientes
                </li>
                <li className="flex items-center gap-2 text-zinc-500">
                  <span className="text-zinc-600">✕</span> Facturación AFIP
                </li>
                <li className="flex items-center gap-2 text-zinc-500">
                  <span className="text-zinc-600">✕</span> Reportes Avanzados
                </li>
              </ul>
              {plan !== 'basic' && (
                <button
                  onClick={() => {
                    const message = encodeURIComponent(
                      `Hola, me comunico desde mi cuenta de Khaleesi System (${
                        currentUser?.email || datosNegocio?.email
                      }). Quisiera solicitar el cambio de mi suscripción al Plan Básico.`,
                    );
                    window.open(
                      `https://wa.me/5493541215803?text=${message}`,
                      '_blank',
                    );
                  }}
                  className="w-full rounded-lg border border-zinc-600 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-700"
                >
                  Solicitar Cambio a Básico
                </button>
              )}
            </div>

            {/* Plan Premium */}
            <div
              className={`relative overflow-hidden rounded-xl border p-6 transition-all ${
                plan === 'premium'
                  ? 'border-purple-500 bg-zinc-800 shadow-lg shadow-purple-500/10'
                  : 'border-zinc-700 bg-zinc-800/50 opacity-75 hover:opacity-100'
              }`}
            >
              {plan === 'premium' && (
                <div className="absolute right-0 top-0 rounded-bl-lg bg-purple-500 px-3 py-1 text-xs font-bold text-white">
                  ACTUAL
                </div>
              )}
              <h3 className="mb-2 text-xl font-bold text-white">
                Plan Completo
              </h3>
              <p className="mb-4 text-3xl font-bold text-white">
                $30.000
                <span className="text-sm font-normal text-zinc-400">/mes</span>
              </p>
              <ul className="mb-6 space-y-3 text-sm text-zinc-300">
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> Todo lo del Básico
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-400">✓</span> Facturación AFIP
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-400">✓</span> Reportes por Email
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-400">✓</span> Múltiples
                  Sucursales
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-400">✓</span> Soporte Prioritario
                </li>
              </ul>
              {plan !== 'premium' && (
                <button
                  onClick={() => {
                    const message = encodeURIComponent(
                      `Hola, me comunico desde mi cuenta de Khaleesi System (${
                        currentUser?.email || datosNegocio?.email
                      }). Me gustaría solicitar un upgrade al Plan Premium para acceder a todas las funcionalidades.`,
                    );
                    window.open(
                      `https://wa.me/5493541215803?text=${message}`,
                      '_blank',
                    );
                  }}
                  className="w-full rounded-lg bg-purple-600 py-2 text-sm font-semibold text-white hover:bg-purple-700"
                >
                  Solicitar Plan Premium
                </button>
              )}
            </div>
          </div>
        </div>
      ) : activeTab === 'general' ? (
        <div className="mx-auto max-w-xl rounded-lg bg-zinc-800 p-4 shadow-md sm:p-6">
          <h3 className="mb-5 border-b border-zinc-700 pb-2 text-lg font-medium text-white sm:text-xl">
            Datos del Negocio
          </h3>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="config-nombre-form"
                className="mb-1 block text-sm font-medium text-zinc-300"
              >
                Nombre:
              </label>
              <input
                type="text"
                id="config-nombre-form"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full rounded-md border border-zinc-600 bg-zinc-700 p-2 text-zinc-100"
              />
            </div>
            <div>
              <label
                htmlFor="config-direccion-form"
                className="mb-1 block text-sm font-medium text-zinc-300"
              >
                Dirección:
              </label>
              <input
                type="text"
                id="config-direccion-form"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                className="w-full rounded-md border border-zinc-600 bg-zinc-700 p-2 text-zinc-100"
              />
            </div>
            <div>
              <label
                htmlFor="config-cuit-form"
                className="mb-1 block text-sm font-medium text-zinc-300"
              >
                CUIT:
              </label>
              <input
                type="text"
                id="config-cuit-form"
                value={cuit}
                onChange={(e) => setCuit(e.target.value)}
                className="w-full rounded-md border border-zinc-600 bg-zinc-700 p-2 text-zinc-100"
              />
            </div>
            <div className="sm:col-span-1">
              <label
                htmlFor="umbral-stock-bajo"
                className="block text-sm font-medium text-zinc-300"
              >
                Umbral de stock bajo
              </label>
              <input
                type="number"
                name="umbralStockBajo"
                id="umbral-stock-bajo"
                value={umbralStockBajo}
                onChange={(e) => setUmbralStockBajo(e.target.value)}
                placeholder="Ej: 5"
                className="mt-1 block w-full rounded-md border border-zinc-600 bg-zinc-700 p-2 text-zinc-100 placeholder-zinc-400 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-zinc-400">
                Recibirás alertas cuando el stock sea igual o menor a este
                número.
              </p>
            </div>
          </div>

          <hr className="my-6 border-zinc-700" />

          {/* SECCIÓN DE CERTIFICADOS AFIP */}
          <h3 className="mb-4 mt-6 text-lg font-medium text-white sm:text-xl">
            Configuración AFIP (Facturación Electrónica)
          </h3>

          {!canAccessAfip ? (
            <div className="rounded-md border border-blue-500/30 bg-blue-500/10 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                  <Settings size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-white">Función Premium</h4>
                  <p className="text-sm text-zinc-300">
                    La facturación electrónica está disponible en el Plan
                    Completo. Actualiza tu plan para habilitar esta función.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 rounded-md bg-zinc-700/50 p-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">
                  Certificado Digital (.crt)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".crt"
                    onChange={(e) => handleFileUpload(e, setAfipCert)}
                    className="block w-full text-sm text-zinc-400 file:mr-4 file:rounded-md file:border-0 file:bg-zinc-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-zinc-500"
                  />
                  {afipCert && (
                    <span className="text-green-500">✓ Cargado</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  Sube tu archivo .crt generado en AFIP.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">
                  Certificado Digital (.crt)
                </label>
                <div className="flex items-center gap-2">
                  {afipCert ? (
                    <div className="flex w-full items-center justify-between rounded-md border border-zinc-600 bg-zinc-700/50 p-2">
                      <span className="flex items-center gap-2 text-sm text-green-400">
                        ✓ Certificado Cargado
                      </span>
                      <button
                        onClick={() => setAfipCert('')}
                        className="rounded p-1 text-zinc-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
                        title="Eliminar certificado"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ) : (
                    <input
                      type="file"
                      accept=".crt"
                      onChange={(e) => handleFileUpload(e, setAfipCert)}
                      className="block w-full text-sm text-zinc-400 file:mr-4 file:rounded-md file:border-0 file:bg-zinc-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-zinc-500"
                    />
                  )}
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {afipCert
                    ? 'Para cambiarlo, elimínalo primero.'
                    : 'Sube tu archivo .crt generado en AFIP.'}
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">
                  Clave Privada (.key)
                </label>
                <div className="flex items-center gap-2">
                  {afipKey ? (
                    <div className="flex w-full items-center justify-between rounded-md border border-zinc-600 bg-zinc-700/50 p-2">
                      <span className="flex items-center gap-2 text-sm text-green-400">
                        ✓ Clave Cargada
                      </span>
                      <button
                        onClick={() => setAfipKey('')}
                        className="rounded p-1 text-zinc-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
                        title="Eliminar clave"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ) : (
                    <input
                      type="file"
                      accept=".key"
                      onChange={(e) => handleFileUpload(e, setAfipKey)}
                      className="block w-full text-sm text-zinc-400 file:mr-4 file:rounded-md file:border-0 file:bg-zinc-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-zinc-500"
                    />
                  )}
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {afipKey
                    ? 'Para cambiarla, elimínala primero.'
                    : 'Sube tu archivo .key generado con OpenSSL.'}
                </p>
              </div>

              <div>
                <label
                  htmlFor="config-pto-vta"
                  className="mb-1 block text-sm font-medium text-zinc-300"
                >
                  Punto de Venta AFIP
                </label>
                <input
                  type="number"
                  id="config-pto-vta"
                  value={puntoVenta}
                  onChange={(e) => setPuntoVenta(e.target.value)}
                  placeholder="Ej: 1"
                  className="w-full rounded-md border border-zinc-600 bg-zinc-700 p-2 text-zinc-100"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Número de punto de venta habilitado en AFIP para Web Services.
                </p>
              </div>

              <div className="pt-2">
                <motion.button
                  onClick={async () => {
                    if (!afipCert || !afipKey) {
                      return Swal.fire(
                        'Faltan datos',
                        'Debes cargar certificado y clave primero.',
                        'warning',
                      );
                    }
                    const toast = Swal.mixin({
                      toast: true,
                      position: 'top-end',
                      showConfirmButton: false,
                      timerProgressBar: true,
                    });
                    toast.fire({
                      icon: 'info',
                      title: 'Verificando conexión con AFIP...',
                    });

                    try {
                      const functions = getFunctions();
                      const checkStatus = httpsCallable(
                        functions,
                        'checkAfipStatus',
                      );
                      // Enviamos sucursalId si existe en datosNegocio, o null
                      const result = await checkStatus({
                        sucursalId: datosNegocio?.id || null,
                      });
                      const { success, status, error } = result.data;

                      if (success) {
                        Swal.fire({
                          title: '¡Conexión Exitosa!',
                          html: `
                          <div class="text-left text-sm">
                            <p><strong>Ambiente:</strong> ${status.environment}</p>
                            <p><strong>App Server:</strong> ${status.appServer}</p>
                            <p><strong>DB Server:</strong> ${status.dbServer}</p>
                            <p><strong>Auth Server:</strong> ${status.authServer}</p>
                          </div>
                        `,
                          icon: 'success',
                          confirmButtonColor: '#10b981',
                        });
                      } else {
                        Swal.fire('Error de Conexión', error, 'error');
                      }
                    } catch (err) {
                      console.error(err);
                      Swal.fire(
                        'Error',
                        'No se pudo contactar con el servidor.',
                        'error',
                      );
                    }
                  }}
                  className="w-full rounded-md border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  📡 Probar Conexión con AFIP
                </motion.button>
              </div>
            </div>
          )}

          <hr className="my-6 border-zinc-700" />

          {/* SECCIÓN DE BACKUP */}
          <h3 className="mb-4 mt-6 text-lg font-medium text-white sm:text-xl">
            Seguridad y Datos
          </h3>
          <div className="rounded-md bg-zinc-700/50 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-zinc-100">Backup Manual</p>
                <p className="text-xs text-zinc-400">
                  Descarga un archivo JSON con todos tus datos.
                </p>
              </div>
              <motion.button
                onClick={handleBackupData}
                disabled={isLoading}
                className="flex items-center gap-2 rounded-md bg-green-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-green-700 disabled:bg-zinc-500"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Download size={14} />
                {isLoading ? 'Generando...' : 'Generar Backup'}
              </motion.button>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-lg bg-zinc-700/50 p-4">
            <div>
              <label
                htmlFor="reporte-diario"
                className={`text-base font-medium ${
                  canAccessDailyReport ? 'text-zinc-100' : 'text-zinc-500'
                }`}
              >
                Reporte Diario por Email
                {!canAccessDailyReport && (
                  <span className="ml-2 rounded bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400">
                    Premium
                  </span>
                )}
              </label>
              <p className="text-sm text-zinc-400">
                Recibe un resumen de tus ventas todas las noches.
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                id="reporte-diario"
                checked={recibirReporteDiario}
                onChange={(e) => setRecibirReporteDiario(e.target.checked)}
                disabled={!canAccessDailyReport}
                className="peer sr-only"
              />
              <div
                className={`peer h-6 w-11 rounded-full bg-zinc-600 after:absolute after:left-[2px] after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:bg-white after:transition-all after:content-[''] peer-focus:ring-2 peer-focus:ring-blue-500 ${
                  canAccessDailyReport
                    ? 'peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white'
                    : 'cursor-not-allowed opacity-50'
                }`}
              ></div>
            </label>
          </div>

          <h3 className="mb-4 mt-6 text-lg font-medium text-white sm:text-xl">
            Funcionalidades
          </h3>
          <div className="flex items-center justify-between rounded-md bg-zinc-700/50 p-3">
            <div>
              <label
                htmlFor="toggle-venta-rapida"
                className="font-medium text-zinc-100"
              >
                Habilitar Venta Rápida
              </label>
              <p className="text-xs text-zinc-400">
                Permite agregar items por monto sin control de stock.
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                id="toggle-venta-rapida"
                checked={ventaRapidaHabilitada}
                onChange={(e) => setVentaRapidaHabilitada(e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-zinc-600 after:absolute after:left-[2px] after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:ring-2 peer-focus:ring-blue-500"></div>
            </label>
          </div>

          <div className="pt-5 text-right">
            <motion.button
              onClick={handleLocalGuardar}
              className="rounded-md bg-blue-600 px-3 py-2 font-bold text-white hover:bg-blue-700"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Save className="mr-2 inline-block h-4 w-4" />
              Guardar Cambios
            </motion.button>
          </div>
        </div>
      ) : (
        <ImportDataTab />
      )}
    </div>
  );
}

export default ConfiguracionTab;
