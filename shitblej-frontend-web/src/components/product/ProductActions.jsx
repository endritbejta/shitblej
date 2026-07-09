export default function ProductActions({ onBuyNow, onMakeOffer, isMobile = false }) {
    if (isMobile) {
        return (
            <div className="fixed bottom-4 left-4 right-4 z-50 flex justify-center">
                <div className="bg-white/30 dark:bg-zinc-900/50 backdrop-blur-xl rounded-3xl border border-gray-200 dark:border-zinc-800 shadow-2xl shadow-black/10 dark:shadow-black/30 w-full p-2 flex gap-3">
                    <button 
                        onClick={onMakeOffer}
                        className="flex-1 py-3 bg-gray-100 dark:bg-zinc-800/50 text-gray-900 dark:text-white font-semibold rounded-2xl"
                    >
                        Offer
                    </button>
                    <button 
                        onClick={onBuyNow}
                        className="flex-1 py-3 bg-green-500 text-white font-semibold rounded-2xl shadow-lg shadow-green-500/20"
                    >
                        Buy Now
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex gap-4 pt-4">
            <button 
                onClick={onBuyNow}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-500/30 transition-all transform hover:-translate-y-0.5"
            >
                Buy Now
            </button>
            <button 
                onClick={onMakeOffer}
                className="flex-1 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-900 dark:text-white font-bold py-4 rounded-xl transition-colors"
            >
                Make Offer
            </button>
        </div>
    );
}
