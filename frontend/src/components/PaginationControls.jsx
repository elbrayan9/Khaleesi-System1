import React from 'react';
import { motion } from 'framer-motion'; // Importar motion para animar botones
import { ChevronLeft, ChevronRight } from 'lucide-react'; // Iconos

/**
 * Componente reutilizable para controles de paginación (Anterior/Siguiente).
 * Adaptado para tema oscuro Zinc.
 */
function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems,
}) {
  // Los dos datos del rango son opcionales para quien llama, y cuando faltaban
  // la cuenta daba NaN: en Reportes se leía "Mostrando 0-NaN de" —sin número
  // final, porque totalItems tampoco llegaba—. Un NaN en pantalla es de las
  // cosas que más rápido hacen desconfiar de todo lo demás que muestra el
  // sistema, sobre todo en un reporte de plata.
  //
  // Se resuelve acá y no solo en quien llama: son cinco lugares y el próximo
  // que agregue una tabla se va a olvidar igual.
  const porPagina = Number(itemsPerPage) || 0;
  const total = Number(totalItems) || 0;
  const hayRango = porPagina > 0 && total > 0;
  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  // El rango de ítems que se está viendo.
  const firstItemIndex = hayRango ? (currentPage - 1) * porPagina + 1 : 0;
  const lastItemIndex = hayRango ? Math.min(currentPage * porPagina, total) : 0;

  /** El "Mostrando 3-12 de 45", o nada si no hay con qué calcularlo. */
  const rango = hayRango ? (
    <div className="text-zinc-400">
      Mostrando {firstItemIndex}-{lastItemIndex} de {total}
    </div>
  ) : (
    // Un div vacío y no null: el contenedor usa justify-between, y sin el
    // primer hijo los botones se irían al borde izquierdo.
    <div />
  );

  // No mostrar controles si no hay páginas o solo hay una
  if (totalPages <= 1) {
    // Mostrar "No hay resultados" si totalItems es 0
    if (total === 0) {
      return (
        <div className="mt-4 px-1 text-sm text-zinc-400">No hay resultados</div>
      );
    }
    // Una sola página: se muestra el rango, sin botones que no llevan a ningún
    // lado.
    return (
      <div className="mt-4 flex items-center justify-between px-1 text-sm">
        {rango}
      </div>
    );
  }

  return (
    <div className="mt-4 flex items-center justify-between px-1 text-sm">
      {rango}

      {/* Botones de Paginación */}
      <div className="flex items-center space-x-2">
        {/* Botón Anterior Animado */}
        <motion.button
          onClick={handlePrevious}
          disabled={currentPage === 1}
          className={`inline-flex items-center rounded-md px-3 py-1 transition duration-150 ease-in-out ${
            currentPage === 1
              ? 'cursor-not-allowed bg-zinc-700 text-zinc-500' // Estilo deshabilitado
              : 'bg-zinc-600 text-zinc-200 hover:bg-zinc-500' // Estilo habilitado
          }`}
          whileHover={currentPage !== 1 ? { scale: 1.05 } : {}}
          whileTap={currentPage !== 1 ? { scale: 0.95 } : {}}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Anterior
        </motion.button>

        {/* Indicador de Página */}
        <span className="font-medium text-zinc-300">
          Página {currentPage} de {totalPages}
        </span>

        {/* Botón Siguiente Animado */}
        <motion.button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className={`inline-flex items-center rounded-md px-3 py-1 transition duration-150 ease-in-out ${
            currentPage === totalPages
              ? 'cursor-not-allowed bg-zinc-700 text-zinc-500' // Estilo deshabilitado
              : 'bg-zinc-600 text-zinc-200 hover:bg-zinc-500' // Estilo habilitado
          }`}
          whileHover={currentPage !== totalPages ? { scale: 1.05 } : {}}
          whileTap={currentPage !== totalPages ? { scale: 0.95 } : {}}
        >
          Siguiente
          <ChevronRight className="ml-1 h-4 w-4" />
        </motion.button>
      </div>
    </div>
  );
}

export default PaginationControls;
