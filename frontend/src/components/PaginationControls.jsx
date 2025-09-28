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

  // Calcular el rango de ítems mostrados
  const firstItemIndex =
    totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const lastItemIndex = Math.min(currentPage * itemsPerPage, totalItems);

  // No mostrar controles si no hay páginas o solo hay una
  if (totalPages <= 1) {
    // Mostrar "No hay resultados" si totalItems es 0
    if (totalItems === 0) {
      return (
        <div className="mt-4 px-1 text-sm text-zinc-400">No hay resultados</div>
      );
    }
    // Opcionalmente, no mostrar nada si solo hay una página y tiene items
    // return null;
    // O mostrar la info de la única página
    return (
      <div className="mt-4 flex items-center justify-between px-1 text-sm">
        <div className="text-zinc-400">
          Mostrando {firstItemIndex}-{lastItemIndex} de {totalItems}
        </div>
        {/* Puedes ocultar los botones si solo hay una página */}
        {/* <div className="flex items-center space-x-2"> ... </div> */}
      </div>
    );
  }

  return (
    <div className="mt-4 flex items-center justify-between px-1 text-sm">
      {/* Información de ítems */}
      <div className="text-zinc-400">
        Mostrando {firstItemIndex}-{lastItemIndex} de {totalItems}
      </div>

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
