import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import SocialLoginButtons from '../components/auth/SocialLoginButtons';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Redirect if already logged in
    useEffect(() => {
        if (user && !authLoading) {
            const from = location.state?.from || '/';
            navigate(from);
        }
    }, [user, authLoading, navigate, location]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password, rememberMe);
            // Redirect to the page they came from, or home if no previous page
            const from = location.state?.from || '/';
            navigate(from);
        } catch (err) {
            console.error("Login Error:", err);
            // Show the actual error message from backend if available
            const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to sign in.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="min-h-[80vh] flex items-center justify-center px-4">
            <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-zinc-800">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome Back</h1>
                    <p className="text-gray-500 dark:text-gray-400">Sign in to continue to Shitblej</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-500 p-3 rounded-lg mb-4 text-sm text-center">
                        {error}
                    </div>
                )}

                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                        <input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email" 
                            required
                            className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 outline-none transition-all dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                        <div className="relative">
                            <input 
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password" 
                                required
                                className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 outline-none transition-all dark:text-white pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                        <label className="flex items-center text-gray-500 dark:text-gray-400 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="mr-2 rounded text-green-500" 
                            />
                            Remember me
                        </label>
                        <Link to="#" className="text-green-500 hover:text-green-600 font-medium">
                            Forgot password?
                        </Link>
                    </div>

                    <button 
                        disabled={loading}
                        className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-70 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors shadow-lg shadow-green-500/30"
                    >
                        {loading ? 'Signing in...' : 'Sign in'}
                    </button>
                </form>

                <SocialLoginButtons />

                <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    Don't have an account?{' '}
                    <Link to="/signup" className="text-green-500 hover:text-green-600 font-semibold">
                        Sign up
                    </Link>
                </p>
            </div>
        </section>
    );
}