import { X } from "lucide-react";

export default function BuyModal({ isOpen, onClose, product, images, onConfirm }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Confirm Purchase</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                
                <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl">
                        <img src={images[0]} alt={product.name} className="w-20 h-20 object-cover rounded-lg" />
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white">{product.name}</h3>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-500">${product.price}</p>
                        </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-zinc-800 pt-4">
                        <div className="flex justify-between mb-2">
                            <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                            <span className="font-medium dark:text-white">${product.price}</span>
                        </div>
                        <div className="flex justify-between mb-2">
                            <span className="text-gray-600 dark:text-gray-400">Shipping</span>
                            <span className="font-medium text-green-600">Free</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold border-t border-gray-200 dark:border-zinc-800 pt-2 mt-2">
                            <span className="dark:text-white">Total</span>
                            <span className="text-green-600 dark:text-green-500">${product.price}</span>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button 
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-900 dark:text-white font-semibold rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={onConfirm}
                            className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-green-500/30"
                        >
                            Confirm Purchase
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
