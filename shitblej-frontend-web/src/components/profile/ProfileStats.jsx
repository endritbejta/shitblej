import { FaBoxOpen, FaSignOutAlt } from 'react-icons/fa';

export default function ProfileStats({ listingsCount, onLogout }) {
    return (
        <div className="flex flex-col gap-3">
            <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-2xl p-4 text-center border border-gray-100 dark:border-zinc-800">
                <span className="block text-2xl font-bold text-gray-900 dark:text-white">
                    {listingsCount}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">Active Listings</span>
            </div>
            <button 
                onClick={onLogout}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 font-semibold rounded-xl hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
            >
                <FaSignOutAlt />
                Sign Out
            </button>
        </div>
    );
}
