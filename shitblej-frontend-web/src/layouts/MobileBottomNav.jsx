import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaPlusCircle, FaInbox, FaUser, FaStore } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

export default function MobileBottomNav() {
    const location = useLocation();
    const { user } = useAuth();

    const navItems = [
        { path: '/', icon: FaHome, label: 'Home' },
        { path: '/collections/ladies', icon: FaStore, label: 'Shop' },
        { path: '/sell', icon: FaPlusCircle, label: 'Sell' },
        { path: '/inbox', icon: FaInbox, label: 'Inbox' },
        { path: user ? '/profile' : '/login', icon: FaUser, label: 'Profile' },
    ];

    const isActive = (path) => {
        if (path === '/') {
            return location.pathname === '/';
        }
        return location.pathname.startsWith(path);
    };

    // Hide on product detail pages
    if (location.pathname.startsWith('/products/')) {
        return null;
    }

    return (
        <nav className="md:hidden fixed bottom-4 left-6 right-6 z-40 flex justify-center">
            <div className="bg-white/30 dark:bg-zinc-900/50 backdrop-blur-xl rounded-3xl border border-gray-200 dark:border-zinc-800 shadow-2xl shadow-black/10 dark:shadow-black/30 w-full">
                <div className="flex items-center justify-around px-2 py-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);
                        
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-2xl transition-all duration-200 ${
                                    active 
                                        ? 'text-green-500 bg-green-50 dark:bg-green-900/20 scale-105' 
                                        : 'text-gray-700 dark:text-gray-400'
                                }`}
                            >
                                <Icon className={`text-lg ${active ? 'scale-110' : ''} transition-transform`} />
                                <span className={`text-xs font-medium ${active ? 'font-semibold' : ''}`}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
}
