import React, { useState } from 'react';
import { Appointment } from '../types';
import { Calendar as CalendarIcon, Clock, MapPin, User, Plus, X, ChevronRight, ChevronLeft, CheckCircle, Stethoscope, Search, CalendarDays } from 'lucide-react';
import { useNotification } from './NotificationContext';

interface AppointmentsProps {
  appointments: Appointment[];
}

const SPECIALTIES = [
  'General Practice', 
  'Cardiology', 
  'Pediatrics', 
  'Dermatology', 
  'Neurology', 
  'Orthopedics', 
  'Gynecology', 
  'Ophthalmology'
];

const DOCTORS = [
  { id: 'd1', name: 'Dr. Ogundele', specialty: 'Cardiologist', location: 'Lagos Teaching Hospital', image: '👨🏿‍⚕️' },
  { id: 'd2', name: 'Dr. Oyinkansole', specialty: 'General Practice', location: 'Garki Hospital Abuja', image: '👩🏿‍⚕️' },
  { id: 'd3', name: 'Dr. Adebayo', specialty: 'Pediatrics', location: 'Ibadan Central', image: '👨🏿‍⚕️' },
  { id: 'd4', name: 'Dr. Okonjo', specialty: 'Dermatology', location: 'Lagos Private Clinic', image: '👩🏿‍⚕️' },
  { id: 'd5', name: 'Dr. Ibrahim', specialty: 'Neurology', location: 'National Hospital Abuja', image: '👨🏿‍⚕️' },
  { id: 'd6', name: 'Dr. Eze', specialty: 'Orthopedics', location: 'Enugu Medical Center', image: '👨🏿‍⚕️' },
  { id: 'd7', name: 'Dr. Okafor', specialty: 'General Practice', location: 'Port Harcourt', image: '👩🏿‍⚕️' },
  { id: 'd8', name: 'Dr. Hassan', specialty: 'Gynecology', location: 'Kano General', image: '👨🏿‍⚕️' },
];

const TIME_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', 
  '11:00 AM', '11:30 AM', '02:00 PM', '02:30 PM', 
  '03:00 PM', '03:30 PM', '04:00 PM'
];

const Appointments: React.FC<AppointmentsProps> = ({ appointments: initialAppointments }) => {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const { addNotification } = useNotification();
  
  // Booking Modal State
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [bookingData, setBookingData] = useState({
    specialty: '',
    doctor: null as typeof DOCTORS[0] | null,
    date: '',
    time: ''
  });

  const handleBookClick = () => {
    setStep(1);
    setBookingData({ specialty: '', doctor: null, date: '', time: '' });
    setIsBookingOpen(true);
  };

  const handleSpecialtySelect = (specialty: string) => {
    setBookingData(prev => ({ ...prev, specialty }));
    setStep(2);
  };

  const handleDoctorSelect = (doctor: typeof DOCTORS[0]) => {
    setBookingData(prev => ({ ...prev, doctor }));
    setStep(3);
  };

  const handleDateTimeSelect = (type: 'date' | 'time', value: string) => {
    setBookingData(prev => ({ ...prev, [type]: value }));
  };

  const handleConfirmBooking = () => {
    if (!bookingData.doctor || !bookingData.date || !bookingData.time) return;

    const newAppointment: Appointment = {
      id: Date.now().toString(),
      doctorName: bookingData.doctor.name,
      specialty: bookingData.specialty,
      date: bookingData.date,
      time: bookingData.time,
      status: 'upcoming'
    };

    setAppointments(prev => [newAppointment, ...prev]);
    
    addNotification({
      title: 'Appointment Confirmed',
      message: `Booked with ${bookingData.doctor.name} on ${new Date(bookingData.date).toLocaleDateString()} at ${newAppointment.time}`,
      type: 'success'
    });
    
    setIsBookingOpen(false);
  };

  const filteredDoctors = DOCTORS.filter(d => d.specialty === bookingData.specialty || bookingData.specialty === 'General Practice');

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <div className="space-y-6 animate-fade-in relative pb-10">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">Appointments</h2>
           <p className="text-slate-500 text-sm">Manage your visits and schedules</p>
        </div>
        <button 
          onClick={handleBookClick}
          className="bg-teal-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-teal-700 transition-all shadow-lg hover:shadow-teal-600/20 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Book New
        </button>
      </div>

      {/* Appointments List */}
      <div className="grid gap-4">
        {appointments.length === 0 ? (
           <div className="bg-white p-10 rounded-2xl border border-slate-100 text-center shadow-sm">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                 <CalendarDays className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-700 mb-2">No Appointments Yet</h3>
              <p className="text-slate-500 max-w-xs mx-auto mb-6 text-sm">You haven't booked any consultations. Schedule one with a specialist today.</p>
              <button onClick={handleBookClick} className="text-teal-600 font-bold hover:underline text-sm">Book an Appointment</button>
           </div>
        ) : (
          appointments.map((appt) => (
            <div key={appt.id} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all hover:border-teal-200 group">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                     <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 text-xl shadow-sm ${
                        appt.status === 'upcoming' ? 'bg-teal-50 text-teal-600' : 'bg-slate-100 text-slate-500'
                     }`}>
                        {appt.status === 'upcoming' ? '👨🏿‍⚕️' : '🏥'}
                     </div>
                     <div>
                        <h3 className="font-bold text-lg text-slate-800 group-hover:text-teal-700 transition-colors">{appt.doctorName}</h3>
                        <p className="text-slate-500 font-medium text-sm flex items-center gap-1.5">
                           <Stethoscope className="w-3.5 h-3.5" /> {appt.specialty}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-500">
                           <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg">
                             <CalendarIcon className="w-3.5 h-3.5 text-slate-400" /> {new Date(appt.date).toLocaleDateString()}
                           </span>
                           <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg">
                             <Clock className="w-3.5 h-3.5 text-slate-400" /> {appt.time}
                           </span>
                           <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg">
                             <MapPin className="w-3.5 h-3.5 text-slate-400" /> Online
                           </span>
                        </div>
                     </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                     {appt.status === 'upcoming' ? (
                       <button className="flex-1 md:flex-none px-4 py-2 bg-white text-teal-700 rounded-lg text-sm font-bold hover:bg-teal-50 border border-slate-200 hover:border-teal-200 transition-all">
                         Reschedule
                       </button>
                     ) : (
                       <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          appt.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                       }`}>
                         {appt.status}
                       </span>
                     )}
                  </div>
               </div>
            </div>
          ))
        )}
      </div>

      {/* Booking Modal */}
      {isBookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
             {/* Header */}
             <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                   <h3 className="text-xl font-bold text-slate-800">Book Appointment</h3>
                   <div className="flex items-center gap-2 mt-1">
                      {[1, 2, 3, 4].map(i => (
                         <div key={i} className={`h-1.5 rounded-full transition-all ${step >= i ? 'w-8 bg-teal-500' : 'w-2 bg-slate-200'}`} />
                      ))}
                      <span className="text-xs text-slate-400 ml-2">Step {step} of 4</span>
                   </div>
                </div>
                <button onClick={() => setIsBookingOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full transition-colors">
                   <X className="w-6 h-6" />
                </button>
             </div>

             {/* Content */}
             <div className="flex-1 overflow-y-auto p-6">
                
                {/* Step 1: Select Specialty */}
                {step === 1 && (
                   <div className="animate-slide-in-right">
                      <h4 className="text-lg font-bold text-slate-800 mb-4">Select Specialty</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                         {SPECIALTIES.map(spec => (
                            <button 
                              key={spec} 
                              onClick={() => handleSpecialtySelect(spec)}
                              className="p-4 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50 transition-all text-left group"
                            >
                               <div className="w-10 h-10 bg-teal-100 text-teal-600 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                  <Stethoscope className="w-5 h-5" />
                               </div>
                               <span className="font-semibold text-slate-700 group-hover:text-teal-800 text-sm">{spec}</span>
                            </button>
                         ))}
                      </div>
                   </div>
                )}

                {/* Step 2: Select Doctor */}
                {step === 2 && (
                   <div className="animate-slide-in-right">
                      <div className="flex items-center gap-2 mb-4">
                         <button onClick={() => setStep(1)} className="text-slate-400 hover:text-slate-600"><ChevronLeft className="w-5 h-5" /></button>
                         <h4 className="text-lg font-bold text-slate-800">Select Doctor ({bookingData.specialty})</h4>
                      </div>
                      <div className="space-y-3">
                         {filteredDoctors.length > 0 ? filteredDoctors.map(doc => (
                            <button 
                              key={doc.id}
                              onClick={() => handleDoctorSelect(doc)}
                              className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50 transition-all text-left group"
                            >
                               <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-2xl shadow-sm">
                                  {doc.image}
                               </div>
                               <div>
                                  <h5 className="font-bold text-slate-800 group-hover:text-teal-800">{doc.name}</h5>
                                  <p className="text-sm text-slate-500 flex items-center gap-1">
                                     <MapPin className="w-3 h-3" /> {doc.location}
                                  </p>
                               </div>
                               <ChevronRight className="w-5 h-5 text-slate-300 ml-auto group-hover:text-teal-500" />
                            </button>
                         )) : (
                           <div className="text-center py-10 text-slate-500 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                              <p className="mb-2">No doctors available for this specialty right now.</p>
                              <button onClick={() => setStep(1)} className="text-teal-600 font-bold hover:underline">Go Back</button>
                           </div>
                         )}
                      </div>
                   </div>
                )}

                {/* Step 3: Date & Time */}
                {step === 3 && (
                   <div className="animate-slide-in-right space-y-6">
                      <div className="flex items-center gap-2 mb-2">
                         <button onClick={() => setStep(2)} className="text-slate-400 hover:text-slate-600"><ChevronLeft className="w-5 h-5" /></button>
                         <h4 className="text-lg font-bold text-slate-800">Choose Date & Time</h4>
                      </div>

                      <div>
                         <label className="block text-sm font-bold text-slate-700 mb-2">Select Date</label>
                         <div className="relative">
                            <input 
                              type="date" 
                              min={getMinDate()}
                              value={bookingData.date}
                              onChange={(e) => handleDateTimeSelect('date', e.target.value)}
                              className="w-full p-4 pl-12 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none font-medium text-slate-700 transition-shadow"
                            />
                            <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                         </div>
                      </div>

                      <div>
                         <label className="block text-sm font-bold text-slate-700 mb-2">Select Time Slot</label>
                         <div className="grid grid-cols-3 gap-3">
                            {TIME_SLOTS.map(slot => (
                               <button
                                 key={slot}
                                 onClick={() => handleDateTimeSelect('time', slot)}
                                 className={`py-3 px-2 rounded-lg text-sm font-medium border transition-all ${
                                    bookingData.time === slot 
                                      ? 'bg-teal-600 text-white border-teal-600 shadow-md' 
                                      : 'bg-white border-slate-200 text-slate-600 hover:border-teal-300 hover:bg-slate-50'
                                 }`}
                               >
                                  {slot}
                               </button>
                            ))}
                         </div>
                      </div>
                   </div>
                )}

                {/* Step 4: Confirm */}
                {step === 4 && (
                   <div className="animate-slide-in-right text-center py-4">
                      <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6 text-teal-600 animate-bounce-short">
                         <CheckCircle className="w-10 h-10" />
                      </div>
                      <h4 className="text-2xl font-bold text-slate-800 mb-2">Confirm Booking</h4>
                      <p className="text-slate-500 mb-8 max-w-xs mx-auto">Please review your appointment details below before confirming.</p>
                      
                      <div className="bg-slate-50 rounded-2xl p-6 text-left border border-slate-200 max-w-sm mx-auto shadow-sm">
                         <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                               <span className="text-slate-500 text-sm">Doctor</span>
                               <span className="font-bold text-slate-800 text-right">{bookingData.doctor?.name}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                               <span className="text-slate-500 text-sm">Specialty</span>
                               <span className="font-bold text-slate-800 text-right">{bookingData.specialty}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                               <span className="text-slate-500 text-sm">Date</span>
                               <span className="font-bold text-slate-800 text-right">{new Date(bookingData.date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                               <span className="text-slate-500 text-sm">Time</span>
                               <span className="font-bold text-teal-600 text-right">{bookingData.time}</span>
                            </div>
                         </div>
                      </div>
                   </div>
                )}
             </div>

             {/* Footer Actions */}
             <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                {step === 1 && (
                   <button onClick={() => setIsBookingOpen(false)} className="px-6 py-2.5 rounded-xl text-slate-500 font-bold hover:bg-slate-200 transition-colors text-sm">Cancel</button>
                )}
                {step > 1 && step < 4 && (
                   <button onClick={() => setStep(step - 1)} className="px-6 py-2.5 rounded-xl text-slate-500 font-bold hover:bg-slate-200 transition-colors text-sm">Back</button>
                )}
                
                {step === 3 && (
                   <button 
                     onClick={() => setStep(4)} 
                     disabled={!bookingData.date || !bookingData.time}
                     className="px-8 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                   >
                     Review
                   </button>
                )}
                
                {step === 4 && (
                   <button 
                     onClick={handleConfirmBooking}
                     className="px-8 py-2.5 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 shadow-lg shadow-teal-600/20 transition-colors flex items-center gap-2 text-sm"
                   >
                     Confirm Booking <CheckCircle className="w-4 h-4" />
                   </button>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;