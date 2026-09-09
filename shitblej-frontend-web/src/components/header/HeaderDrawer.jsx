import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import HeaderDrawerCategories from "./HeaderDrawerCategories";
import { useAuth } from "../../context/AuthContext";
import LanguageSwitcher from "../LanguageSwitcher";

const HeaderDrawer = ({ headerDrawerOpen, setHeaderDrawerOpen }) => {
    const drawerRef = useRef(null);
    const { user, logout } = useAuth();

    useEffect(() => {
        if (!headerDrawerOpen) return;

        function handleClickOutside(e) {
            if (drawerRef.current && !drawerRef.current.contains(e.target)) {
                setHeaderDrawerOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [headerDrawerOpen, setHeaderDrawerOpen]);

    const handleLogout = () => {
        logout();
        setHeaderDrawerOpen(false);
    };

    return (
        // `top-16 h-[calc(100vh-4rem)]` replaces an inline style computed from
        // a measured header height. That measurement cost a forced reflow on
        // every page mount (see layouts/Header.jsx); this drawer is md:hidden
        // and CategoryNav is hidden md:block, so wherever it is visible the
        // header is exactly the 64px row - the same 4rem AppLayout already
        // hardcodes as `pt-16`. Stating it in CSS is also correct on the first
        // render, which the measured version was not: headerHeight started at
        // 0, briefly putting the drawer at top:0 with height:100vh.
        <div
            ref={drawerRef}
            className={`
                py-4 fixed left-0 w-full bg-white dark:bg-black
                transition-transform duration-300 ease-in-out flex flex-col gap-2 overflow-y-scroll
                z-[100]
                top-16 h-[calc(100vh-4rem)]
                md:hidden
                ${headerDrawerOpen ? "translate-x-0" : "translate-x-full"}
                md:relative md:translate-x-0 md:h-auto md:w-auto md:flex md:flex-row md:items-center
            `}
        >
            <HeaderDrawerCategories setHeaderDrawerOpen={setHeaderDrawerOpen} />

            <div className="flex flex-col gap-2 my-2 px-4 md:hidden">
                {user ? (
                    <>
                        <Link to="/sell" className="bg-brand-600 text-white py-3 rounded-xl text-center font-bold shadow-lg shadow-brand-500/20" onClick={() => setHeaderDrawerOpen(false)}>
                            SELL ITEMS
                        </Link>
                        <Link to="/inbox" className="bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white py-3 rounded-xl text-center font-medium" onClick={() => setHeaderDrawerOpen(false)}>
                            INBOX
                        </Link>
                        <Link to="/profile" className="bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white py-3 rounded-xl text-center font-medium" onClick={() => setHeaderDrawerOpen(false)}>
                            PROFILE
                        </Link>
                        <button onClick={handleLogout} className="text-red-500 py-3 text-center font-medium">
                            Sign Out
                        </button>
                    </>
                ) : (
                    <Link to="/login" className="bg-brand-600 text-white py-3 rounded-xl text-center font-bold shadow-lg shadow-brand-500/20" onClick={() => setHeaderDrawerOpen(false)}>
                        SIGN IN
                    </Link>
                )}
            </div>

            {/* Language */}
            <div className="mt-2 flex items-center justify-between px-4 md:hidden">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Language</span>
                <LanguageSwitcher />
            </div>
        </div>
    );
};

export default HeaderDrawer;
