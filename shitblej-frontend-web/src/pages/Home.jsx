import { useEffect, useState } from "react";
import { getProducts } from "../api/products";
import Collection from "../components/collections/Collection";
import HeroBanner from "../components/home/HeroBanner";

export default function Home() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                // Fetch the first 10 products
                const data = await getProducts({ limit: 10 });
                setProducts(data);
            } catch (err) {
                console.error(err);
                setError("Failed to load products.");
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    if (loading) return <div className="p-4">Loading products…</div>;
    if (error) return <div className="p-4 text-red-500">{error}</div>;
    if (!products.length) return <div className="p-4">No products found.</div>;

    return (
        <div className="pb-20">
            {/* Hero Banner - full width on desktop, breaks out of main container padding */}
            <div className="-mx-4 -mt-6 mb-8">
                <HeroBanner />
            </div>
            
            <div className="max-w-7xl mx-auto py-8">
                {/* Render the Collection component with first 10 products */}
                <Collection title="Top products" products={products} />
            </div>
        </div>
    );
}
