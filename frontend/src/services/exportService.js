// frontend/src/services/exportService.js

import * as XLSX from 'xlsx';

export const exportToExcel = (data, fileName) => {
  // 1. Creamos una nueva hoja de cálculo a partir de nuestros datos (un array de objetos)
  const worksheet = XLSX.utils.json_to_sheet(data);

  // 2. Creamos un nuevo libro de trabajo
  const workbook = XLSX.utils.book_new();

  // 3. Añadimos la hoja de cálculo al libro, dándole un nombre a la pestaña (ej: "Productos")
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');

  // 4. Escribimos el archivo y forzamos la descarga en el navegador del usuario
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};