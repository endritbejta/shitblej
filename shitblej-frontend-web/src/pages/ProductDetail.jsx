import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getProductById } from "../api/products";
import { sendMessage } from "../api/messages";
import { useAuth } from "../context/AuthContext";
import Header from "../layouts/Header";
import Footer from "../layouts/Footer";
import ProductMobileGallery from "../components/product/ProductMobileGallery";
import ProductImageGallery from "../components/product/ProductImageGallery";
import ProductInfo from "../components/product/ProductInfo";
import ProductDetails from "../components/product/ProductDetails";
import SellerCard from "../components/product/SellerCard";
import ProductActions from "../components/product/ProductActions";
import BuyModal from "../components/product/BuyModal";
import OfferModal from "../components/product/OfferModal";
import Loading from "../components/Loading";

export default function ProductDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeImage, setActiveImage] = useState(0);
    
    // Modal states
    const [showBuyModal, setShowBuyModal] = useState(false);
    const [showOfferModal, setShowOfferModal] = useState(false);
    const [offerAmount, setOfferAmount] = useState("");
    const [offerMessage, setOfferMessage] = useState("");
    const [sendingOffer, setSendingOffer] = useState(false);

    const [scrollY, setScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            setScrollY(window.scrollY);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        async function fetchProduct() {
            try {
                setLoading(true);
                const data = await getProductById(id);
                setProduct(data.data || data);
            } catch (err) {
                console.error(err);
                setError("Failed to load product.");
            } finally {
                setLoading(false);
            }
        }

        fetchProduct();
    }, [id]);

    const handleBuyNow = () => {
        if (!user) {
            navigate('/login', { state: { from: `/products/${id}` } });
            return;
        }
        setShowBuyModal(true);
    };

    const handleMakeOffer = () => {
        if (!user) {
            navigate('/login', { state: { from: `/products/${id}` } });
            return;
        }
        setOfferAmount("");
        setOfferMessage("");
        setShowOfferModal(true);
    };

    const submitOffer = async () => {
        if (!offerAmount || parseFloat(offerAmount) <= 0) {
            alert("Please enter a valid offer amount");
            return;
        }

        try {
            setSendingOffer(true);
            const message = `I'd like to make an offer of $${offerAmount} for "${product.name}". ${offerMessage}`;
            // sendMessage(senderId, receiverId, text)
            await sendMessage(user._id, product.user?._id || product.seller?._id, message);
            
            setShowOfferModal(false);
            alert("Your offer has been sent to the seller!");
            navigate('/inbox');
        } catch (err) {
            console.error(err);
            alert("Failed to send offer. Please try again.");
        } finally {
            setSendingOffer(false);
        }
    };

    const confirmPurchase = () => {
        alert(`Purchase confirmed! You bought ${product.name} for $${product.price}`);
        setShowBuyModal(false);
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
                <main className="flex-1 px-4 py-6 max-w-6xl w-full mx-auto pt-32">
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

            {/* Modals */}
            <BuyModal 
                isOpen={showBuyModal} 
                onClose={() => setShowBuyModal(false)} 
                product={product} 
                images={images}
                onConfirm={confirmPurchase} 
            />
            <OfferModal 
                isOpen={showOfferModal} 
                onClose={() => setShowOfferModal(false)} 
                product={product} 
                images={images}
                offerAmount={offerAmount}
                setOfferAmount={setOfferAmount}
                offerMessage={offerMessage}
                setOfferMessage={setOfferMessage}
                onSubmit={submitOffer} 
                isLoading={sendingOffer} 
            />
        </>
    );
}
