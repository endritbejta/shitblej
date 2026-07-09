import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useCollectionCache } from "../context/CollectionCacheContext";
import Collection from "../components/collections/Collection";
import Loading from "../components/Loading";

export default function CollectionPage() {
    const { id } = useParams(); // category identifier: "women", "electronics"
    const { getCollectionProducts, isLoading } = useCollectionCache();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                const { products: data, fromCache } = await getCollectionProducts(id, { limit: 20 });
                setProducts(data);
                
                // Optional: You can add visual feedback for cached data
                if (fromCache) {
                    console.log("Loaded from cache - no API call made!");
                }
            } catch (err) {
                console.error(err);
                setError("Failed to load products.");
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [id, getCollectionProducts]);

    if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;
    if (!products.length) return <div className="min-h-screen flex items-center justify-center text-gray-500 dark:text-gray-400">No products found in this collection.</div>;

    return <Collection title={`${id.charAt(0).toUpperCase() + id.slice(1)} collection`} products={products} loading={loading}/>;
}
