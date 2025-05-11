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
  totalItems
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
  const firstItemIndex = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const lastItemIndex = Math.min(currentPage * itemsPerPage, totalItems);

  // No mostrar controles si no hay páginas o solo hay una
  if (totalPages <= 1) {
    // Mostrar "No hay resultados" si totalItems es 0
    if (totalItems === 0) {
        return <div className="text-zinc-400 text-sm mt-4 px-1">No hay resultados</div>;
    }
    // Opcionalmente, no mostrar nada si solo hay una página y tiene items
    // return null;
    // O mostrar la info de la única página
     return (
        <div className="flex items-center justify-between mt-4 px-1 text-sm">
            <div className="text-zinc-400">
                Mostrando {firstItemIndex}-{lastItemIndex} de {totalItems}
            </div>
             {/* Puedes ocultar los botones si solo hay una página */}
            {/* <div className="flex items-center space-x-2"> ... </div> */}
        </div>
     );
  }

  return (
    <div className="flex items-center justify-between mt-4 px-1 text-sm">
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
          className={`px-3 py-1 rounded-md transition duration-150 ease-in-out inline-flex items-center ${
            currentPage === 1
              ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed' // Estilo deshabilitado
              : 'bg-zinc-600 hover:bg-zinc-500 text-zinc-200' // Estilo habilitado
          }`}
          whileHover={currentPage !== 1 ? { scale: 1.05 } : {}}
          whileTap={currentPage !== 1 ? { scale: 0.95 } : {}}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Anterior
        </motion.button>

        {/* Indicador de Página */}
        <span className="text-zinc-300 font-medium">
          Página {currentPage} de {totalPages}
        </span>

        {/* Botón Siguiente Animado */}
        <motion.button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className={`px-3 py-1 rounded-md transition duration-150 ease-in-out inline-flex items-center ${
            currentPage === totalPages
              ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed' // Estilo deshabilitado
              : 'bg-zinc-600 hover:bg-zinc-500 text-zinc-200' // Estilo habilitado
          }`}
           whileHover={currentPage !== totalPages ? { scale: 1.05 } : {}}
           whileTap={currentPage !== totalPages ? { scale: 0.95 } : {}}
        >
          Siguiente
          <ChevronRight className="h-4 w-4 ml-1" />
        </motion.button>
      </div>
    </div>
  );
}

export default PaginationControls;
