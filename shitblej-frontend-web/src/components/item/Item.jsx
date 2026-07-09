import React from 'react'
import { FiHeart, FiMapPin } from 'react-icons/fi';
import { FaStar } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const Item = ({ product, index }) => {
    const sellerRating = product.user?.rating || product.seller?.rating || 0;
    const hasRating = sellerRating > 0;

    return (
        <Link to={`/products/${product._id}`} className={`flex flex-col h-auto gap-2 bg-white dark:bg-zinc-900 rounded-xl animation--slide-up opacity-0 overflow-hidden border border-gray-200 dark:border-zinc-800 hover:shadow-lg transition-all duration-300 hover:-translate-y-1`} style={{ animationDelay: `${index * 70}ms` }}>
            <div className='flex relative w-full h-56 item-media'>
                <img src={product.images[0]} alt={product.name} className='w-full h-full object-cover' />
                
                {/* Condition Badge */}
                {product.condition && (
                    <div className='absolute top-2 left-2 px-2 py-1 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-900 dark:text-white border border-gray-200 dark:border-zinc-700'>
                        {product.condition}
                    </div>
                )}
                
                {/* Favorite Button */}
                <button className='w-8 h-8 p-[5px] border-[1px] border-white/50 rounded-full absolute bottom-2 right-2 bg-white/30 dark:bg-zinc-900/30 backdrop-blur-sm hover:bg-white/50 dark:hover:bg-zinc-900/50 transition-colors'>
                    <FiHeart className='w-full h-full text-white' />
                </button>
            </div>
            
            <div className='p-3 flex flex-col gap-2'>
                <div className='flex items-start justify-between gap-2'>
                    <h3 className='text-base font-semibold dark:text-white line-clamp-1'>{product.name}</h3>
                    <p className='text-green-600 dark:text-green-500 font-bold text-lg whitespace-nowrap'>${product.price}</p>
                </div>
                
                <p className='text-gray-600 dark:text-gray-400 text-sm line-clamp-2'>{product.description}</p>
                
                {/* Location and Rating */}
                <div className='flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-1'>
                    {product.location && (
                        <div className='flex items-center gap-1'>
                            <FiMapPin className='text-green-500' />
                            <span className='line-clamp-1'>{product.location}</span>
                        </div>
                    )}
                    
                    {hasRating && (
                        <div className='flex items-center gap-1 text-yellow-500'>
                            <FaStar className='text-xs' />
                            <span className='font-medium text-gray-700 dark:text-gray-300'>{sellerRating.toFixed(1)}</span>
                        </div>
                    )}
                </div>
            </div>
        </Link>
    )
}

export default Item;