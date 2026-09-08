import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { login as apiLogin, signup as apiSignup, getCurrentUser } from '../api/auth';
import {
    UNAUTHORIZED_EVENT,
    clearToken,
    getToken,
    setToken,
} from '../lib/authToken';
import { disconnectSocket } from '../lib/socket';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // End the session locally. Disconnecting the socket is not optional: it is
    // authenticated for its lifetime and the user stays joined to a room named
    // after their id, so an open socket keeps delivering the previous account's
    // messages and notifications into this tab until a reload.
    const endSession = useCallback(() => {
        clearToken();
        disconnectSocket();
        setUser(null);
    }, []);

    useEffect(() => {
        const token = getToken();
        if (token) {
            getCurrentUser()
                .then(userData => {
                    setUser(userData);
                })
                .catch(() => {
                    endSession();
                })
                .finally(() => {
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }
    }, [endSession]);

    // The API client broadcasts this when a request comes back 401 - the token
    // expired, was revoked, or the account is gone. Without it the app kept a
    // stale user while every request failed, with no sign to the user.
    useEffect(() => {
        const onUnauthorized = () => endSession();
        window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
        return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    }, [endSession]);

    const login = async (email, password, rememberMe = false) => {
        const data = await apiLogin(email, password);
        setToken(data.token, { remember: rememberMe });
        setUser(data.data); // Backend returns user in data.data
        return data;
    };

    const signup = async (username, email, password) => {
        const data = await apiSignup(username, email, password);
        setToken(data.token, { remember: true });
        setUser(data.data); // Backend returns user in data.data
        return data;
    };

    const logout = () => {
        endSession();
    };

    const refreshUser = async () => {
        try {
            const userData = await getCurrentUser();
            setUser(userData);
        } catch (error) {
            if (import.meta.env.DEV) {
                console.error('Failed to refresh user:', error);
            }
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
            {/* NOTE: this gates the whole app - including public pages - on the
                auth round-trip, so first paint is a blank page while /users/:id
                is in flight. Worth making non-blocking, but that means every
                consumer must tolerate `user` being null on the first render,
                which needs checking across the component tree rather than
                being flipped here. */}
            {!loading && children}
        </AuthContext.Provider>
    );
}
