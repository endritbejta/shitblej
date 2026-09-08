import { ChevronLeft, ChevronRight } from "lucide-react";
import { WIDTHS, buildSrcSet, imageAtWidth } from "../../lib/imageUrl";

// Desktop only (the parent is hidden md:block). The gallery column is half of
// a max-w-6xl (1152px) grid with a 3rem gap, so ~536px at lg and up; below
// that the grid is single-column and the image is container width.
const MAIN_SIZES = "(min-width: 1024px) 536px, 100vw";

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
                {/* The LCP element on this page, so eager and high priority.
                    srcSet asks for the displayed size rather than the full
                    stored asset. */}
                <img
                    src={imageAtWidth(
                        images[activeImage] || "https://via.placeholder.com/600?text=No+Image",
                        960
                    )}
                    srcSet={buildSrcSet(images[activeImage], WIDTHS.detail) || undefined}
                    sizes={images[activeImage] ? MAIN_SIZES : undefined}
                    alt={productName}
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
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
                            {/* w-20 = 80px. These previously reused the main
                                image's URL, so a thumbnail strip meant
                                downloading every photo at full size. */}
                            <img
                                src={imageAtWidth(img, 160)}
                                srcSet={buildSrcSet(img, WIDTHS.thumb) || undefined}
                                sizes="80px"
                                alt={`View ${index + 1}`}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
