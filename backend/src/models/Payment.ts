import mongoose, { Document, Schema } from 'mongoose';

export interface IPayment extends Document {
  _id: string;
  user: string;
  appointment: string;
  stripePaymentIntentId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'cancelled' | 'refunded';
  paymentMethod?: {
    type: 'card' | 'bank_account' | 'wallet';
    brand?: string;
    last4?: string;
  };
  refundId?: string;
  refundAmount?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  appointment: {
    type: Schema.Types.ObjectId,
    ref: 'Appointment',
    required: [true, 'Appointment is required']
  },
  stripePaymentIntentId: {
    type: String,
    required: [true, 'Stripe Payment Intent ID is required'],
    unique: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount must be non-negative']
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    uppercase: true,
    match: [/^[A-Z]{3}$/, 'Currency must be a valid 3-letter code']
  },
  status: {
    type: String,
    enum: ['pending', 'succeeded', 'failed', 'cancelled', 'refunded'],
    required: [true, 'Payment status is required']
  },
  paymentMethod: {
    type: {
      type: String,
      enum: ['card', 'bank_account', 'wallet']
    },
    brand: String,
    last4: String
  },
  refundId: {
    type: String,
    default: null
  },
  refundAmount: {
    type: Number,
    min: [0, 'Refund amount must be non-negative']
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes
paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ appointment: 1 });
paymentSchema.index({ stripePaymentIntentId: 1 });
paymentSchema.index({ status: 1 });

// Instance method to check if payment is refundable
paymentSchema.methods.isRefundable = function(this: IPayment): boolean {
  const daysSincePayment = (new Date().getTime() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  return this.status === 'succeeded' && daysSincePayment <= 30;
};

export default mongoose.model<IPayment>('Payment', paymentSchema);
