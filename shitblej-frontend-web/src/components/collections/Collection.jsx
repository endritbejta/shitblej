import Item from "../item/Item";

export default function Collection({ title, products, loading }) {
  // Generate an array of 8 placeholders
  const placeholders = Array.from({ length: 8 });

  return (
    <section className="">
      <h2 className="text-2xl font-semibold mb-4 dark:text-white">{title}</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 md:max-w-[1200px] gap-3">
        {loading
          ? placeholders.map((_, index) => (
              <div
                key={index}
                className={`flex flex-col h-auto gap-2 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden`}
              >
                {/* Image placeholder */}
                <div className="relative w-full h-56 bg-gray-300 dark:bg-zinc-700 rounded-t-xl"></div>

                <div className="p-3 flex flex-col gap-2">
                  {/* Title and price */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="h-4 bg-gray-300 dark:bg-zinc-600 rounded w-3/4 animate-pulse"></div>
                    <div className="h-4 bg-green-500 dark:bg-green-600 rounded w-1/4 animate-pulse"></div>
                  </div>

                  {/* Description */}
                  <div className="h-3 bg-gray-300 dark:bg-zinc-600 rounded w-full mt-2 animate-pulse"></div>
                  <div className="h-3 bg-gray-300 dark:bg-zinc-600 rounded w-5/6 animate-pulse"></div>

                  {/* Location and rating */}
                  <div className="flex items-center justify-between mt-2 animate-pulse">
                    <div className="h-3 bg-gray-300 dark:bg-zinc-600 rounded w-1/3 animate-pulse"></div>
                    <div className="h-3 bg-gray-300 dark:bg-zinc-600 rounded w-1/6 animate-pulse"></div>
                  </div>
                </div>
              </div>
            ))
          : products.map((product, index) => (
              <Item key={product._id} product={product} index={index} />
            ))}
      </div>
    </section>
  );
}
