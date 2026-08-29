// frontend/src/components/SearchBar.jsx

import React, {
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SearchBar = forwardRef(
  (
    {
      items,
      placeholder,
      onSelect,
      onTextChange,
      displayKey,
      filterKeys,
      inputId,
      imageKey, // opcional: muestra miniatura en cada resultado
    },
    ref,
  ) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredItems, setFilteredItems] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    // Cuál de los resultados está marcado. Empieza en el primero: escribir y
    // apretar Enter tiene que elegir lo más parecido, que es lo que se busca el
    // 90% de las veces.
    const [indiceMarcado, setIndiceMarcado] = useState(0);
    const wrapperRef = useRef(null);

    // Expone la función `clearInput` al componente padre (VentaTab)
    useImperativeHandle(ref, () => ({
      clearInput() {
        setSearchTerm('');
        setFilteredItems([]);
        setIsDropdownOpen(false);
      },
    }));

    // Cierra el menú desplegable si se hace clic fuera
    useEffect(() => {
      function handleClickOutside(event) {
        if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
          setIsDropdownOpen(false);
        }
      }
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }, [wrapperRef]);

    const handleInputChange = (e) => {
      const value = e.target.value;
      setSearchTerm(value);
      if (onTextChange) {
        onTextChange(value);
      }
      if (value.length > 1) {
        const lowerCaseValue = value.toLowerCase();
        const results = items.filter((item) =>
          filterKeys.some((key) =>
            String(item[key]).toLowerCase().includes(lowerCaseValue),
          ),
        );
        setFilteredItems(results.slice(0, 5));
        setIsDropdownOpen(results.length > 0);
        setIndiceMarcado(0);
      } else {
        setFilteredItems([]);
        setIsDropdownOpen(false);
        setIndiceMarcado(0);
      }
    };

    const handleItemSelect = (item) => {
      setSearchTerm(item[displayKey]);
      onSelect(item);
      setFilteredItems([]);
      setIsDropdownOpen(false);
      setIndiceMarcado(0);
    };

    // Navegación con el teclado. Sin esto había que elegir el resultado con el
    // mouse, y en un mostrador con cola eso es justo lo que hace lenta la
    // atención: se escribe con las dos manos y después hay que ir a buscar el
    // mouse para confirmar lo que ya se estaba viendo en pantalla.
    const alTeclear = (evento) => {
      if (!isDropdownOpen || filteredItems.length === 0) {
        // Enter con la lista cerrada se deja pasar: en el campo del código de
        // barras es lo que dispara la carga del producto.
        return;
      }
      if (evento.key === 'ArrowDown') {
        evento.preventDefault();
        setIndiceMarcado((i) => (i + 1) % filteredItems.length);
      } else if (evento.key === 'ArrowUp') {
        evento.preventDefault();
        setIndiceMarcado((i) => (i - 1 + filteredItems.length) % filteredItems.length);
      } else if (evento.key === 'Enter') {
        evento.preventDefault();
        handleItemSelect(filteredItems[indiceMarcado]);
      } else if (evento.key === 'Escape') {
        evento.preventDefault();
        setIsDropdownOpen(false);
      }
    };

    return (
      <div className="relative w-full" ref={wrapperRef}>
        <input
          id={inputId}
          type="text"
          className="w-full rounded-md border border-zinc-600 bg-zinc-700 p-2 text-zinc-100 placeholder-zinc-400"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={alTeclear}
          onFocus={() => {
            if (filteredItems.length > 0) setIsDropdownOpen(true);
          }}
          autoComplete="off"
          role="combobox"
          aria-expanded={isDropdownOpen}
          aria-autocomplete="list"
        />
        <AnimatePresence>
          {isDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-zinc-700 bg-zinc-800 shadow-lg"
            >
              {filteredItems.map((item, i) => (
                <div
                  key={item.id}
                  role="option"
                  aria-selected={i === indiceMarcado}
                  // El marcado se pinta igual que el hover: quien navega con
                  // flechas ve lo mismo que vería pasando el mouse.
                  className={
                    'flex cursor-pointer items-center gap-2 px-4 py-2 text-zinc-300 hover:bg-zinc-700 ' +
                    (i === indiceMarcado ? 'bg-zinc-700' : '')
                  }
                  onMouseEnter={() => setIndiceMarcado(i)}
                  onClick={() => handleItemSelect(item)}
                >
                  {imageKey &&
                    (item[imageKey] ? (
                      <img
                        src={item[imageKey]}
                        alt=""
                        className="h-8 w-8 flex-none rounded object-cover ring-1 ring-zinc-700"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-8 w-8 flex-none rounded bg-zinc-700/50" />
                    ))}
                  <span className="truncate">{item[displayKey]}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  },
);

export default SearchBar;
