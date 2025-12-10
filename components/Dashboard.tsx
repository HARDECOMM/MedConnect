import React, { useEffect, useState, useRef } from 'react';
import { UserProfile, ViewState, Appointment } from '../types';
import { Activity, Calendar, Pill, Video, Thermometer, Weight, Heart, Droplets, Sparkles, Lightbulb, ChevronRight, Plus, X, Save, Wind, ScanFace, Camera, Loader2, ArrowLeft, PenLine, Watch, AlertTriangle, Keyboard, VideoOff } from 'lucide-react';
import { getHealthTips } from '../services/gemini';

interface DashboardProps {
  user: UserProfile;
  setViewState: (view: ViewState) => void;
  appointments?: Appointment[]; // Made optional to prevent crashes
}

interface VitalsData {
  heartRate: string;
  bpSystolic: string;
  bpDiastolic: string;
  temperature: string;
  weight: string;
  bloodSugar: string;
  spO2: string;
}

const Dashboard: React.FC<DashboardProps> = ({ user, setViewState, appointments = [] }) => {
  const [tips, setTips] = useState<string[]>([]);
  const [loadingTips, setLoadingTips] = useState(true);
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  
  // AI Scanning State
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [showInputForm, setShowInputForm] = useState(false); 
  const [isEditing, setIsEditing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null); // Track camera permission errors
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Live Wearable State
  const [isWearableConnected, setIsWearableConnected] = useState(false);
  const [healthAlert, setHealthAlert] = useState<string | null>(null);

  // Vitals State
  const [vitals, setVitals] = useState<VitalsData>({
    heartRate: '72',
    bpSystolic: '120',
    bpDiastolic: '80',
    temperature: '36.5',
    weight: '74.5',
    bloodSugar: '95',
    spO2: '98'
  });

  // Form State for Modal
  const [formData, setFormData] = useState<VitalsData>(vitals);

  useEffect(() => {
    getHealthTips().then(data => {
      setTips(data);
      setLoadingTips(false);
    });
  }, []);

  // --- LIVE WEARABLE SIMULATION ---
  useEffect(() => {
    let interval: number;

    if (isWearableConnected) {
        // Simulate continuous data stream from a device
        interval = window.setInterval(() => {
            setVitals(prev => {
                // Parse current values
                let hr = parseInt(prev.heartRate);
                let sys = parseInt(prev.bpSystolic);
                let dia = parseInt(prev.bpDiastolic);
                let spo2 = parseInt(prev.spO2);

                // Add random fluctuations (drift)
                hr += Math.floor(Math.random() * 5) - 2; // +/- 2 bpm
                if (Math.random() > 0.8) sys += Math.floor(Math.random() * 3) - 1; // Occasional BP shift
                if (Math.random() > 0.8) dia += Math.floor(Math.random() * 3) - 1;
                
                // Occasional SpO2 drop simulation
                if (Math.random() > 0.95) spo2 -= 1; 
                if (spo2 < 95 && Math.random() > 0.5) spo2 += 1; // Recovery
                
                // Boundaries
                if (hr < 50) hr = 55; if (hr > 120) hr = 115;
                if (spo2 > 100) spo2 = 100; if (spo2 < 90) spo2 = 92;

                // CHECK FOR ALERTS (The "Brain" of the real-time monitor)
                if (sys > 140 || dia > 90) {
                    setHealthAlert("Hypertension Alert: High Blood Pressure detected.");
                } else if (hr > 110) {
                    setHealthAlert("Tachycardia Alert: Heart rate is unusually high.");
                } else if (spo2 < 94) {
                    setHealthAlert("Hypoxia Alert: Oxygen levels are low.");
                } else {
                    setHealthAlert(null); // Clear alert if normalized
                }

                return {
                    ...prev,
                    heartRate: hr.toString(),
                    bpSystolic: sys.toString(),
                    bpDiastolic: dia.toString(),
                    spO2: spo2.toString()
                };
            });
        }, 3000); // Update every 3 seconds
    } else {
        setHealthAlert(null);
    }

    return () => clearInterval(interval);
  }, [isWearableConnected]);

  // Safe access to appointments with fallback
  const upcomingAppt = appointments?.find(a => a.status === 'upcoming');
  const upcomingCount = appointments?.filter(a => a.status === 'upcoming').length || 0;

  const handleVitalsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setVitals(formData);
    setIsVitalsModalOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // --- AI SCANNING LOGIC ---
  const startAiScan = async () => {
    setIsScanning(true);
    setCameraError(null);
    setShowInputForm(false);
    setIsEditing(false);
    setScanProgress(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Simulate Scanning Process
      const interval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            completeScan();
            return 100;
          }
          return prev + 2; 
        });
      }, 50);

    } catch (err) {
      console.error("Camera access failed", err);
      setIsScanning(false);
      setCameraError("Camera access denied. Please allow permissions or use manual entry.");
    }
  };

  const completeScan = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Simulate AI Detected Values
    const mockHeartRate = Math.floor(70 + Math.random() * 10).toString();
    const mockSpO2 = Math.floor(96 + Math.random() * 3).toString();
    
    setFormData(prev => ({
      ...prev,
      heartRate: mockHeartRate,
      spO2: mockSpO2
    }));

    setIsScanning(false);
    setShowInputForm(true); 
    setIsEditing(false); 
  };

  const stopScan = () => {
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    setIsScanning(false);
  };

  const openVitalsModal = () => {
      setFormData(vitals);
      setIsVitalsModalOpen(true);
      setShowInputForm(false); 
      setIsScanning(false);
      setIsEditing(false);
      setCameraError(null);
  };

  const StatCard = ({ label, value, unit, icon: Icon, color, subtext, onClick, isLive }: any) => (
    <div onClick={onClick} className={`bg-white p-4 rounded-xl border shadow-sm flex items-start justify-between hover:shadow-md transition-all group cursor-default relative overflow-hidden ${isLive ? 'border-teal-200 ring-1 ring-teal-100' : 'border-slate-100'}`}>
      
      {isLive && (
          <div className="absolute top-0 right-0 p-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
          </div>
      )}

      <div>
        <p className="text-slate-500 text-sm font-medium mb-1">{label}</p>
        <p className="text-2xl font-bold text-slate-800 tracking-tight flex items-baseline gap-1">
          {value} <span className="text-sm font-normal text-slate-400">{unit}</span>
        </p>
        {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
      </div>
      <div className={`p-2.5 rounded-lg ${color} group-hover:scale-110 transition-transform`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10 relative">
      
      {/* Vitals Input Modal */}
      {isVitalsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
               <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                 <Activity className="w-5 h-5 text-teal-600" /> 
                 {showInputForm ? (isEditing ? "Edit Vitals" : "Clinical Analysis Report") : "AI Health Scan"}
               </h3>
               <button onClick={() => setIsVitalsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors">
                 <X className="w-5 h-5" />
               </button>
            </div>
            
            <div className="overflow-y-auto p-6">
                
                {/* STATE 1: AI Prompt (Default) */}
                {!isScanning && !showInputForm && !cameraError && (
                    <div className="text-center py-8 animate-fade-in">
                        <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600 shadow-inner relative group cursor-pointer" onClick={startAiScan}>
                            <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-20 group-hover:opacity-40"></div>
                            <ScanFace className="w-10 h-10 relative z-10" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-2">AI-Powered Checkup</h3>
                        <p className="text-slate-500 max-w-xs mx-auto mb-8 leading-relaxed">
                            Point your camera at your face. Gemini Vision analyzes blood flow changes to accurately estimate your vitals in seconds.
                        </p>
                        
                        <div className="space-y-3">
                            <button 
                                onClick={startAiScan}
                                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3 transform hover:-translate-y-1"
                            >
                                <Camera className="w-6 h-6" /> Start Scan
                            </button>
                            
                            <div className="relative py-2">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                                <div className="relative flex justify-center"><span className="bg-white px-2 text-xs text-slate-400">OR</span></div>
                            </div>

                            <button 
                                onClick={() => { setShowInputForm(true); setIsEditing(true); }}
                                className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 hover:text-slate-800 transition-all flex items-center justify-center gap-2"
                            >
                                <Keyboard className="w-4 h-4" /> Enter Manually
                            </button>
                        </div>
                    </div>
                )}

                {/* STATE: Camera Error */}
                {cameraError && (
                    <div className="text-center py-8 animate-fade-in">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                            <VideoOff className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Camera Access Failed</h3>
                        <p className="text-slate-500 max-w-xs mx-auto mb-6 text-sm">{cameraError}</p>
                        <button 
                            onClick={() => { setCameraError(null); setShowInputForm(true); setIsEditing(true); }}
                            className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors"
                        >
                            Enter Vitals Manually
                        </button>
                    </div>
                )}

                {/* STATE 2: Scanning */}
                {isScanning && !cameraError && (
                    <div className="mb-8 rounded-2xl overflow-hidden relative bg-black aspect-[4/3] flex items-center justify-center shadow-2xl animate-fade-in">
                        <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-80" />
                        
                        {/* Scanning Overlay */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                            <div className="w-40 h-40 border-2 border-teal-500/30 rounded-full flex items-center justify-center relative backdrop-blur-sm bg-white/5">
                                <div className="absolute inset-0 border-t-4 border-teal-400 rounded-full animate-spin"></div>
                                <ScanFace className="w-16 h-16 text-white/80" />
                            </div>
                            <div className="mt-6 bg-black/60 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10">
                                <p className="text-white font-bold tracking-wider animate-pulse flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" /> ANALYZING...
                                </p>
                            </div>
                            <p className="text-teal-200 text-xs mt-2 font-medium bg-black/40 px-3 py-1 rounded-full">rPPG Signal Detection Active</p>
                        </div>

                        {/* Progress Bar */}
                        <div className="absolute bottom-0 left-0 right-0 h-2 bg-white/20">
                            <div 
                                className="h-full bg-teal-500 transition-all duration-75 ease-linear shadow-[0_0_10px_rgba(20,184,166,0.8)]"
                                style={{ width: `${scanProgress}%` }}
                            ></div>
                        </div>

                        <button 
                            onClick={stopScan}
                            className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 border border-white/10"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* STATE 3: Report View / Edit View */}
                {showInputForm && !isScanning && !cameraError && (
                    <form onSubmit={handleVitalsSubmit} className="animate-slide-in-right">
                        <div className="flex items-center justify-between mb-6">
                            <button type="button" onClick={() => setShowInputForm(false)} className="text-sm text-teal-600 font-bold flex items-center gap-1 hover:underline">
                                <ArrowLeft className="w-4 h-4" /> Back to Scan
                            </button>
                            {!isEditing && (
                                <button type="button" onClick={() => setIsEditing(true)} className="text-sm text-slate-400 font-medium flex items-center gap-1 hover:text-slate-600">
                                    <PenLine className="w-4 h-4" /> Edit Values
                                </button>
                            )}
                        </div>

                        {/* Analysis Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                             {/* Heart Rate Block */}
                             <div className={`p-4 rounded-xl border ${!isEditing ? 'bg-rose-50 border-rose-100' : 'bg-white border-slate-200'}`}>
                                <div className="flex justify-between items-center mb-2">
                                   <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                      Heart Rate 
                                      {!isEditing && <span className="text-[10px] bg-white px-1.5 py-0.5 rounded text-slate-400 border border-slate-100 shadow-sm">High Confidence</span>}
                                   </label>
                                   <Heart className="w-4 h-4 text-rose-500" />
                                </div>
                                {isEditing ? (
                                   <input 
                                     type="number" name="heartRate" value={formData.heartRate} onChange={handleInputChange} 
                                     className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                   />
                                ) : (
                                   <div className="flex items-baseline gap-1">
                                      <span className="text-3xl font-bold text-slate-800">{formData.heartRate}</span>
                                      <span className="text-sm text-slate-500 font-medium">bpm</span>
                                   </div>
                                )}
                             </div>

                             {/* SpO2 Block */}
                             <div className={`p-4 rounded-xl border ${!isEditing ? 'bg-cyan-50 border-cyan-100' : 'bg-white border-slate-200'}`}>
                                <div className="flex justify-between items-center mb-2">
                                   <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                      Oxygen Saturation
                                      {!isEditing && <span className="text-[10px] bg-white px-1.5 py-0.5 rounded text-slate-400 border border-slate-100 shadow-sm">High Confidence</span>}
                                   </label>
                                   <Wind className="w-4 h-4 text-cyan-500" />
                                </div>
                                {isEditing ? (
                                   <input 
                                     type="number" name="spO2" value={formData.spO2} onChange={handleInputChange} 
                                     className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                                   />
                                ) : (
                                   <div className="flex items-baseline gap-1">
                                      <span className="text-3xl font-bold text-slate-800">{formData.spO2}</span>
                                      <span className="text-sm text-slate-500 font-medium">%</span>
                                   </div>
                                )}
                             </div>
                        </div>

                        {/* Other Vitals */}
                        <div className="space-y-4 border-t border-slate-100 pt-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Other Metrics</h4>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-500">Blood Pressure</label>
                                    <div className="flex gap-2">
                                        <input 
                                            disabled={!isEditing}
                                            type="number" name="bpSystolic" value={formData.bpSystolic} onChange={handleInputChange} 
                                            className={`w-full p-2 rounded-lg text-sm ${isEditing ? 'border border-slate-200' : 'bg-slate-50 border-transparent font-semibold text-slate-700'}`}
                                            placeholder="120"
                                        />
                                        <span className="self-center">/</span>
                                        <input 
                                            disabled={!isEditing}
                                            type="number" name="bpDiastolic" value={formData.bpDiastolic} onChange={handleInputChange} 
                                            className={`w-full p-2 rounded-lg text-sm ${isEditing ? 'border border-slate-200' : 'bg-slate-50 border-transparent font-semibold text-slate-700'}`}
                                            placeholder="80"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-500">Temperature (°C)</label>
                                    <input 
                                        disabled={!isEditing}
                                        type="number" name="temperature" value={formData.temperature} onChange={handleInputChange} 
                                        className={`w-full p-2 rounded-lg text-sm ${isEditing ? 'border border-slate-200' : 'bg-slate-50 border-transparent font-semibold text-slate-700'}`}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-500">Weight (kg)</label>
                                    <input 
                                        disabled={!isEditing}
                                        type="number" name="weight" value={formData.weight} onChange={handleInputChange} 
                                        className={`w-full p-2 rounded-lg text-sm ${isEditing ? 'border border-slate-200' : 'bg-slate-50 border-transparent font-semibold text-slate-700'}`}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-500">Blood Sugar (mg/dL)</label>
                                    <input 
                                        disabled={!isEditing}
                                        type="number" name="bloodSugar" value={formData.bloodSugar} onChange={handleInputChange} 
                                        className={`w-full p-2 rounded-lg text-sm ${isEditing ? 'border border-slate-200' : 'bg-slate-50 border-transparent font-semibold text-slate-700'}`}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-8">
                            <button type="submit" className="w-full bg-teal-600 text-white py-4 rounded-xl font-bold hover:bg-teal-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20">
                                <Save className="w-5 h-5" /> 
                                {isEditing ? "Save Changes" : "Confirm Analysis & Save"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
          </div>
        </div>
      )}

      {/* ALERT BANNER - Shows only when live monitoring detects issues */}
      {healthAlert && isWearableConnected && (
         <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-4 animate-bounce-short shadow-md">
            <div className="p-2 bg-red-100 rounded-full text-red-600">
                <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1">
                <h4 className="font-bold text-red-800">Critical Alert</h4>
                <p className="text-sm text-red-700">{healthAlert}</p>
            </div>
            <button onClick={() => setViewState(ViewState.CONSULTATION)} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-red-600/20 hover:bg-red-700 transition-colors">
                Connect Doctor
            </button>
         </div>
      )}

      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-500 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden transition-all duration-500">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start">
             <div>
                <h2 className="text-3xl font-bold mb-3">Welcome back, {user.name}</h2>
                <p className="opacity-90 text-teal-50 max-w-lg text-lg leading-relaxed">
                    Your health profile is {healthAlert ? 'requiring attention' : 'looking stable'}. You have {upcomingCount} upcoming appointments this week.
                </p>
             </div>
             
             {/* CONNECT WEARABLE BUTTON */}
             <button 
                onClick={() => setIsWearableConnected(!isWearableConnected)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                    isWearableConnected 
                    ? 'bg-white text-teal-700 border-white shadow-lg' 
                    : 'bg-teal-700/30 text-teal-50 border-teal-400/30 hover:bg-teal-700/50'
                }`}
             >
                {isWearableConnected ? (
                    <>
                       <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                       <span>Connected to Watch</span>
                    </>
                ) : (
                    <>
                       <Watch className="w-4 h-4" />
                       <span>Connect Wearable (Sim)</span>
                    </>
                )}
             </button>
          </div>
          
          <button 
            onClick={() => setViewState(ViewState.CONSULTATION)}
            className="mt-8 bg-white text-teal-700 font-bold px-8 py-3 rounded-full flex items-center gap-2 hover:bg-teal-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Video className="w-5 h-5" />
            Talk to a Doctor Now
          </button>
        </div>
      </div>

      {/* Comprehensive Vitals Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
           <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
             <Activity className="w-5 h-5 text-teal-600" /> 
             {isWearableConnected ? "Real-Time Vitals" : "Current Vitals"}
             {isWearableConnected && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">LIVE</span>}
           </h3>
           <button 
             onClick={openVitalsModal}
             className="text-sm font-semibold text-teal-600 hover:text-teal-700 hover:bg-teal-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
           >
             <ScanFace className="w-4 h-4" /> Scan / Log Vitals
           </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard 
            label="Heart Rate" 
            value={vitals.heartRate} 
            unit="bpm" 
            icon={Heart} 
            color="bg-rose-100 text-rose-600" 
            subtext="Normal sinus rhythm"
            isLive={isWearableConnected}
          />
          <StatCard 
            label="Blood Pressure" 
            value={`${vitals.bpSystolic}/${vitals.bpDiastolic}`} 
            unit="mmHg" 
            icon={Activity} 
            color="bg-indigo-100 text-indigo-600" 
            subtext="Last checked: Just now"
            isLive={isWearableConnected}
          />
          <StatCard 
            label="Body Temp" 
            value={vitals.temperature} 
            unit="°C" 
            icon={Thermometer} 
            color="bg-orange-100 text-orange-600" 
            subtext="Within normal range"
          />
          <StatCard 
            label="Weight" 
            value={vitals.weight} 
            unit="kg" 
            icon={Weight} 
            color="bg-blue-100 text-blue-600" 
            subtext="-0.5kg since last month"
          />
          <StatCard 
            label="Blood Sugar" 
            value={vitals.bloodSugar} 
            unit="mg/dL" 
            icon={Droplets} 
            color="bg-pink-100 text-pink-600" 
            subtext="Fasting level"
          />
           <StatCard 
            label="Oxygen Saturation" 
            value={vitals.spO2} 
            unit="%" 
            icon={Wind} 
            color="bg-cyan-100 text-cyan-600" 
            subtext="SpO2 Levels"
            isLive={isWearableConnected}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Next Tasks */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-teal-200 transition-colors cursor-pointer" onClick={() => setViewState(ViewState.APPOINTMENTS)}>
             <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-100 rounded-lg text-purple-600"><Calendar className="w-5 h-5" /></div>
                <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-md">UPCOMING</span>
             </div>
             <p className="text-slate-500 text-sm font-medium">Next Appointment</p>
             {upcomingAppt ? (
               <>
                <p className="text-lg font-bold text-slate-800 mt-1">{new Date(upcomingAppt.date).toLocaleDateString()}</p>
                <p className="text-sm text-slate-400">{upcomingAppt.doctorName} • {upcomingAppt.time}</p>
               </>
             ) : (
               <p className="text-slate-400 text-sm italic mt-1">No upcoming visits</p>
             )}
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
             <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><Pill className="w-5 h-5" /></div>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">SCHEDULE</span>
             </div>
             <p className="text-slate-500 text-sm font-medium">Next Medication</p>
             <p className="text-lg font-bold text-slate-800 mt-1">2:00 PM</p>
             <p className="text-sm text-slate-400">Amartem (1 tablet)</p>
          </div>
        </div>

        {/* Daily Tips (Redesigned) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col h-full relative overflow-hidden">
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              Daily Insights
            </h3>
            <span className="text-[10px] font-bold bg-teal-50 text-teal-700 px-2 py-1 rounded-full uppercase tracking-wider border border-teal-100">
              AI Powered
            </span>
          </div>

          <div className="flex-1 space-y-3 relative z-10">
            {loadingTips ? (
              // Skeleton Loading
              [1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 animate-pulse">
                  <div className="w-8 h-8 bg-slate-200 rounded-lg shrink-0"></div>
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-2 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-2 bg-slate-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))
            ) : (
              // Tips List
              tips.map((tip, index) => (
                <div key={index} className="flex gap-3 p-3 rounded-xl bg-slate-50 hover:bg-teal-50 transition-colors border border-transparent hover:border-teal-100 group">
                  <div className="bg-white p-2 rounded-lg text-teal-600 shadow-sm group-hover:scale-110 transition-transform h-fit">
                    <Lightbulb className="w-4 h-4" />
                  </div>
                  <p className="text-sm text-slate-700 font-medium leading-relaxed pt-0.5">{tip}</p>
                </div>
              ))
            )}
          </div>
          
          <button 
            onClick={() => setViewState(ViewState.EDUCATION)} 
            className="mt-6 w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 group shadow-lg shadow-slate-900/10"
          >
            View Health Hub <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;