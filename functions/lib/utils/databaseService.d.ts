export interface User {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
    avatar?: string;
    role: 'client' | 'admin' | 'provider';
    is_verified: boolean;
    created_at: any;
    updated_at?: any;
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
export declare class DatabaseService {
    private static instance;
    private constructor();
    static getInstance(): DatabaseService;
    createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User>;
    getUserById(userId: string): Promise<User | null>;
    getUserByEmail(email: string): Promise<User | null>;
    updateUser(userId: string, updateData: Partial<User>): Promise<User | null>;
    createAppointment(appointmentData: Omit<Appointment, 'id' | 'createdAt'>): Promise<Appointment>;
    getUserAppointments(userId: string): Promise<Appointment[]>;
    createPayment(paymentData: Omit<Payment, 'id' | 'createdAt'>): Promise<Payment>;
    getUserPayments(userId: string): Promise<Payment[]>;
    updatePaymentStatus(stripePaymentIntentId: string, status: Payment['status']): Promise<void>;
    updateAppointmentStatus(appointmentId: string, status: Appointment['status']): Promise<void>;
    getAllUsers(options: {
        limit: number;
        offset: number;
        role?: string;
        search?: string;
    }): Promise<{
        data: User[];
        total: number;
    }>;
    deleteUser(userId: string): Promise<boolean>;
    private createUserFallback;
    private getUserByIdFallback;
    private getUserByEmailFallback;
    private updateUserFallback;
    private createAppointmentFallback;
    private getUserAppointmentsFallback;
    private writeToSupabasePayment;
    private updateSupabasePaymentStatus;
    private updateSupabaseAppointmentStatus;
    private deleteSupabaseUser;
    private writeToSupabaseUser;
    private updateSupabaseUser;
    private writeToSupabaseAppointment;
    private convertSupabaseUser;
    private convertSupabaseAppointment;
    private convertSupabasePayment;
}
export declare const databaseService: DatabaseService;
//# sourceMappingURL=databaseService.d.ts.map