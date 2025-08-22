import * as admin from 'firebase-admin';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as functions from 'firebase-functions';

// Database configuration
export interface DatabaseConfig {
  primary: 'firebase' | 'supabase';
  firebase: {
    projectId: string;
  };
  supabase: {
    url: string;
    serviceKey: string;
  };
}

// Default configuration
const config: DatabaseConfig = {
  primary: 'firebase', // Firebase as primary, Supabase as failover
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || 'ccn-cleaning'
  },
  supabase: {
    url: process.env.SUPABASE_URL || 'https://ghplwkovzbbwfjdybivu.supabase.co',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdocGx3a292emJid2ZqZHliaXZ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTgzMzYzMiwiZXhwIjoyMDcxNDA5NjMyfQ.4xqF_Yb8AeTIW-Px_982N28X7r_-5za-wpGQXhoSZ9k'
  }
};

// Initialize clients
let firebaseAdmin: admin.app.App;
let supabaseClient: SupabaseClient;

export const initializeDatabases = () => {
  try {
    // Initialize Firebase Admin (if not already initialized)
    if (admin.apps.length === 0) {
      firebaseAdmin = admin.initializeApp({
        projectId: config.firebase.projectId,
      });
    } else {
      firebaseAdmin = admin.app();
    }

    // Initialize Supabase
    supabaseClient = createClient(
      config.supabase.url,
      config.supabase.serviceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    functions.logger.info('Database connections initialized');
  } catch (error) {
    functions.logger.error('Database initialization error:', error);
    throw error;
  }
};

// Get Firebase Firestore instance
export const getFirestore = () => {
  if (!firebaseAdmin) {
    initializeDatabases();
  }
  return admin.firestore();
};

// Get Supabase client
export const getSupabase = () => {
  if (!supabaseClient) {
    initializeDatabases();
  }
  return supabaseClient;
};

// Health check functions
export const checkFirebaseHealth = async (): Promise<boolean> => {
  try {
    const testDoc = admin.firestore().collection('_health').doc('test');
    await testDoc.get();
    return true;
  } catch (error) {
    functions.logger.error('Firebase health check failed:', error);
    return false;
  }
};

export const checkSupabaseHealth = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabaseClient.from('_health').select('*').limit(1);
    return !error;
  } catch (error) {
    functions.logger.error('Supabase health check failed:', error);
    return false;
  }
};

// Determine which database to use based on health
export const getActiveDatabaseType = async (): Promise<'firebase' | 'supabase'> => {
  if (config.primary === 'firebase') {
    const firebaseHealthy = await checkFirebaseHealth();
    if (firebaseHealthy) {
      return 'firebase';
    } else {
      functions.logger.warn('Firebase is down, falling back to Supabase');
      return 'supabase';
    }
  } else {
    const supabaseHealthy = await checkSupabaseHealth();
    if (supabaseHealthy) {
      return 'supabase';
    } else {
      functions.logger.warn('Supabase is down, falling back to Firebase');
      return 'firebase';
    }
  }
};

export { config };
