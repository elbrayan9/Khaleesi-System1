// frontend/src/components/SearchBar.jsx

import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SearchBar = forwardRef(({ items, placeholder, onSelect, displayKey, filterKeys, inputId }, ref) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredItems, setFilteredItems] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const wrapperRef = useRef(null);

    // Expone la función `clearInput` al componente padre (VentaTab)
    useImperativeHandle(ref, () => ({
        clearInput() {
            setSearchTerm('');
            setFilteredItems([]);
            setIsDropdownOpen(false);
        }
    }));

    // Cierra el menú desplegable si se hace clic fuera
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);
    
    const handleInputChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        if (value.length > 1) {
            const lowerCaseValue = value.toLowerCase();
            const results = items.filter(item => 
                filterKeys.some(key => 
                    String(item[key]).toLowerCase().includes(lowerCaseValue)
                )
            );
            setFilteredItems(results.slice(0, 5));
            setIsDropdownOpen(results.length > 0);
        } else {
            setFilteredItems([]);
            setIsDropdownOpen(false);
        }
    };

    const handleItemSelect = (item) => {
        setSearchTerm(item[displayKey]);
        onSelect(item);
        setFilteredItems([]);
        setIsDropdownOpen(false);
    };

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <input
                id={inputId}
                type="text"
                className="w-full p-2 border border-zinc-600 rounded-md bg-zinc-700 text-zinc-100 placeholder-zinc-400"
                placeholder={placeholder}
                value={searchTerm}
                onChange={handleInputChange}
                onFocus={() => { if (filteredItems.length > 0) setIsDropdownOpen(true); }}
            />
            <AnimatePresence>
                {isDropdownOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-20 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg max-h-60 overflow-y-auto"
                    >
                        {filteredItems.map(item => (
                            <div
                                key={item.id}
                                className="px-4 py-2 text-zinc-300 hover:bg-zinc-700 cursor-pointer"
                                onClick={() => handleItemSelect(item)}
                            >
                                {item[displayKey]}
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

export default SearchBar;