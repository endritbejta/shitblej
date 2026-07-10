import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import WishlistButton from "../ui/WishlistButton";

const timeAgo = (date) => {
    if (!date) return "";
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return "Just now";
};

export default function ProductInfo({ product, isMobile = false }) {
    if (isMobile) {
        return (
            <>
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{product.name}</h1>
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <MapPin className="h-4 w-4 text-brand-500" />
                            {product.location || "Prishtina, Kosovo"}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-green-600 dark:text-green-500">${product.price}</span>
                        <WishlistButton product={product} variant="surface" stopNavigation={false} />
                    </div>
                </div>

                {/* Badges */}
                <div className="flex gap-2 mb-6 flex-wrap">
                    <span className="px-3 py-1 bg-gray-100 dark:bg-zinc-800 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {product.condition || "Used"}
                    </span>
                    <span className="px-3 py-1 bg-gray-100 dark:bg-zinc-800 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {product.category || "General"}
                    </span>
                    <span className="px-3 py-1 bg-gray-100 dark:bg-zinc-800 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        Posted {product.createdAt ? timeAgo(product.createdAt) : "recently"}
                    </span>
                </div>

                {/* Description */}
                <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Description</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                        {product.description || "No description provided."}
                    </p>
                </div>
            </>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <div className="flex justify-between items-start">
                    <div>
                        <nav className="text-sm text-gray-500 mb-6 hidden md:block">
                            <Link to="/" className="hover:text-green-500">Home</Link> / 
                            <span className="mx-1">Products</span> / 
                            <span className="text-gray-900 dark:text-white font-medium ml-1">{product.name}</span>
                        </nav>
                        <span className="inline-block px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-semibold rounded-full mb-3">
                            {product.condition || "Used - Good"}
                        </span>
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                            {product.name}
                        </h1>
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" /> {product.location || "Prishtina, Kosovo"}
                            </span>
                            <span>•</span>
                            <span>Posted {product.createdAt ? timeAgo(product.createdAt) : "recently"}</span>
                        </div>
                    </div>
                    <WishlistButton product={product} variant="surface" size="lg" stopNavigation={false} />
                </div>
                <div className="mt-6">
                    <span className="text-4xl font-bold text-green-600 dark:text-green-500">
                        ${product.price}
                    </span>
                </div>
            </div>

            {/* Description */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Description</h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                    {product.description || "No description provided."}
                </p>
            </div>

            {/* Specifications */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Details</h3>
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-zinc-800">
                        <span className="text-gray-500">Category</span>
                        <span className="font-medium dark:text-white">{product.category || "Electronics"}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-zinc-800">
                        <span className="text-gray-500">Brand</span>
                        <span className="font-medium dark:text-white">{product.brand || "Generic"}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-zinc-800">
                        <span className="text-gray-500">Condition</span>
                        <span className="font-medium dark:text-white">{product.condition || "Used"}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-zinc-800">
                        <span className="text-gray-500">Color</span>
                        <span className="font-medium dark:text-white">{product.color || "Black"}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
