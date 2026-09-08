import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import AppLayout from "./layouts/AppLayout";
import ProtectedRoute from "./routes/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { WishlistProvider } from "./context/WishlistContext";
import { SearchProvider } from "./context/SearchContext";
import ScrollToTop from "./components/ScrollToTop";
import ErrorBoundary from "./components/ErrorBoundary";
import Loading from "./components/Loading";
// Home is imported eagerly, every other route is lazy.
//
// It was lazy too, which cost the landing page a second serialised network
// round trip: the browser had to fetch and run the entry bundle, mount React,
// discover the dynamic import, fetch an 11 KiB chunk, and only then could the
// hero - the LCP element - even enter the DOM. Because <Suspense> wraps the
// whole <Routes>, nothing rendered in the meantime, not even the header, and
// then the entire tree mounted in one commit.
//
// Splitting the route a visitor is most likely to land on buys nothing: the
// chunk is fetched on essentially every session anyway.
import Home from "./pages/Home";

// Lazy-loaded pages
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
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <WishlistProvider>
                    <BrowserRouter>
                        <ScrollToTop />
                        <SearchProvider>
                            {/* Outermost catch: without this, any render error
                                - or a failed lazy() chunk after a deploy -
                                leaves a blank page with no way back. */}
                            <ErrorBoundary>
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
                            </ErrorBoundary>
                        </SearchProvider>
                    </BrowserRouter>
                </WishlistProvider>
            </AuthProvider>
        </QueryClientProvider>
    );
}
