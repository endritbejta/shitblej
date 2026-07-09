import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { updateUserProfile } from "../api/auth";
import { getProducts } from "../api/products";
import { useNavigate } from "react-router-dom";
import ProfileHeader from "../components/profile/ProfileHeader";
import ProfileStats from "../components/profile/ProfileStats";
import Collection from "../components/collections/Collection";

export default function Profile() {
    const { user, logout, loading: authLoading, refreshUser } = useAuth();
    const navigate = useNavigate();
    const [userProducts, setUserProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            navigate("/login");
            return;
        }

        async function fetchUserProducts() {
            if (user?._id) {
                try {
                    const products = await getProducts({ user: user._id });
                    setUserProducts(products);
                } catch (error) {
                    console.error("Failed to fetch user products:", error);
                } finally {
                    setLoadingProducts(false);
                }
            }
        }

        if (user) {
            fetchUserProducts();
        }
    }, [user, authLoading, navigate]);

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Image size should be less than 5MB');
            return;
        }

        try {
            setUploadingAvatar(true);
            
            // Create FormData
            const formData = new FormData();
            formData.append('image', file);

            // Upload to backend
            await updateUserProfile(user._id, formData);
            
            // Refresh user data to get updated avatar
            await refreshUser();
            
            alert('Profile picture updated successfully!');
        } catch (error) {
            console.error('Failed to upload avatar:', error);
            alert('Failed to update profile picture. Please try again.');
        } finally {
            setUploadingAvatar(false);
        }
    };

    if (authLoading || (!user && loadingProducts)) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="max-w-7xl mx-auto py-4">
            {/* Profile Header with Avatar */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 mb-8 border border-gray-200 dark:border-zinc-800 shadow-sm">
                <div className="flex flex-col md:flex-row items-center gap-8">
                    <ProfileHeader 
                        user={user} 
                        onAvatarChange={handleFileChange}
                        uploadingAvatar={uploadingAvatar}
                    />
                    
                    {/* Stats & Actions */}
                    <ProfileStats 
                        listingsCount={userProducts.length}
                        onLogout={handleLogout}
                    />
                </div>
            </div>

            {/* User Listings using Collection Component */}
            <Collection 
                title="My Listings" 
                products={userProducts} 
                loading={loadingProducts}
            />
        </div>
    );
}