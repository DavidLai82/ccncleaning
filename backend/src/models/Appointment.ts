import mongoose, { Document, Schema } from 'mongoose';

export interface IAppointment extends Document {
  _id: string;
  user: string;
  provider?: string;
  title: string;
  description?: string;
  dateTime: Date;
  duration: number; // in minutes
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  price: number;
  currency: string;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  paymentIntentId?: string;
  location?: {
    type: 'online' | 'in-person';
    address?: string;
    meetingLink?: string;
  };
  notes?: string;
  reminderSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema<IAppointment>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  provider: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  title: {
    type: String,
    required: [true, 'Appointment title is required'],
    trim: true,
    maxLength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxLength: [500, 'Description cannot exceed 500 characters']
  },
  dateTime: {
    type: Date,
    required: [true, 'Appointment date and time is required'],
    validate: {
      validator: function(this: IAppointment, value: Date) {
        return value > new Date();
      },
      message: 'Appointment date must be in the future'
    }
  },
  duration: {
    type: Number,
    required: [true, 'Duration is required'],
    min: [15, 'Minimum duration is 15 minutes'],
    max: [480, 'Maximum duration is 8 hours']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price must be non-negative']
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    default: 'USD',
    uppercase: true,
    match: [/^[A-Z]{3}$/, 'Currency must be a valid 3-letter code']
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending'
  },
  paymentIntentId: {
    type: String,
    default: null
  },
  location: {
    type: {
      type: String,
      enum: ['online', 'in-person'],
      required: true
    },
    address: {
      type: String,
      trim: true
    },
    meetingLink: {
      type: String,
      trim: true
    }
  },
  notes: {
    type: String,
    trim: true,
    maxLength: [1000, 'Notes cannot exceed 1000 characters']
  },
  reminderSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
appointmentSchema.index({ user: 1, dateTime: 1 });
appointmentSchema.index({ provider: 1, dateTime: 1 });
appointmentSchema.index({ status: 1, dateTime: 1 });
appointmentSchema.index({ paymentIntentId: 1 });

// Virtual for end time
appointmentSchema.virtual('endTime').get(function(this: IAppointment) {
  return new Date(this.dateTime.getTime() + this.duration * 60000);
});

// Instance method to check if appointment is in the past
appointmentSchema.methods.isPast = function(this: IAppointment): boolean {
  return this.dateTime < new Date();
};

// Instance method to check if appointment can be cancelled
appointmentSchema.methods.canBeCancelled = function(this: IAppointment): boolean {
  const now = new Date();
  const hoursUntilAppointment = (this.dateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursUntilAppointment >= 24 && this.status !== 'completed' && this.status !== 'cancelled';
};

export default mongoose.model<IAppointment>('Appointment', appointmentSchema);
