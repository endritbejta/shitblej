import { useRef } from 'react';
import { User, Camera } from 'lucide-react';

export default function ProfileHeader({ user, onAvatarChange, uploadingAvatar }) {
    const fileInputRef = useRef(null);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-gray-200 dark:border-zinc-800 shadow-sm">
            <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Avatar */}
                <div className="relative group">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-100 dark:border-zinc-800 bg-gray-200 dark:bg-zinc-800">
                        {user.image || user.avatar ? (
                            <img src={user.image || user.avatar} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <User className="h-10 w-10" />
                            </div>
                        )}
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={onAvatarChange}
                        className="hidden"
                    />
                    <button 
                        onClick={handleAvatarClick}
                        disabled={uploadingAvatar}
                        className="absolute bottom-0 right-0 bg-green-500 text-white p-2 rounded-full shadow-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {uploadingAvatar ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                        ) : (
                            <Camera className="h-4 w-4" />
                        )}
                    </button>
                </div>

                {/* User Info */}
                <div className="flex-1 text-center md:text-left">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{user.name}</h1>
                    <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
                    {user.createdAt && (
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                            Joined {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
