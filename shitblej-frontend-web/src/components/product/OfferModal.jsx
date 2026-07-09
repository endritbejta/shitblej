import { FaTimes } from "react-icons/fa";

export default function OfferModal({ isOpen, onClose, product, images, offerAmount, setOfferAmount, offerMessage, setOfferMessage, onSubmit, isLoading }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Make an Offer</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <FaTimes className="text-xl" />
                    </button>
                </div>
                
                <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl">
                        <img src={images[0]} alt={product.name} className="w-20 h-20 object-cover rounded-lg" />
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white">{product.name}</h3>
                            <p className="text-sm text-gray-500">Listed at: <span className="font-bold text-green-600">${product.price}</span></p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Your Offer Amount ($)
                        </label>
                        <input
                            type="number"
                            value={offerAmount}
                            onChange={(e) => setOfferAmount(e.target.value)}
                            placeholder={`Max: ${product.price}`}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Message to Seller (Optional)
                        </label>
                        <textarea
                            value={offerMessage}
                            onChange={(e) => setOfferMessage(e.target.value)}
                            placeholder="Add any details about your offer..."
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button 
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-900 dark:text-white font-semibold rounded-xl transition-colors"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={onSubmit}
                            disabled={isLoading}
                            className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? "Sending..." : "Send Offer"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
