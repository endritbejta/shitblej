import React, { createContext, useContext, useState, useCallback } from 'react';
import { getProducts } from '../api/products';

const CollectionCacheContext = createContext();

export function useCollectionCache() {
    return useContext(CollectionCacheContext);
}

export function CollectionCacheProvider({ children }) {
    // Cache structure: { categoryId: { products: [], timestamp: Date } }
    const [cache, setCache] = useState({});
    const [loadingStates, setLoadingStates] = useState({});

    const getCollectionProducts = useCallback(async (categoryId, options = {}) => {
        // Check if we have cached data for this category
        if (cache[categoryId]) {
            console.log(`Using cached data for category: ${categoryId}`);
            return {
                products: cache[categoryId].products,
                fromCache: true
            };
        }

        // If not in cache, fetch from API
        try {
            setLoadingStates(prev => ({ ...prev, [categoryId]: true }));
            console.log(`Fetching fresh data for category: ${categoryId}`);
            
            const products = await getProducts({ 
                category: categoryId, 
                limit: options.limit || 20 
            });

            // Store in cache
            setCache(prev => ({
                ...prev,
                [categoryId]: {
                    products,
                    timestamp: new Date()
                }
            }));

            return {
                products,
                fromCache: false
            };
        } catch (error) {
            console.error(`Error fetching products for category ${categoryId}:`, error);
            throw error;
        } finally {
            setLoadingStates(prev => ({ ...prev, [categoryId]: false }));
        }
    }, [cache]);

    const clearCache = useCallback((categoryId = null) => {
        if (categoryId) {
            // Clear specific category
            setCache(prev => {
                const newCache = { ...prev };
                delete newCache[categoryId];
                return newCache;
            });
        } else {
            // Clear all cache
            setCache({});
        }
    }, []);

    const isLoading = useCallback((categoryId) => {
        return loadingStates[categoryId] || false;
    }, [loadingStates]);

    const value = {
        getCollectionProducts,
        clearCache,
        isLoading,
        cache
    };

    return (
        <CollectionCacheContext.Provider value={value}>
            {children}
        </CollectionCacheContext.Provider>
    );
}
