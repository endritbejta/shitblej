import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiX } from 'react-icons/fi';
import { searchProducts } from '../api/products';

const SearchBar = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const searchRef = useRef(null);
    const navigate = useNavigate();

    const [isExpanded, setIsExpanded] = useState(false);
    const inputRef = useRef(null);

    // Debounce search
    useEffect(() => {
        if (query.trim().length < 2) {
            setResults([]);
            setIsOpen(false);
            return;
        }

        setIsLoading(true);
        const timer = setTimeout(async () => {
            try {
                const data = await searchProducts(query);
                setResults(data);
                setIsOpen(true);
                setIsLoading(false);
            } catch (error) {
                console.error('Search error:', error);
                setResults([]);
                setIsLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setIsOpen(false);
                // Collapse if empty
                if (!query.trim()) {
                    setIsExpanded(false);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [query]);

    // Focus input when expanded
    useEffect(() => {
        if (isExpanded && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isExpanded]);

    // Keyboard navigation
    const handleKeyDown = (e) => {
        if (!isOpen || results.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault();
            handleSelectProduct(results[selectedIndex]);
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            if (!query.trim()) {
                setIsExpanded(false);
            }
        }
    };

    const handleSelectProduct = (product) => {
        navigate(`/products/${product._id}`);
        setQuery('');
        setIsOpen(false);
        setResults([]);
        setIsExpanded(false);
    };

    const clearSearch = () => {
        setQuery('');
        setResults([]);
        setIsOpen(false);
    };

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    return (
        <div ref={searchRef} className={`relative transition-all duration-300 ${isExpanded ? 'w-full' : 'w-auto'}`}>
            <div className="relative flex items-center h-[42px]">
                {!isExpanded ? (
                    // Collapsed state - just the icon
                    <button
                        onClick={toggleExpand}
                        className="h-[42px] px-3 rounded-full border border-gray-300 dark:border-zinc-700 text-gray-600 dark:text-gray-300 hover:text-green-500 dark:hover:text-green-400 hover:border-green-500 dark:hover:border-green-400 transition-all duration-300 flex items-center justify-center"
                        aria-label="Open search"
                    >
                        <FiSearch className="text-lg" />
                    </button>
                ) : (
                    // Expanded state - full search input
                    <div className="relative w-full transition-all duration-300 ease-in-out">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onFocus={() => query.trim().length >= 2 && results.length > 0 && setIsOpen(true)}
                            placeholder="Search for products..."
                            className="w-full h-[42px] pl-10 pr-10 rounded-full border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                        />
                        {query ? (
                            <button
                                onClick={clearSearch}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            >
                                <FiX className="text-lg" />
                            </button>
                        ) : (
                            <button
                                onClick={() => setIsExpanded(false)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                aria-label="Close search"
                            >
                                <FiX className="text-lg" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Dropdown Results */}
            {isOpen && (
                <div className="absolute top-full mt-2 w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-h-96 overflow-y-auto z-50">
                    {isLoading ? (
                        <div className="p-8 flex items-center justify-center gap-2">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                        </div>
                    ) : results.length > 0 ? (
                        <ul>
                            {results.map((product, index) => (
                                <li
                                    key={product._id}
                                    onClick={() => handleSelectProduct(product)}
                                    className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                                        index === selectedIndex
                                            ? 'bg-green-50 dark:bg-green-900/20'
                                            : 'hover:bg-gray-50 dark:hover:bg-zinc-800'
                                    } ${index !== results.length - 1 ? 'border-b border-gray-100 dark:border-zinc-800' : ''}`}
                                >
                                    {product.images && product.images.length > 0 ? (
                                        <img
                                            src={product.images[0]}
                                            alt={product.name}
                                            className="w-12 h-12 object-cover rounded-lg"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 bg-gray-200 dark:bg-zinc-700 rounded-lg flex items-center justify-center">
                                            <FiSearch className="text-gray-400" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 dark:text-white truncate">
                                            {product.name}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                            {product.category}
                                        </p>
                                    </div>
                                    <p className="font-semibold text-green-600 dark:text-green-400">
                                        ${product.price}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="p-4 text-center text-gray-500">
                            No products found
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchBar;