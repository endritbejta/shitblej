import { ChevronLeft, ChevronRight } from "lucide-react";

export default function ProductImageGallery({ images, activeImage, setActiveImage, scrollY, productName }) {
    const nextImage = () => {
        setActiveImage((prev) => (prev + 1) % images.length);
    };

    const prevImage = () => {
        setActiveImage((prev) => (prev - 1 + images.length) % images.length);
    };

    return (
        <div className="space-y-4">
            {/* Main Image */}
            <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 relative group">
                <img
                    src={images[activeImage] || "https://via.placeholder.com/600?text=No+Image"}
                    alt={productName}
                    className="w-full h-full object-contain transition-transform duration-300 ease-out will-change-transform"
                    style={{ transform: `scale(${1 + scrollY * 0.0005})` }}
                />
                
                {/* Navigation Arrows */}
                {images.length > 1 && (
                    <>
                        <button 
                            onClick={(e) => { e.stopPropagation(); prevImage(); }}
                            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 dark:bg-zinc-900/80 p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white dark:hover:bg-zinc-900 shadow-lg"
                        >
                            <ChevronLeft className="h-4 w-4 text-gray-900 dark:text-white" />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); nextImage(); }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 dark:bg-zinc-900/80 p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white dark:hover:bg-zinc-900 shadow-lg"
                        >
                            <ChevronRight className="h-4 w-4 text-gray-900 dark:text-white" />
                        </button>
                    </>
                )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
                <div className="flex flex-wrap justify-center gap-2">
                    {images.map((img, index) => (
                        <button
                            key={index}
                            onClick={() => setActiveImage(index)}
                            className={`w-20 aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                                activeImage === index 
                                    ? "border-green-500 ring-2 ring-green-500/20" 
                                    : "border-transparent hover:border-gray-300 dark:hover:border-zinc-600"
                            }`}
                        >
                            <img src={img} alt={`View ${index + 1}`} className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
