import React, { useState, useEffect, useRef } from 'react';

// --- SearchBar Component (Dark Mode - Zinc) ---
const SearchBar = React.forwardRef(({ items, placeholder, onSelect, displayKey, filterKeys, initialValue = '', inputId, resultId, disabled = false, formatCurrency }, ref) => {
    const [searchTerm, setSearchTerm] = useState(initialValue);
    const [results, setResults] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const searchRef = useRef(null);

    useEffect(() => {
        setSearchTerm(initialValue);
    }, [initialValue]);

    const handleInputChange = (e) => {
        const term = e.target.value;
        setSearchTerm(term);
        if (term.length >= 2) {
            const filtered = items.filter(item =>
                filterKeys.some(key =>
                    item[key] && item[key].toString().toLowerCase().includes(term.toLowerCase())
                )
                 && (item.stock === undefined || item.stock > 0)
            );
            setResults(filtered);
            setShowResults(true);
        } else {
            setResults([]);
            setShowResults(false);
            onSelect(null);
        }
    };

    const handleResultClick = (item) => {
        setSearchTerm(item[displayKey]);
        setShowResults(false);
        onSelect(item);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowResults(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [searchRef]);

    return (
        <div className="relative" ref={searchRef}>
            {/* Input con estilos dark mode (zinc) */}
            <input
                type="text"
                id={inputId}
                ref={ref}
                value={searchTerm}
                onChange={handleInputChange}
                placeholder={placeholder}
                // Clases actualizadas para dark mode
                className="w-full p-2 border border-zinc-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-zinc-700 text-zinc-100 placeholder-zinc-400"
                disabled={disabled}
                autoComplete="off"
            />
            {/* Results Dropdown (ya tiene estilos globales dark en App.jsx) */}
            {showResults && (
                <div id={resultId} className="search-results absolute bg-zinc-800 border border-zinc-700 border-t-0 max-h-40 overflow-y-auto w-full z-10 rounded-b-md shadow-lg">
                    {results.length > 0 ? (
                        results.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => handleResultClick(item)}
                                className="p-2 cursor-pointer hover:bg-zinc-700 text-sm text-zinc-200" // Ajustado hover y texto
                            >
                                {item[displayKey]}
                                {item.cuit ? ` (${item.cuit})` : ''}
                                {item.precio !== undefined && formatCurrency ? ` ($${formatCurrency(item.precio)})` : ''}
                                {item.stock !== undefined ? ` - Stock: ${item.stock}` : ''}
                            </div>
                        ))
                    ) : (
                        <div className="text-zinc-400 p-2 text-sm">No encontrado.</div>
                    )}
                </div>
            )}
        </div>
    );
});

SearchBar.displayName = 'SearchBar';

export default SearchBar;
