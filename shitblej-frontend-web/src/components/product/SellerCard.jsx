import { Link } from "react-router-dom";
import { Star, ShieldCheck, MessageCircle } from "lucide-react";
import { WIDTHS, buildSrcSet, imageAtWidth } from "../../lib/imageUrl";

export default function SellerCard({ seller, isMobile = false }) {
    if (isMobile) {
        return (
            <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-4 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <img
                        src={imageAtWidth(seller.image, 96)}
                        srcSet={buildSrcSet(seller.image, WIDTHS.thumb) || undefined}
                        sizes="40px"
                        alt={seller.name}
                        loading="lazy"
                        decoding="async"
                        className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                        <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{seller.name}</h3>
                        <div className="flex items-center gap-1 text-xs text-amber-500">
                            <Star className="h-3 w-3 fill-current" /> {seller.rating}
                        </div>
                    </div>
                </div>
                <Link to="/inbox" className="p-2 bg-white dark:bg-zinc-700 rounded-full shadow-sm text-brand-600 dark:text-brand-400">
                    <MessageCircle className="h-4 w-4" />
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
                <div className="relative">
                    <img
                        src={imageAtWidth(seller.image, 96)}
                        srcSet={buildSrcSet(seller.image, WIDTHS.thumb) || undefined}
                        sizes="48px"
                        loading="lazy"
                        decoding="async" 
                        alt={seller.name} 
                        className="w-12 h-12 rounded-full object-cover"
                    />
                    {seller.verified && (
                        <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-0.5 rounded-full border-2 border-white dark:border-zinc-900">
                            <ShieldCheck className="h-2.5 w-2.5" />
                        </div>
                    )}
                </div>
                <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{seller.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-amber-500">
                        <Star className="h-3 w-3 fill-current" />
                        <span className="font-medium text-gray-700 dark:text-gray-300">{seller.rating}</span>
                        <span className="text-gray-400">({seller.reviews} reviews)</span>
                    </div>
                </div>
            </div>
            <Link 
                to={`/inbox?userId=${seller.id}`}
                className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-900 dark:text-white text-sm font-medium rounded-lg transition-colors"
            >
                Chat
            </Link>
        </div>
    );
}
