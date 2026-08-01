// backend/config/supabaseClient.js
// Initialises the Supabase client for the Node.js backend.
// 
// IMPORTANT: The backend uses the anon key (no service role key configured).
// To bypass RLS, the backend uses the user's Supabase JWT token (passed from
// the frontend Authorization header) to create an authenticated per-request client.
// This satisfies the 'TO authenticated' RLS policies on all tables.

const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');
global.WebSocket = WebSocket;

const supabaseUrl = process.env.SUPABASE_URL || 'https://bxelrkxegyumuajizsvy.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_SERVICE_ROLE_KEY 
    || process.env.SUPABASE_ANON_KEY 
    || process.env.VITE_SUPABASE_ANON_KEY 
    || 'sb_publishable_BZPWastEbMSNRhhcxHyy_A_L5bB2kry';

if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('✅ [Supabase] Using SERVICE ROLE key — RLS bypassed.');
} else {
    console.log('⚠️  [Supabase] Using ANON key — RLS active. Add SUPABASE_SERVICE_ROLE_KEY to backend/.env to bypass.');
}

// Default client (anon key or service role if provided)
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
});

/**
 * Create an authenticated Supabase client using the user's JWT token.
 * This satisfies 'TO authenticated' RLS policies on all tables.
 * 
 * @param {string} accessToken - Supabase access_token from the user's session
 * @returns Supabase client authenticated as that user
 */
function createAuthenticatedClient(accessToken) {
    if (!accessToken) return supabase; // fallback to default
    return createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false },
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        }
    });
}

module.exports = supabase;
module.exports.createAuthenticatedClient = createAuthenticatedClient;
module.exports.supabaseUrl = supabaseUrl;
module.exports.supabaseAnonKey = supabaseAnonKey;
