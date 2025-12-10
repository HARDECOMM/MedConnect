import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import LiveConsultation from './components/LiveConsultation';
import Records from './components/Records';
import Appointments from './components/Appointments';
import Education from './components/Education';
import { ViewState, UserProfile, Appointment, MedicalRecord } from './types';
import { NotificationProvider } from './components/NotificationContext';

// Mock Data
const MOCK_USER: UserProfile = {
  name: "Adewale Olatunji",
  location: "Ibadan, Nigeria",
  age: 34
};

const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: '1',
    doctorName: 'Dr. Ogundele',
    specialty: 'Cardiologist',
    date: '2023-10-25',
    time: '10:00 AM',
    status: 'upcoming'
  },
  {
    id: '2',
    doctorName: 'Dr. Oyinkansole',
    specialty: 'General Practitioner',
    date: '2023-09-12',
    time: '02:30 PM',
    status: 'completed'
  }
];

const MOCK_RECORDS: MedicalRecord[] = [
  {
    id: '1',
    date: '2023-09-12',
    diagnosis: 'Mild Malaria',
    doctor: 'Dr. Oyinkansole',
    prescription: 'Artemether-Lumefantrine',
    notes: 'Patient responded well to treatment.'
  },
  {
    id: '2',
    date: '2023-05-20',
    diagnosis: 'Routine Checkup',
    doctor: 'Dr. Ogundele',
    prescription: 'None',
    notes: 'Blood pressure normal. Recommended dietary changes.'
  }
];

const AppContent: React.FC = () => {
  const [viewState, setViewState] = useState<ViewState>(ViewState.DASHBOARD);

  const renderContent = () => {
    switch (viewState) {
      case ViewState.DASHBOARD:
        return <Dashboard user={MOCK_USER} setViewState={setViewState} appointments={MOCK_APPOINTMENTS} />;
      case ViewState.CONSULTATION:
        return <LiveConsultation user={MOCK_USER} records={MOCK_RECORDS} />;
      case ViewState.RECORDS:
        return <Records records={MOCK_RECORDS} />;
      case ViewState.APPOINTMENTS:
        return <Appointments appointments={MOCK_APPOINTMENTS} />;
      case ViewState.EDUCATION:
        return <Education setViewState={setViewState} />;
      default:
        return <Dashboard user={MOCK_USER} setViewState={setViewState} appointments={MOCK_APPOINTMENTS} />;
    }
  };

  return (
    <Layout viewState={viewState} setViewState={setViewState} user={MOCK_USER}>
      {renderContent()}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <NotificationProvider>
      <AppContent />
    </NotificationProvider>
  );
};

export default App;