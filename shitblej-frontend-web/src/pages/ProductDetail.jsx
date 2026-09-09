import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProductById } from "../api/products";
import { queryKeys } from "../lib/queryClient";
import { useAuth } from "../context/AuthContext";
import Header from "../layouts/Header";
import Footer from "../layouts/Footer";
import ProductMobileGallery from "../components/product/ProductMobileGallery";
import ProductImageGallery from "../components/product/ProductImageGallery";
import ProductInfo from "../components/product/ProductInfo";
import ProductDetails from "../components/product/ProductDetails";
import SellerCard from "../components/product/SellerCard";
import ProductActions from "../components/product/ProductActions";
import MakeOfferDialog from "../components/offers/MakeOfferDialog";
import BuyNowDialog from "../components/offers/BuyNowDialog";
import Loading from "../components/Loading";

export default function ProductDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [activeImage, setActiveImage] = useState(0);

    // Negotiation dialogs (offer / buy-now, both via the offers API)
    const [showBuyNow, setShowBuyNow] = useState(false);
    const [showOffer, setShowOffer] = useState(false);

    const [scrollY, setScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            setScrollY(window.scrollY);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Cached per product, so coming back from the offer flow or the seller's
    // profile does not refetch and re-flash the page.
    const { data: product, isPending: loading, isError } = useQuery({
        queryKey: queryKeys.product(id),
        queryFn: async () => {
            const data = await getProductById(id);
            // The endpoint has been seen returning both shapes.
            return data.data || data;
        },
    });

    const error = isError ? "Failed to load product." : null;

    const handleBuyNow = () => {
        if (!user) {
            navigate('/login', { state: { from: `/products/${id}` } });
            return;
        }
        setShowBuyNow(true);
    };

    const handleMakeOffer = () => {
        if (!user) {
            navigate('/login', { state: { from: `/products/${id}` } });
            return;
        }
        setShowOffer(true);
    };

    if (loading) return <Loading fullScreen message="Loading product..." />;
    if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;
    if (!product) return <div className="min-h-screen flex items-center justify-center">Product not found.</div>;

    const images = product.images?.length ? product.images : [product.image].filter(Boolean);

    const seller = {
        id: product.user?._id || product.seller?._id,
        name: product.user?.name || product.seller?.name || product.userName || "Anonymous Seller",
        rating: product.user?.rating || product.seller?.rating || 0,
        reviews: product.user?.reviews || product.seller?.reviews || 0,
        joined: product.user?.joined || product.seller?.joined || "2023",
        verified: product.user?.verified || product.seller?.verified || false,
        image: product.user?.image || product.seller?.image || product.seller?.avatar || "https://via.placeholder.com/150"
    };

    return (
        <>
            {/* Mobile View */}
            <div className="md:hidden">
                <ProductMobileGallery 
                    images={images} 
                    productName={product.name} 
                    onBack={() => navigate(-1)}
                    scrollY={scrollY}
                />
                
                <div className="mt-[45vh] relative z-20 bg-white dark:bg-zinc-900 rounded-t-3xl pt-[1px] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] min-h-screen pb-24">
                    <div className="w-12 h-1.5 bg-gray-300 dark:bg-zinc-700 rounded-full mx-auto mt-3 mb-6" />
                    <div className="px-5">
                        <ProductInfo product={product} isMobile />
                        <SellerCard seller={seller} isMobile />
                        <ProductDetails product={product} />
                    </div>
                    <Footer />
                </div>

                <ProductActions onBuyNow={handleBuyNow} onMakeOffer={handleMakeOffer} isMobile />
            </div>

            {/* Desktop View */}
            <div className="hidden md:block min-h-screen flex flex-col dark:bg-black">
                <Header />
                {/* This page renders its own Header and main rather than
                    using AppLayout, so it needs the target too. The two <main>
                    elements never coexist - they are different routes - so the
                    id is unique at runtime. */}
                <main
                    id="main-content"
                    tabIndex={-1}
                    className="flex-1 px-4 py-6 max-w-6xl w-full mx-auto pt-32"
                >
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                        {/* Left Column: Images */}
                        <ProductImageGallery 
                            images={images} 
                            activeImage={activeImage} 
                            setActiveImage={setActiveImage} 
                            scrollY={scrollY}
                            productName={product.name}
                        />

                        {/* Right Column: Details */}
                        <div className="space-y-8">
                            <ProductInfo product={product} />
                            <SellerCard seller={seller} />
                            <ProductActions onBuyNow={handleBuyNow} onMakeOffer={handleMakeOffer} />
                        </div>
                    </div>
                </main>
                <Footer />
            </div>

            {/* Negotiation dialogs */}
            {showBuyNow && (
                <BuyNowDialog
                    product={product}
                    sellerId={seller.id}
                    onClose={() => setShowBuyNow(false)}
                />
            )}
            {showOffer && (
                <MakeOfferDialog
                    product={product}
                    sellerId={seller.id}
                    onClose={() => setShowOffer(false)}
                />
            )}
        </>
    );
}
