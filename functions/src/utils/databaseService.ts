import * as admin from 'firebase-admin';
import { getFirestore, getSupabase, getActiveDatabaseType } from '../config/database';
import * as functions from 'firebase-functions';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  role: 'client' | 'admin' | 'provider';
  isVerified: boolean;
  createdAt: any;
  updatedAt?: any;
}

export interface Appointment {
  id: string;
  userId: string;
  serviceType: string;
  appointmentDate: any;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  address: string;
  notes?: string;
  price?: number;
  createdAt: any;
  updatedAt?: any;
}

export interface Payment {
  id: string;
  userId: string;
  appointmentId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  stripePaymentIntentId: string;
  createdAt: any;
  updatedAt?: any;
}

export class DatabaseService {
  private static instance: DatabaseService;
  
  private constructor() {}
  
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  // USER OPERATIONS
  async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const dbType = await getActiveDatabaseType();
    
    try {
      if (dbType === 'firebase') {
        const firestore = getFirestore();
        const userRef = firestore.collection('users').doc();
        const timestamp = admin.firestore.FieldValue.serverTimestamp();
        
        const userDoc = {
          ...userData,
          createdAt: timestamp,
          updatedAt: timestamp
        };
        
        await userRef.set(userDoc);
        
        // Also write to Supabase for backup
        await this.writeToSupabaseUser(userRef.id, { ...userData, id: userRef.id });
        
        return {
          id: userRef.id,
          ...userData,
          createdAt: timestamp
        };
        
      } else {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('users')
          .insert([{
            ...userData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single();
        
        if (error) throw error;
        
        // Convert Supabase format to our format
        return this.convertSupabaseUser(data);
      }
    } catch (error) {
      functions.logger.error(`Error creating user with ${dbType}:`, error);
      
      // Try fallback database
      const fallbackType = dbType === 'firebase' ? 'supabase' : 'firebase';
      functions.logger.info(`Attempting fallback to ${fallbackType}`);
      
      return await this.createUserFallback(userData, fallbackType);
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    const dbType = await getActiveDatabaseType();
    
    try {
      if (dbType === 'firebase') {
        const firestore = getFirestore();
        const userDoc = await firestore.collection('users').doc(userId).get();
        
        if (!userDoc.exists) return null;
        
        return {
          id: userDoc.id,
          ...userDoc.data()
        } as User;
        
      } else {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (error || !data) return null;
        
        return this.convertSupabaseUser(data);
      }
    } catch (error) {
      functions.logger.error(`Error getting user with ${dbType}:`, error);
      
      // Try fallback database
      const fallbackType = dbType === 'firebase' ? 'supabase' : 'firebase';
      return await this.getUserByIdFallback(userId, fallbackType);
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const dbType = await getActiveDatabaseType();
    
    try {
      if (dbType === 'firebase') {
        const firestore = getFirestore();
        const querySnapshot = await firestore
          .collection('users')
          .where('email', '==', email)
          .limit(1)
          .get();
        
        if (querySnapshot.empty) return null;
        
        const userDoc = querySnapshot.docs[0];
        return {
          id: userDoc.id,
          ...userDoc.data()
        } as User;
        
      } else {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single();
        
        if (error || !data) return null;
        
        return this.convertSupabaseUser(data);
      }
    } catch (error) {
      functions.logger.error(`Error getting user by email with ${dbType}:`, error);
      
      const fallbackType = dbType === 'firebase' ? 'supabase' : 'firebase';
      return await this.getUserByEmailFallback(email, fallbackType);
    }
  }

  async updateUser(userId: string, updateData: Partial<User>): Promise<User | null> {
    const dbType = await getActiveDatabaseType();
    
    try {
      if (dbType === 'firebase') {
        const firestore = getFirestore();
        const userRef = firestore.collection('users').doc(userId);
        
        await userRef.update({
          ...updateData,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Also update in Supabase
        await this.updateSupabaseUser(userId, updateData);
        
        const updatedDoc = await userRef.get();
        return updatedDoc.exists ? {
          id: updatedDoc.id,
          ...updatedDoc.data()
        } as User : null;
        
      } else {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('users')
          .update({
            ...updateData,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
          .select()
          .single();
        
        if (error) throw error;
        
        return this.convertSupabaseUser(data);
      }
    } catch (error) {
      functions.logger.error(`Error updating user with ${dbType}:`, error);
      
      const fallbackType = dbType === 'firebase' ? 'supabase' : 'firebase';
      return await this.updateUserFallback(userId, updateData, fallbackType);
    }
  }

  // APPOINTMENT OPERATIONS
  async createAppointment(appointmentData: Omit<Appointment, 'id' | 'createdAt'>): Promise<Appointment> {
    const dbType = await getActiveDatabaseType();
    
    try {
      if (dbType === 'firebase') {
        const firestore = getFirestore();
        const appointmentRef = firestore.collection('appointments').doc();
        const timestamp = admin.firestore.FieldValue.serverTimestamp();
        
        const appointmentDoc = {
          ...appointmentData,
          createdAt: timestamp,
          updatedAt: timestamp
        };
        
        await appointmentRef.set(appointmentDoc);
        
        // Also write to Supabase
        await this.writeToSupabaseAppointment(appointmentRef.id, { ...appointmentData, id: appointmentRef.id });
        
        return {
          id: appointmentRef.id,
          ...appointmentData,
          createdAt: timestamp
        };
        
      } else {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('appointments')
          .insert([{
            ...appointmentData,
            appointment_date: appointmentData.appointmentDate,
            service_type: appointmentData.serviceType,
            user_id: appointmentData.userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single();
        
        if (error) throw error;
        
        return this.convertSupabaseAppointment(data);
      }
    } catch (error) {
      functions.logger.error(`Error creating appointment with ${dbType}:`, error);
      
      const fallbackType = dbType === 'firebase' ? 'supabase' : 'firebase';
      return await this.createAppointmentFallback(appointmentData, fallbackType);
    }
  }

  async getUserAppointments(userId: string): Promise<Appointment[]> {
    const dbType = await getActiveDatabaseType();
    
    try {
      if (dbType === 'firebase') {
        const firestore = getFirestore();
        const querySnapshot = await firestore
          .collection('appointments')
          .where('userId', '==', userId)
          .orderBy('createdAt', 'desc')
          .get();
        
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Appointment));
        
      } else {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        return data.map(this.convertSupabaseAppointment);
      }
    } catch (error) {
      functions.logger.error(`Error getting user appointments with ${dbType}:`, error);
      
      const fallbackType = dbType === 'firebase' ? 'supabase' : 'firebase';
      return await this.getUserAppointmentsFallback(userId, fallbackType);
    }
  }

  // HELPER METHODS FOR FALLBACK
  private async createUserFallback(userData: Omit<User, 'id' | 'createdAt'>, dbType: 'firebase' | 'supabase'): Promise<User> {
    if (dbType === 'supabase') {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('users')
        .insert([{
          ...userData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) throw error;
      return this.convertSupabaseUser(data);
    } else {
      const firestore = getFirestore();
      const userRef = firestore.collection('users').doc();
      const timestamp = admin.firestore.FieldValue.serverTimestamp();
      
      const userDoc = {
        ...userData,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      
      await userRef.set(userDoc);
      
      return {
        id: userRef.id,
        ...userData,
        createdAt: timestamp
      };
    }
  }

  private async getUserByIdFallback(userId: string, dbType: 'firebase' | 'supabase'): Promise<User | null> {
    try {
      if (dbType === 'supabase') {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (error || !data) return null;
        return this.convertSupabaseUser(data);
      } else {
        const firestore = getFirestore();
        const userDoc = await firestore.collection('users').doc(userId).get();
        
        if (!userDoc.exists) return null;
        
        return {
          id: userDoc.id,
          ...userDoc.data()
        } as User;
      }
    } catch (error) {
      functions.logger.error(`Fallback ${dbType} also failed:`, error);
      return null;
    }
  }

  private async getUserByEmailFallback(email: string, dbType: 'firebase' | 'supabase'): Promise<User | null> {
    try {
      if (dbType === 'supabase') {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single();
        
        if (error || !data) return null;
        return this.convertSupabaseUser(data);
      } else {
        const firestore = getFirestore();
        const querySnapshot = await firestore
          .collection('users')
          .where('email', '==', email)
          .limit(1)
          .get();
        
        if (querySnapshot.empty) return null;
        
        const userDoc = querySnapshot.docs[0];
        return {
          id: userDoc.id,
          ...userDoc.data()
        } as User;
      }
    } catch (error) {
      functions.logger.error(`Fallback ${dbType} also failed:`, error);
      return null;
    }
  }

  private async updateUserFallback(userId: string, updateData: Partial<User>, dbType: 'firebase' | 'supabase'): Promise<User | null> {
    try {
      if (dbType === 'supabase') {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('users')
          .update({
            ...updateData,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
          .select()
          .single();
        
        if (error) throw error;
        return this.convertSupabaseUser(data);
      } else {
        const firestore = getFirestore();
        const userRef = firestore.collection('users').doc(userId);
        
        await userRef.update({
          ...updateData,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        const updatedDoc = await userRef.get();
        return updatedDoc.exists ? {
          id: updatedDoc.id,
          ...updatedDoc.data()
        } as User : null;
      }
    } catch (error) {
      functions.logger.error(`Fallback ${dbType} also failed:`, error);
      return null;
    }
  }

  private async createAppointmentFallback(appointmentData: Omit<Appointment, 'id' | 'createdAt'>, dbType: 'firebase' | 'supabase'): Promise<Appointment> {
    if (dbType === 'supabase') {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('appointments')
        .insert([{
          ...appointmentData,
          appointment_date: appointmentData.appointmentDate,
          service_type: appointmentData.serviceType,
          user_id: appointmentData.userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) throw error;
      return this.convertSupabaseAppointment(data);
    } else {
      const firestore = getFirestore();
      const appointmentRef = firestore.collection('appointments').doc();
      const timestamp = admin.firestore.FieldValue.serverTimestamp();
      
      const appointmentDoc = {
        ...appointmentData,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      
      await appointmentRef.set(appointmentDoc);
      
      return {
        id: appointmentRef.id,
        ...appointmentData,
        createdAt: timestamp
      };
    }
  }

  private async getUserAppointmentsFallback(userId: string, dbType: 'firebase' | 'supabase'): Promise<Appointment[]> {
    try {
      if (dbType === 'supabase') {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data.map(this.convertSupabaseAppointment);
      } else {
        const firestore = getFirestore();
        const querySnapshot = await firestore
          .collection('appointments')
          .where('userId', '==', userId)
          .orderBy('createdAt', 'desc')
          .get();
        
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Appointment));
      }
    } catch (error) {
      functions.logger.error(`Fallback ${dbType} also failed:`, error);
      return [];
    }
  }

  // BACKUP WRITE METHODS
  private async writeToSupabaseUser(id: string, userData: User): Promise<void> {
    try {
      const supabase = getSupabase();
      await supabase
        .from('users')
        .upsert({
          id: id,
          email: userData.email,
          first_name: userData.firstName,
          last_name: userData.lastName,
          phone: userData.phone,
          avatar: userData.avatar,
          role: userData.role,
          is_verified: userData.isVerified,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      functions.logger.warn('Failed to backup user to Supabase:', error);
    }
  }

  private async updateSupabaseUser(id: string, updateData: Partial<User>): Promise<void> {
    try {
      const supabase = getSupabase();
      await supabase
        .from('users')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
    } catch (error) {
      functions.logger.warn('Failed to update user in Supabase:', error);
    }
  }

  private async writeToSupabaseAppointment(id: string, appointmentData: Appointment): Promise<void> {
    try {
      const supabase = getSupabase();
      await supabase
        .from('appointments')
        .upsert({
          id: id,
          user_id: appointmentData.userId,
          service_type: appointmentData.serviceType,
          appointment_date: appointmentData.appointmentDate,
          status: appointmentData.status,
          address: appointmentData.address,
          notes: appointmentData.notes,
          price: appointmentData.price,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      functions.logger.warn('Failed to backup appointment to Supabase:', error);
    }
  }

  // CONVERSION HELPERS
  private convertSupabaseUser(data: any): User {
    return {
      id: data.id,
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name,
      phone: data.phone,
      avatar: data.avatar,
      role: data.role,
      isVerified: data.is_verified,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private convertSupabaseAppointment(data: any): Appointment {
    return {
      id: data.id,
      userId: data.user_id,
      serviceType: data.service_type,
      appointmentDate: data.appointment_date,
      status: data.status,
      address: data.address,
      notes: data.notes,
      price: data.price,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}

// Export singleton instance
export const databaseService = DatabaseService.getInstance();
