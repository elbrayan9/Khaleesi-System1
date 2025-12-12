import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  generateTemplate,
  parseExcelFile,
  validateData,
  processBatchImport,
} from '../services/importService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Download,
  Upload,
  AlertCircle,
  CheckCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { motion } from 'framer-motion';

const ImportDataTab = () => {
  const { currentUserId, sucursalActual, mostrarMensaje } = useAppContext();
  const [importType, setImportType] = useState('productos');
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [validationError, setValidationError] = useState(null);
  const [importStats, setImportStats] = useState(null);

  const handleTypeChange = (e) => {
    setImportType(e.target.value);
    setFile(null);
    setPreviewData([]);
    setValidationError(null);
    setImportStats(null);
    setProgress(0);
  };

  const handleDownloadTemplate = () => {
    generateTemplate(importType);
    mostrarMensaje('Plantilla descargada. Revisa tus descargas.', 'success');
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setValidationError(null);
    setImportStats(null);
    setProgress(0);

    try {
      const data = await parseExcelFile(selectedFile);
      const validation = validateData(data, importType);

      if (!validation.valid) {
        setValidationError(validation.errors.join(' '));
        setPreviewData([]);
      } else {
        setPreviewData(data.slice(0, 5)); // Mostrar solo las primeras 5 filas
      }
    } catch (error) {
      console.error('Error al leer el archivo:', error);
      setValidationError(
        'No se pudo leer el archivo. Asegúrate de que sea un Excel válido.',
      );
    }
  };

  const handleImport = async () => {
    if (!file || !currentUserId || !sucursalActual) return;

    setIsUploading(true);
    setProgress(0);

    try {
      const data = await parseExcelFile(file); // Re-leemos para tener todos los datos
      const result = await processBatchImport(
        data,
        importType,
        currentUserId,
        sucursalActual.id,
        (percent) => setProgress(percent),
      );

      if (result.success) {
        setImportStats(`Se importaron ${result.count} registros exitosamente.`);
        mostrarMensaje('Importación completada con éxito.', 'success');
        setFile(null);
        setPreviewData([]);
        // Limpiar input file
        document.getElementById('file-upload').value = '';
      }
    } catch (error) {
      console.error('Error en la importación:', error);
      mostrarMensaje('Ocurrió un error durante la importación.', 'error');
      setValidationError(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 p-4 text-white">
      <div className="flex items-center gap-2 border-b border-zinc-700 pb-4">
        <FileSpreadsheet className="h-6 w-6 text-green-400" />
        <h2 className="text-xl font-semibold">Importación Masiva de Datos</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Configuración */}
        <div className="space-y-4 rounded-lg bg-zinc-800 p-6">
          <h3 className="text-lg font-medium text-zinc-200">
            1. Configuración
          </h3>

          <div className="space-y-2">
            <Label>Tipo de Datos</Label>
            <select
              value={importType}
              onChange={handleTypeChange}
              className="w-full rounded-md border border-zinc-600 bg-zinc-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              disabled={isUploading}
            >
              <option value="productos">Productos</option>
              <option value="clientes">Clientes</option>
              <option value="proveedores">Proveedores</option>
              <option value="ventas">Ventas (Historial)</option>
            </select>
            <p className="text-xs text-zinc-400">
              {importType === 'ventas'
                ? 'Nota: Las ventas se importarán como historial y NO descontarán stock.'
                : 'Selecciona el tipo de información que deseas cargar.'}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Plantilla</Label>
            <Button
              onClick={handleDownloadTemplate}
              variant="outline"
              className="w-full gap-2 border-green-500 bg-transparent text-green-500 hover:bg-green-500 hover:text-white"
              disabled={isUploading}
            >
              <Download className="h-4 w-4" />
              Descargar Plantilla de Ejemplo
            </Button>
          </div>
        </div>

        {/* Carga de Archivo */}
        <div className="space-y-4 rounded-lg bg-zinc-800 p-6">
          <h3 className="text-lg font-medium text-zinc-200">
            2. Carga de Archivo
          </h3>

          <div className="space-y-2">
            <Label>Archivo</Label>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => document.getElementById('file-upload').click()}
                variant="outline"
                className="w-full gap-2 border-blue-500 bg-transparent text-blue-500 hover:bg-blue-500 hover:text-white"
                disabled={isUploading}
              >
                <Upload className="h-4 w-4" />
                {file ? 'Cambiar Archivo' : 'Seleccionar Archivo Excel'}
              </Button>
              <Input
                id="file-upload"
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                disabled={isUploading}
                className="hidden"
              />
              {file && (
                <p className="text-sm text-zinc-400">
                  Archivo seleccionado:{' '}
                  <span className="font-medium text-white">{file.name}</span>
                </p>
              )}
            </div>
          </div>

          {validationError && (
            <div className="flex items-center gap-2 rounded-md bg-red-500/20 p-3 text-sm text-red-300">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p>{validationError}</p>
            </div>
          )}

          {importStats && (
            <div className="flex items-center gap-2 rounded-md bg-green-500/20 p-3 text-sm text-green-300">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <p>{importStats}</p>
            </div>
          )}
        </div>
      </div>

      {/* Previsualización */}
      {previewData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-zinc-800 p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-medium text-zinc-200">
              Previsualización (Primeras 5 filas)
            </h3>
            <Button
              onClick={handleImport}
              disabled={isUploading}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              {isUploading ? (
                <>
                  <Upload className="h-4 w-4 animate-bounce" />
                  Importando {progress}%...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Confirmar e Importar
                </>
              )}
            </Button>
          </div>

          {isUploading && (
            <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-zinc-700">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <div className="overflow-x-auto rounded-md border border-zinc-700">
            <Table>
              <TableHeader>
                <TableRow className="border-b-zinc-700 bg-zinc-900/50 hover:bg-zinc-900/50">
                  {Object.keys(previewData[0]).map((header) => (
                    <TableHead key={header} className="text-zinc-300">
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((row, i) => (
                  <TableRow
                    key={i}
                    className="border-b-zinc-700 hover:bg-zinc-700/30"
                  >
                    {Object.values(row).map((val, j) => (
                      <TableCell key={j} className="text-zinc-300">
                        {typeof val === 'object'
                          ? JSON.stringify(val)
                          : String(val)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ImportDataTab;
