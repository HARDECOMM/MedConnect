export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  CONSULTATION = 'CONSULTATION',
  RECORDS = 'RECORDS',
  APPOINTMENTS = 'APPOINTMENTS',
  EDUCATION = 'EDUCATION',
}

export interface UserProfile {
  name: string;
  location: string;
  age: number;
}

export interface Appointment {
  id: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  status: 'upcoming' | 'completed' | 'cancelled';
}

export interface MedicalRecord {
  id: string;
  date: string;
  diagnosis: string;
  doctor: string;
  prescription: string;
  notes: string;
}

export interface EducationArticle {
  title: string;
  summary: string;
  source?: string;
  url?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  appointmentReminders: boolean;
  medicationReminders: boolean;
}