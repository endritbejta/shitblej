import { useState, useRef, useEffect } from "react";
import { Menu, X, Mail, Plus, User, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import HeaderDrawer from "../components/header/HeaderDrawer";
import CategoryNav from "../components/header/CategoryNav";
import SearchTrigger from "../components/search/SearchTrigger";
import Button from "../components/ui/Button";
import Container from "../components/ui/Container";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
import { cn } from "../utils/cn";

const iconLink =
  "relative grid h-10 w-10 place-items-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-brand-600 dark:text-gray-400 dark:hover:bg-zinc-800 dark:hover:text-brand-400";

const Header = () => {
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerRef = useRef(null);
  const { user } = useAuth();
  const { count } = useWishlist();

  useEffect(() => {
    if (headerRef.current) setHeaderHeight(headerRef.current.offsetHeight);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const WishlistLink = ({ className }) => (
    <Link to="/wishlist" aria-label="Wishlist" className={cn(iconLink, className)}>
      <Heart className="h-[18px] w-[18px]" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );

  return (
    <header
      ref={headerRef}
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b bg-white/80 backdrop-blur-xl transition-all duration-300 dark:bg-black/70",
        scrolled ? "border-gray-200 shadow-sm dark:border-zinc-800" : "border-transparent"
      )}
    >
      <Container>
        <div className="flex h-16 items-center gap-4">
          <Link
            to="/"
            className="shrink-0 text-2xl font-extrabold tracking-tighter text-brand-500 transition-opacity hover:opacity-80"
          >
            SHITBLEJ
          </Link>

          {/* Primary, width-filling search (desktop) */}
          <div className="hidden flex-1 justify-center px-2 md:flex">
            <SearchTrigger variant="bar" className="w-full max-w-2xl" />
          </div>

          {/* Desktop actions */}
          <div className="hidden shrink-0 items-center gap-1.5 md:flex">
            <WishlistLink />
            {user ? (
              <>
                <Link to="/inbox" aria-label={t("nav.inbox")} className={iconLink}>
                  <Mail className="h-[18px] w-[18px]" />
                </Link>
                <Link to="/profile" aria-label={t("nav.profile")} className={iconLink}>
                  <User className="h-[18px] w-[18px]" />
                </Link>
                <Button to="/sell" size="sm" className="ml-1.5">
                  <Plus className="h-4 w-4" />
                  {t("nav.sell")}
                </Button>
              </>
            ) : (
              <>
                <Button to="/login" variant="ghost" size="sm">
                  {t("nav.signin")}
                </Button>
                <Button to="/sell" size="sm">
                  <Plus className="h-4 w-4" />
                  {t("nav.sell")}
                </Button>
              </>
            )}
          </div>

          {/* Mobile actions */}
          <div className="flex flex-1 items-center justify-end gap-1 md:hidden">
            <SearchTrigger variant="icon" />
            <WishlistLink />
            <button
              className="grid h-10 w-10 place-items-center rounded-full text-gray-900 dark:text-white"
              onClick={() => setDrawerOpen((v) => !v)}
              aria-label="Menu"
            >
              {drawerOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </Container>

      <CategoryNav />

      <HeaderDrawer
        headerDrawerOpen={drawerOpen}
        setHeaderDrawerOpen={setDrawerOpen}
        headerHeight={headerHeight}
      />
    </header>
  );
};

export default Header;
