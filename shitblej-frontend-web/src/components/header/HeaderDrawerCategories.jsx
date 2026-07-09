import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, User, Gem, Baby, Home, Cpu, Film, Palette, Trophy } from 'lucide-react';

const categories = [
    { name: 'Ladies', slug: 'ladies', icon: <Sparkles size={18} /> },
    { name: 'Men', slug: 'men', icon: <User size={18} /> },
    { name: 'Designer Items', slug: 'designer-items', icon: <Gem size={18} /> },
    { name: 'Children', slug: 'children', icon: <Baby size={18} /> },
    { name: 'Home', slug: 'home', icon: <Home size={18} /> },
    { name: 'Electronics', slug: 'electronics', icon: <Cpu size={18} /> },
    { name: 'Entertainment', slug: 'entertainment', icon: <Film size={18} /> },
    { name: 'Hobby & Collector Items', slug: 'hobby-collector', icon: <Palette size={18} /> },
    { name: 'Sport', slug: 'sport', icon: <Trophy size={18} /> },
];

const HeaderDrawerCategories = ({ setHeaderDrawerOpen }) => {
    return (
        <div className="w-full flex-1 md:min-w-full h-full">
            <h2 className="text-gray-600 px-4 dark:text-gray-300 font-semibold mb-4">
                Categories
            </h2>

            <ul className="md:flex md:flex-wrap overflow-x-auto border-y-[1px] border-gray-300 dark:border-gray-500">
                {categories.map((cat, index) => (
                    <Link
                        to={`/collections/${cat.slug}`}
                        key={index}
                        className="flex items-center gap-3 py-4 px-4 border-b first:border-t md:first:border-t-0 last:border-b-0 
                                   cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-700 
                                   md:border-0 text-sm font-medium text-gray-600 dark:text-gray-300 
                                   hover:text-green-500 transition-colors"
                        onClick={() => setHeaderDrawerOpen(false)}
                    >
                        <span className="text-gray-700 dark:text-gray-200">
                            {cat.icon}
                        </span>
                        <span className="text-gray-700 dark:text-gray-200">
                            {cat.name}
                        </span>
                    </Link>
                ))}
            </ul>
        </div>
    );
};

export default HeaderDrawerCategories;
