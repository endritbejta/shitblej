import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import AppLayout from "./layouts/AppLayout";
import ProtectedRoute from "./routes/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { CollectionCacheProvider } from "./context/CollectionCacheContext";
import { WishlistProvider } from "./context/WishlistContext";
import { SearchProvider } from "./context/SearchContext";
import Loading from "./components/Loading";
// Lazy-loaded pages
const Home = lazy(() => import("./pages/Home"));
const Sell = lazy(() => import("./pages/Sell"));
const Inbox = lazy(() => import("./pages/Inbox"));
const Profile = lazy(() => import("./pages/Profile"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const CollectionPage = lazy(() => import("./pages/Collection"));
const SearchResults = lazy(() => import("./pages/Search"));
const WishlistPage = lazy(() => import("./pages/Wishlist"));


export default function App() {
    return (
        <AuthProvider>
            <WishlistProvider>
                <CollectionCacheProvider>
                    <BrowserRouter>
                        <SearchProvider>
                            <Suspense fallback={<Loading fullScreen />}>
                                <Routes>
                                    <Route path="products/:id" element={<ProductDetail />} />
                                    <Route element={<AppLayout />}>
                                        {/* Public routes */}
                                        <Route index element={<Home />} />
                                        <Route path="collections/:id" element={<CollectionPage />} />
                                        <Route path="search" element={<SearchResults />} />
                                        <Route path="wishlist" element={<WishlistPage />} />
                                        <Route path="login" element={<Login />} />
                                        <Route path="signup" element={<Signup />} />

                                        {/* Protected routes */}
                                        <Route element={<ProtectedRoute />}>
                                            <Route path="sell" element={<Sell />} />
                                            <Route path="inbox" element={<Inbox />} />
                                            <Route path="profile" element={<Profile />} />
                                        </Route>

                                        {/* 404 fallback */}
                                        <Route path="*" element={<NotFound />} />
                                    </Route>
                                </Routes>
                            </Suspense>
                        </SearchProvider>
                    </BrowserRouter>
                </CollectionCacheProvider>
            </WishlistProvider>
        </AuthProvider>
    );
}
