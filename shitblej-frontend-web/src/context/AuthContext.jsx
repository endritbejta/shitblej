import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { login as apiLogin, signup as apiSignup, getCurrentUser } from '../api/auth';
import {
    UNAUTHORIZED_EVENT,
    clearSession,
    getCachedUser,
    getToken,
    setCachedUser,
    setToken,
} from '../lib/authToken';
import { disconnectSocket } from '../lib/socket';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    // Hydrate synchronously from the cached profile, so the very first render
    // already knows who is signed in. Without it the app either blocks on the
    // API (a blank page - measured at ~14s against a cold backend) or paints
    // signed-out chrome and corrects itself later, which is worse than showing
    // nothing because it is actively wrong.
    const [user, setUser] = useState(getCachedUser);

    // `loading` now means "revalidating in the background", not "nothing may
    // render yet". A guest is never loading.
    const [loading, setLoading] = useState(() => Boolean(getToken()));

    // Keep the cache in step with state so the next load hydrates correctly.
    const applyUser = useCallback((next) => {
        setUser(next);
        setCachedUser(next);
    }, []);

    // End the session locally. Disconnecting the socket is not optional: it is
    // authenticated for its lifetime and the user stays joined to a room named
    // after their id, so an open socket keeps delivering the previous account's
    // messages and notifications into this tab until a reload.
    const endSession = useCallback(() => {
        clearSession();
        disconnectSocket();
        setUser(null);
    }, []);

    // Revalidate whatever was hydrated: confirm it, refresh it, or - when the
    // token is genuinely dead - let the 401 path below end the session.
    useEffect(() => {
        if (!getToken()) {
            setLoading(false);
            return;
        }

        let cancelled = false;
        getCurrentUser()
            .then((userData) => {
                if (!cancelled) applyUser(userData);
            })
            .catch((error) => {
                // Deliberately does NOT end the session. A 401 is already
                // handled by the API client, which clears the session and
                // raises UNAUTHORIZED_EVENT. Anything else - the backend
                // asleep, the network down - is not evidence that the session
                // is invalid, and signing someone out over it (which is what
                // this used to do) loses their session every time the API
                // hiccups.
                if (import.meta.env.DEV) {
                    console.error('Auth revalidation failed:', error);
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [applyUser]);

    // The API client broadcasts this when a request comes back 401 - the token
    // expired, was revoked, or the account is gone.
    useEffect(() => {
        const onUnauthorized = () => endSession();
        window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
        return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    }, [endSession]);

    const login = async (email, password, rememberMe = false) => {
        const data = await apiLogin(email, password);
        setToken(data.token, { remember: rememberMe });
        applyUser(data.data); // Backend returns user in data.data
        return data;
    };

    const signup = async (username, email, password) => {
        const data = await apiSignup(username, email, password);
        setToken(data.token, { remember: true });
        applyUser(data.data); // Backend returns user in data.data
        return data;
    };

    const logout = () => {
        endSession();
    };

    const refreshUser = async () => {
        try {
            applyUser(await getCurrentUser());
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

    // No render gate: children paint immediately. Every consumer already
    // tolerates a null user - that is what every guest visit looks like - and
    // the pages that need to tell "signed out" from "not known yet" read
    // `loading` (Login, Signup, Profile, ProtectedRoute). That handling was
    // already written and was simply unreachable while the gate stood.
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
