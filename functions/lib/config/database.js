"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.getActiveDatabaseType = exports.checkSupabaseHealth = exports.checkFirebaseHealth = exports.getSupabase = exports.getFirestore = exports.initializeDatabases = void 0;
const admin = __importStar(require("firebase-admin"));
const supabase_js_1 = require("@supabase/supabase-js");
const functions = __importStar(require("firebase-functions"));
// Default configuration
const config = {
    primary: 'firebase',
    firebase: {
        projectId: process.env.FIREBASE_PROJECT_ID || 'ccn-cleaning'
    },
    supabase: {
        url: process.env.SUPABASE_URL || 'https://ghplwkovzbbwfjdybivu.supabase.co',
        serviceKey: process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdocGx3a292emJid2ZqZHliaXZ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTgzMzYzMiwiZXhwIjoyMDcxNDA5NjMyfQ.4xqF_Yb8AeTIW-Px_982N28X7r_-5za-wpGQXhoSZ9k'
    }
};
exports.config = config;
// Initialize clients
let firebaseAdmin;
let supabaseClient;
const initializeDatabases = () => {
    try {
        // Initialize Firebase Admin (if not already initialized)
        if (admin.apps.length === 0) {
            firebaseAdmin = admin.initializeApp({
                projectId: config.firebase.projectId,
            });
        }
        else {
            firebaseAdmin = admin.app();
        }
        // Initialize Supabase
        supabaseClient = (0, supabase_js_1.createClient)(config.supabase.url, config.supabase.serviceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });
        functions.logger.info('Database connections initialized');
    }
    catch (error) {
        functions.logger.error('Database initialization error:', error);
        throw error;
    }
};
exports.initializeDatabases = initializeDatabases;
// Get Firebase Firestore instance
const getFirestore = () => {
    if (!firebaseAdmin) {
        (0, exports.initializeDatabases)();
    }
    return admin.firestore();
};
exports.getFirestore = getFirestore;
// Get Supabase client
const getSupabase = () => {
    if (!supabaseClient) {
        (0, exports.initializeDatabases)();
    }
    return supabaseClient;
};
exports.getSupabase = getSupabase;
// Health check functions
const checkFirebaseHealth = async () => {
    try {
        const testDoc = admin.firestore().collection('_health').doc('test');
        await testDoc.get();
        return true;
    }
    catch (error) {
        functions.logger.error('Firebase health check failed:', error);
        return false;
    }
};
exports.checkFirebaseHealth = checkFirebaseHealth;
const checkSupabaseHealth = async () => {
    try {
        const { data, error } = await supabaseClient.from('_health').select('*').limit(1);
        return !error;
    }
    catch (error) {
        functions.logger.error('Supabase health check failed:', error);
        return false;
    }
};
exports.checkSupabaseHealth = checkSupabaseHealth;
// Determine which database to use based on health
const getActiveDatabaseType = async () => {
    if (config.primary === 'firebase') {
        const firebaseHealthy = await (0, exports.checkFirebaseHealth)();
        if (firebaseHealthy) {
            return 'firebase';
        }
        else {
            functions.logger.warn('Firebase is down, falling back to Supabase');
            return 'supabase';
        }
    }
    else {
        const supabaseHealthy = await (0, exports.checkSupabaseHealth)();
        if (supabaseHealthy) {
            return 'supabase';
        }
        else {
            functions.logger.warn('Supabase is down, falling back to Firebase');
            return 'firebase';
        }
    }
};
exports.getActiveDatabaseType = getActiveDatabaseType;
//# sourceMappingURL=database.js.map