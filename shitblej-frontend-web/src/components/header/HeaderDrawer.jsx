import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import HeaderDrawerCategories from "./HeaderDrawerCategories";
import { useAuth } from "../../context/AuthContext";
import LanguageSwitcher from "../LanguageSwitcher";

const HeaderDrawer = ({ headerDrawerOpen, setHeaderDrawerOpen, headerHeight }) => {
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
        <div
            ref={drawerRef}
            style={{
                // Apply height ONLY on mobile (md:hidden handles visibility)
                height: `calc(100vh - ${headerHeight}px)`,
                top: `${headerHeight}px`,   
            }}
            className={`
                py-4 fixed left-0 w-full bg-white dark:bg-black
                transition-transform duration-300 ease-in-out flex flex-col gap-2 overflow-y-scroll
                z-[100]
                md:hidden
                ${headerDrawerOpen ? "translate-x-0" : "translate-x-full"}
                md:relative md:translate-x-0 md:h-auto md:w-auto md:flex md:flex-row md:items-center
            `}
        >
            <HeaderDrawerCategories setHeaderDrawerOpen={setHeaderDrawerOpen} />

            <div className="flex flex-col gap-2 my-2 px-4 md:hidden">
                {user ? (
                    <>
                        <Link to="/sell" className="bg-green-500 text-white py-3 rounded-xl text-center font-bold shadow-lg shadow-green-500/20" onClick={() => setHeaderDrawerOpen(false)}>
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
                    <Link to="/login" className="bg-green-500 text-white py-3 rounded-xl text-center font-bold shadow-lg shadow-green-500/20" onClick={() => setHeaderDrawerOpen(false)}>
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
