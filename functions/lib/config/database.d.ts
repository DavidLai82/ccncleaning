import * as admin from 'firebase-admin';
import { SupabaseClient } from '@supabase/supabase-js';
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
declare const config: DatabaseConfig;
export declare const initializeDatabases: () => void;
export declare const getFirestore: () => admin.firestore.Firestore;
export declare const getSupabase: () => SupabaseClient<any, "public", "public", any, any>;
export declare const checkFirebaseHealth: () => Promise<boolean>;
export declare const checkSupabaseHealth: () => Promise<boolean>;
export declare const getActiveDatabaseType: () => Promise<'firebase' | 'supabase'>;
export { config };
//# sourceMappingURL=database.d.ts.map