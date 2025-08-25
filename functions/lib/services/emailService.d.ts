interface AppointmentDetails {
    serviceType: string;
    appointmentDate: string;
    address: string;
    notes?: string;
}
declare class EmailService {
    private transporter;
    constructor();
    sendWelcomeEmail(userEmail: string, userName: string): Promise<void>;
    sendAppointmentConfirmation(userEmail: string, userName: string, appointmentDetails: AppointmentDetails): Promise<void>;
    sendPasswordResetEmail(userEmail: string, resetLink: string): Promise<void>;
    private sendEmail;
    verifyConnection(): Promise<boolean>;
}
export declare const emailService: EmailService;
export {};
//# sourceMappingURL=emailService.d.ts.map