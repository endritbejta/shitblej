export default function ProductDetails({ product }) {
    return (
        <div className="mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Details</h3>
            <div className="flex flex-col gap-2">
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-zinc-800">
                    <span className="text-gray-500 text-sm">Category</span>
                    <span className="font-medium dark:text-white text-sm">{product.category || "Electronics"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-zinc-800">
                    <span className="text-gray-500 text-sm">Brand</span>
                    <span className="font-medium dark:text-white text-sm">{product.brand || "Generic"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-zinc-800">
                    <span className="text-gray-500 text-sm">Condition</span>
                    <span className="font-medium dark:text-white text-sm">{product.condition || "Used"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-zinc-800">
                    <span className="text-gray-500 text-sm">Color</span>
                    <span className="font-medium dark:text-white text-sm">{product.color || "Black"}</span>
                </div>
            </div>
        </div>
    );
}
