import React, { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, signup as apiSignup, getCurrentUser } from '../api/auth';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

// Helper functions to get/set token from either storage
const getToken = () => {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
};

const setToken = (token, rememberMe = true) => {
    if (rememberMe) {
        localStorage.setItem('token', token);
        sessionStorage.removeItem('token'); // Clear session storage
    } else {
        sessionStorage.setItem('token', token);
        localStorage.removeItem('token'); // Clear local storage
    }
};

const removeToken = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
};

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for token in both storages and load user
        const token = getToken();
        if (token) {
            getCurrentUser()
                .then(userData => {
                    setUser(userData);
                })
                .catch(() => {
                    removeToken();
                })
                .finally(() => {
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email, password, rememberMe = false) => {
        const data = await apiLogin(email, password);
        setToken(data.token, rememberMe);
        setUser(data.data); // Backend returns user in data.data
        return data;
    };

    const signup = async (username, email, password) => {
        const data = await apiSignup(username, email, password);
        setToken(data.token, true); // Default to remember for signup
        setUser(data.data); // Backend returns user in data.data
        return data;
    };

    const logout = () => {
        removeToken();
        setUser(null);
    };

    const refreshUser = async () => {
        try {
            const userData = await getCurrentUser();
            setUser(userData);
        } catch (error) {
            console.error('Failed to refresh user:', error);
        }
    };

    const value = {
        user,
        login,
        signup,
        logout,
        refreshUser,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
