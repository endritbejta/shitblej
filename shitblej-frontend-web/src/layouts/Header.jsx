import React, { useState, useRef, useEffect } from 'react'
import { FiMenu, FiX } from 'react-icons/fi'
import HeaderDrawer from '../components/header/HeaderDrawer';
import SearchBar from '../components/SearchBar';
import { Link } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { FiUser, FiMail, FiPlusSquare } from 'react-icons/fi';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';

const Header = () => {
    const { t } = useTranslation();
    const [headerDrawerOpen, setHeaderDrawerOpen] = useState(false);
    const [headerHeight, setHeaderHeight] = useState(0);
    const headerRef = useRef(null);
    const { user } = useAuth();

    function toggleHeaderDrawer() {
        setHeaderDrawerOpen(prev => !prev);
    }

    useEffect(() => {
        if (headerRef.current) {
            setHeaderHeight(headerRef.current.offsetHeight);
        }
    }, []);

    useEffect(() => {
        document.body.style.overflow = headerDrawerOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [headerDrawerOpen]);

    return (
        <header
            ref={headerRef}
            className='fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800 transition-all duration-300'
        >
            <div className="max-w-6xl mx-auto px-4">
                {/* Top Row: Logo, Auth, Search */}
                <div className="flex items-center justify-between py-3">
                    <Link to="/" className='text-2xl font-extrabold tracking-tight text-green-500 hover:text-green-600 transition-colors font-[SairaStencilOne]'>
                        SHITBLEJ
                    </Link>

                    

                    <div className="flex items-center gap-4">
                        {/* Search Bar - Desktop & Mobile */}
                        <SearchBar />
                        
                        {/* Desktop Auth & Language */}
                        <div className="hidden md:flex items-center gap-4">
                            <LanguageSwitcher />
                            {user ? (
                                <>
                                    <Link to="/sell" className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-green-500 transition-colors font-medium whitespace-nowrap">
                                        <FiPlusSquare className="text-lg" />
                                        {t('nav.sell')}
                                    </Link>
                                    <Link to="/inbox" className="text-gray-600 dark:text-gray-300 hover:text-green-500 transition-colors">
                                        <FiMail className="text-xl" />
                                    </Link>
                                    <Link to="/profile" className="text-gray-600 dark:text-gray-300 hover:text-green-500 transition-colors">
                                        <FiUser className="text-xl" />
                                    </Link>
                                </>
                            ) : (
                                <Link to="/login" className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-full font-medium transition-colors shadow-lg shadow-green-500/20 whitespace-nowrap">
                                    {t('nav.signin')}
                                </Link>
                            )}
                        </div>

                        

                        {/* Mobile Menu Button */}
                        <button
                            className='cursor-pointer text-3xl md:hidden text-gray-900 dark:text-white transition-colors'
                            onClick={toggleHeaderDrawer}
                        >
                            {headerDrawerOpen ? <FiX /> : <FiMenu />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Full-width border separator */}
            <div className="hidden md:block w-full border-t border-gray-200 dark:border-zinc-800"></div>

            {/* Desktop Navigation Categories with equal padding */}
            <div className="max-w-6xl mx-auto px-4">
                <nav className="hidden md:flex items-center justify-center gap-6 py-3">
                    <Link to="/collections/ladies" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-green-500 transition-colors">
                        {t('nav.ladies')}
                    </Link>
                    <Link to="/collections/men" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-green-500 transition-colors">
                        {t('nav.men')}
                    </Link>
                    <Link to="/collections/designer-items" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-green-500 transition-colors">
                        {t('nav.designer_items')}
                    </Link>
                    <Link to="/collections/children" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-green-500 transition-colors">
                        {t('nav.children')}
                    </Link>
                    <Link to="/collections/home" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-green-500 transition-colors">
                        {t('nav.home')}
                    </Link>
                    <Link to="/collections/electronics" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-green-500 transition-colors">
                        {t('nav.electronics')}
                    </Link>
                    <Link to="/collections/entertainment" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-green-500 transition-colors">
                        {t('nav.entertainment')}
                    </Link>
                    <Link to="/collections/hobby-collector" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-green-500 transition-colors">
                        {t('nav.hobby_collector')}
                    </Link>
                    <Link to="/collections/sport" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-green-500 transition-colors">
                        {t('nav.sport')}
                    </Link>
                </nav>

                {/* Mobile Search Bar */}
                
            </div>

            <HeaderDrawer
                headerDrawerOpen={headerDrawerOpen}
                setHeaderDrawerOpen={setHeaderDrawerOpen}
                headerHeight={headerHeight}
            />
        </header>
    )
}

export default Header;
