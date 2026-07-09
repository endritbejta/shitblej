import React from 'react';
import { FaGoogle, FaApple } from 'react-icons/fa';
import { loginWithGoogle, loginWithApple } from '../../api/auth';

const SocialLoginButtons = () => {
    const handleGoogleLogin = async () => {
        try {
            await loginWithGoogle();
            console.log("Google login initiated");
        } catch (error) {
            console.error("Google login failed", error);
        }
    };

    const handleAppleLogin = async () => {
        try {
            await loginWithApple();
            console.log("Apple login initiated");
        } catch (error) {
            console.error("Apple login failed", error);
        }
    };

    return (
        <div className="mt-6">
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-black text-gray-500">Or continue with</span>
                </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                    onClick={handleGoogleLogin}
                    type="button"
                    className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-zinc-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
                >
                    <FaGoogle className="h-5 w-5 text-red-500 mr-2" />
                    <span>Google</span>
                </button>

                <button
                    onClick={handleAppleLogin}
                    type="button"
                    className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-zinc-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
                >
                    <FaApple className="h-5 w-5 text-black dark:text-white mr-2" />
                    <span>Apple</span>
                </button>
            </div>
        </div>
    );
};

export default SocialLoginButtons;
