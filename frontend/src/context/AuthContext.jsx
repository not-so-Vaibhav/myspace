
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (userId, isInitial = false) => {
        // Only trigger full layout loading state on initial load or user change
        if (isInitial || !profile || profile.id !== userId) {
            setLoading(true);
        }
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching profile:', error);
            }

            setProfile(data || null);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let isMounted = true;

        // Check active session on initial mount
        supabase.auth.getSession()
            .then(({ data: { session } }) => {
                if (!isMounted) return;
                setUser(session?.user ?? null);
                if (session?.user) {
                    fetchProfile(session.user.id, true);
                } else {
                    setLoading(false);
                }
            })
            .catch((error) => {
                console.error('Unable to restore the Supabase session:', error);
                if (isMounted) {
                    setUser(null);
                    setProfile(null);
                    setLoading(false);
                }
            });

        // Listen for auth changes (token refreshes, sign in/out)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (!isMounted) return;
            // Avoid duplicate fetch on INITIAL_SESSION since getSession() handles startup
            if (event === 'INITIAL_SESSION') return;

            setUser(session?.user ?? null);
            if (session?.user) {
                // Background update without resetting loading state and unmounting components
                fetchProfile(session.user.id, false);
            } else {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        setProfile(null);
        setUser(null);
    };

    const hasRole = (requiredRole) => {
        if (!profile?.role) return false;
        return profile.role.toLowerCase() === requiredRole.toLowerCase();
    };

    const value = {
        user,
        profile,
        loading,
        signOut,
        hasRole, // Export helper
        fetchProfile,
        setProfile,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
