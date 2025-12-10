import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ai } from '../services/gemini';
import { Modality, LiveServerMessage } from '@google/genai';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, NotebookPen, Send, X, CheckCircle, ChevronRight, Bold, Italic, List as ListIcon, FileText, PictureInPicture, Settings, FileClock, Pill, History, Info, MapPin, Calendar, User, Share2, Mail, Link as LinkIcon, Check, Stethoscope, Clock, Disc, Download, Plus, MoreVertical, Sparkles, Loader2, Heading, ListOrdered, Signal, ArrowLeft, Users } from 'lucide-react';
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from '../services/audioUtils';
import { UserProfile, MedicalRecord } from '../types';

interface Note {
  id: string;
  text: string;
  timestamp: string;
}

interface SessionSummary {
  id: string;
  date: string;
  duration: string;
  doctorName: string;
  notes: Note[];
  recommendations?: string;
  audioRecordingUrl?: string;
}

interface LiveConsultationProps {
  user: UserProfile;
  records: MedicalRecord[];
}

const RESOLUTIONS = {
  '360p': { label: 'Low (360p)', width: 480, height: 360 },
  '480p': { label: 'Standard (480p)', width: 640, height: 480 },
  '720p': { label: 'HD (720p)', width: 1280, height: 720 },
  '1080p': { label: 'Full HD (1080p)', width: 1920, height: 1080 },
};

const AVAILABLE_DOCTORS = [
  { id: 'dr1', name: 'Dr. Ibidun', specialty: 'General Practitioner', role: 'Primary Care', image: '👩🏿‍⚕️', voice: 'Kore', desc: 'Expert in family medicine and common tropical diseases.' },
  { id: 'dr2', name: 'Dr. Adewale', specialty: 'Cardiologist', role: 'Heart Specialist', image: '👨🏿‍⚕️', voice: 'Fenrir', desc: 'Specializes in hypertension and heart conditions.' },
  { id: 'dr3', name: 'Dr. Oyinkansole', specialty: 'Pediatrician', role: 'Child Specialist', image: '👩🏿‍⚕️', voice: 'Puck', desc: 'Friendly care for infants, children, and adolescents.' },
  { id: 'dr4', name: 'Dr. Ogundele', specialty: 'Neurologist', role: 'Brain Specialist', image: '👨🏿‍⚕️', voice: 'Charon', desc: 'Expertise in headaches, epilepsy, and nervous system disorders.' },
];

const RECOMMENDATION_TEMPLATES: Record<string, string> = {
  "General Checkup": "Findings: Patient appears to be in good general health. Vitals are stable.\n\nPlan:\n1. Maintain a balanced diet rich in vegetables and fruits.\n2. Regular moderate exercise (30 mins/day).\n3. Stay hydrated.\n4. Annual follow-up recommended.",
  "Malaria Treatment": "Diagnosis: Clinical signs consistent with uncomplicated Malaria.\n\nRx:\n1. Tab. Artemether/Lumefantrine 80/480mg - 1 tab twice daily for 3 days.\n2. Tab. Paracetamol 1g - TDS (3 times daily) for 3 days for fever/pain.\n\nAdvice:\n- Ensure use of Long-Lasting Insecticide-treated Nets (LLIN).\n- Clear stagnant water around the home.\n- Return to clinic if symptoms persist after 3 days.",
  "Typhoid Treatment": "Diagnosis: Suspected Typhoid Fever.\n\nRx:\n1. Tab. Ciprofloxacin 500mg - BD (twice daily) for 7 days.\n2. Tab. Paracetamol 500mg - as needed for pain.\n3. ORS sachet - drink freely to prevent dehydration.\n\nAdvice:\n- Drink only boiled or treated water.\n- Maintain strict hand hygiene, especially before meals.",
  "Hypertension Management": "Diagnosis: Hypertension (Elevated BP).\n\nRx:\n1. Tab. Amlodipine 5mg - OD (once daily).\n\nAdvice:\n- Reduce salt intake significantly.\n- Monitor Blood Pressure daily and record readings.\n- Avoid stress and ensure adequate sleep.\n- Follow up in 2 weeks."
};

type ResolutionKey = keyof typeof RESOLUTIONS;
type SidebarView = 'none' | 'notes' | 'history' | 'past_sessions';
type NetworkQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

export default function LiveConsultation({ user, records }: LiveConsultationProps) {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isPipActive, setIsPipActive] = useState(false);
  const [status, setStatus] = useState<string>("Ready to connect");
  const [volume, setVolume] = useState<number>(0);
  
  // Doctor Selection State
  const [selectedDoctor, setSelectedDoctor] = useState<typeof AVAILABLE_DOCTORS[0] | null>(null);

  // Resolution State
  const [resolution, setResolution] = useState<ResolutionKey>('480p');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Network Quality State
  const [networkStats, setNetworkStats] = useState<{ quality: NetworkQuality; latency: number }>({ quality: 'excellent', latency: 25 });

  // Sidebar State
  const [activeSidebarView, setActiveSidebarView] = useState<SidebarView>('none');

  // Notes State
  const [noteInput, setNoteInput] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [recommendationsInput, setRecommendationsInput] = useState("");
  const [isGeneratingRecs, setIsGeneratingRecs] = useState(false);
  
  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  
  // Timer State
  const [elapsedTime, setElapsedTime] = useState("00:00");

  // Past Sessions State
  const [pastSessions, setPastSessions] = useState<SessionSummary[]>([
    {
      id: 'mock-1',
      date: '10/24/2023',
      duration: '15 min',
      doctorName: 'Dr. Ibidun',
      notes: [
        { id: 'n1', text: 'Patient complained of mild headache.', timestamp: '10:05 AM' },
        { id: 'n2', text: 'Recommended rest and hydration.', timestamp: '10:12 AM' }
      ],
      recommendations: 'Prescribed Paracetamol 500mg twice daily. Monitor temperature for 24 hours.'
    }
  ]);

  // Share State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<Promise<any> | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Recording Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const aiGainNodeRef = useRef<GainNode | null>(null);
  const recordingUserSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Close settings when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const stopMedia = useCallback(() => {
    setIsConnecting(false);
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (sessionRef.current) {
       sessionRef.current.then(s => {
         try { s.close(); } catch(e) { console.error("Error closing session", e)}
       });
       sessionRef.current = null;
    }

    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch(e) {}
    });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;

    if (inputContextRef.current) {
      inputContextRef.current.close();
      inputContextRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // Exit PIP if active
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const onEnterPip = () => setIsPipActive(true);
    const onLeavePip = () => setIsPipActive(false);

    videoEl.addEventListener('enterpictureinpicture', onEnterPip);
    videoEl.addEventListener('leavepictureinpicture', onLeavePip);

    return () => {
      videoEl.removeEventListener('enterpictureinpicture', onEnterPip);
      videoEl.removeEventListener('leavepictureinpicture', onLeavePip);
      stopMedia();
    };
  }, [stopMedia, isActive]);

  // Ensure video stream is attached when component mounts/updates (Critical for "Camera visibility")
  useEffect(() => {
    if ((isActive || isConnecting) && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(e => console.warn("Video play error:", e));
    }
  }, [isActive, isConnecting]);

  // Timer Effect
  useEffect(() => {
    let timerInterval: number;
    if (isActive && sessionStartTime) {
      const updateTimer = () => {
        const now = Date.now();
        const diffInSeconds = Math.floor((now - sessionStartTime) / 1000);
        const minutes = Math.floor(diffInSeconds / 60).toString().padStart(2, '0');
        const seconds = (diffInSeconds % 60).toString().padStart(2, '0');
        setElapsedTime(`${minutes}:${seconds}`);
      };
      
      updateTimer();
      timerInterval = window.setInterval(updateTimer, 1000);
    } else {
      setElapsedTime("00:00");
    }

    return () => {
      if (timerInterval) window.clearInterval(timerInterval);
    };
  }, [isActive, sessionStartTime]);

  // Network Quality Simulation with Latency
  useEffect(() => {
    if (isActive) {
      const interval = window.setInterval(() => {
         // Mock latency fluctuation
         const baseLatency = 40;
         const fluctuation = Math.floor(Math.random() * 80); // 0-80ms jitter
         const spike = Math.random() > 0.95 ? 300 : 0; // Rare large spike
         const currentLatency = baseLatency + fluctuation + spike;
         
         let q: NetworkQuality = 'excellent';
         if (currentLatency > 400) q = 'critical';
         else if (currentLatency > 200) q = 'poor';
         else if (currentLatency > 120) q = 'fair';
         else if (currentLatency > 80) q = 'good';

         setNetworkStats({ quality: q, latency: currentLatency });
      }, 2000);
      return () => clearInterval(interval);
    } else {
       setNetworkStats({ quality: 'excellent', latency: 0 });
    }
  }, [isActive]);

  const startConsultation = async () => {
    try {
      if (!selectedDoctor) return;

      setIsConnecting(true);
      setSessionEnded(false);
      setNotes([]);
      setIsRecording(false);
      audioChunksRef.current = [];
      setSessionStartTime(Date.now());
      setStatus(`Connecting to ${selectedDoctor.name}...`);
      setRecommendationsInput("");
      
      // 1. Audio Contexts
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });

      // Create AI Gain Node for recording/output routing
      if (audioContextRef.current) {
        aiGainNodeRef.current = audioContextRef.current.createGain();
        aiGainNodeRef.current.connect(audioContextRef.current.destination);
      }

      // 2. Media Stream
      const constraints = RESOLUTIONS[resolution];
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: { 
          width: { ideal: constraints.width }, 
          height: { ideal: constraints.height } 
        } 
      });
      streamRef.current = stream;
      
      // FIX: Set srcObject immediately to show camera feed while connecting
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(e => console.warn("Immediate play error:", e));
      }

      // 3. Connect to Gemini Live
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          // Dynamically set system instruction based on selected doctor
          systemInstruction: `You are ${selectedDoctor.name}, a kind and professional ${selectedDoctor.specialty} on MedConnect Nigeria. You are speaking to a patient named ${user.name}, who is ${user.age} years old and lives in ${user.location}. Keep responses helpful, empathetic, concise, and easy to understand. Start by greeting them warmly by name and asking how you can help with their ${selectedDoctor.role.toLowerCase()} needs today.`,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedDoctor.voice } },
          },
        },
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setStatus(`Connected to ${selectedDoctor.name}`);
            setIsActive(true);
            setActiveSidebarView('notes'); // Open notes by default on connect
            setupAudioInput(stream);
            setupVideoInput();
          },
          onmessage: async (message: LiveServerMessage) => {
            const audioStr = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioStr && audioContextRef.current) {
               playAudioResponse(audioStr);
            }

            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              for (const source of sourcesRef.current) {
                source.stop();
              }
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => {
            setIsConnecting(false);
            if (isActive) { // Only if closed unexpectedly
                 setStatus("Disconnected");
                 setIsActive(false);
            }
          },
          onerror: (err) => {
            console.error(err);
            setIsConnecting(false);
            setStatus("Connection error");
          }
        }
      });
      sessionRef.current = sessionPromise;

    } catch (error: any) {
      console.error("Failed to start consultation", error);
      setIsConnecting(false);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDismissedError') {
          setStatus("Camera/Mic permission denied. Please allow access.");
      } else {
          setStatus("Error: Could not access camera/mic");
      }
    }
  };

  const setupAudioInput = (stream: MediaStream) => {
    if (!inputContextRef.current) return;
    
    const source = inputContextRef.current.createMediaStreamSource(stream);
    const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
    
    processor.onaudioprocess = (e) => {
      if (isMuted) return;

      const inputData = e.inputBuffer.getChannelData(0);
      
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
      setVolume(Math.sqrt(sum / inputData.length));

      const blob = createPcmBlob(inputData);
      
      sessionRef.current?.then(session => {
        session.sendRealtimeInput({ media: blob });
      });
    };

    source.connect(processor);
    processor.connect(inputContextRef.current.destination);
  };

  const setupVideoInput = () => {
    if (!canvasRef.current || !videoRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    intervalRef.current = window.setInterval(async () => {
      if (!isVideoEnabled || !videoRef.current || !canvasRef.current) return;
      
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0);
      
      const base64 = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];
      
      sessionRef.current?.then(session => {
        session.sendRealtimeInput({ 
          media: { 
            mimeType: 'image/jpeg', 
            data: base64 
          } 
        });
      });
    }, 1000);
  };

  const playAudioResponse = async (base64Audio: string) => {
    if (!audioContextRef.current || !aiGainNodeRef.current) return;

    try {
      const audioBytes = base64ToUint8Array(base64Audio);
      const audioBuffer = await decodeAudioData(audioBytes, audioContextRef.current, 24000, 1);
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      // Connect to the AI Gain Node (routes to speakers + recording)
      source.connect(aiGainNodeRef.current);
      
      const now = audioContextRef.current.currentTime;
      const startTime = Math.max(now, nextStartTimeRef.current);
      source.start(startTime);
      nextStartTimeRef.current = startTime + audioBuffer.duration;
      
      sourcesRef.current.add(source);
      source.onended = () => sourcesRef.current.delete(source);
    } catch (e) {
      console.error("Audio decode error", e);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => track.enabled = isMuted);
    }
  };

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled);
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(track => track.enabled = !isVideoEnabled);
    }
  };

  const togglePip = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (videoRef.current.readyState >= 1) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (error) {
      console.error("PIP failed", error);
    }
  };

  const toggleSidebar = (view: SidebarView) => {
    if (activeSidebarView === view) {
      setActiveSidebarView('none');
    } else {
      setActiveSidebarView(view);
    }
  };

  const handleResolutionChange = async (resKey: ResolutionKey) => {
    setResolution(resKey);
    setIsSettingsOpen(false);
    
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        const constraints = RESOLUTIONS[resKey];
        try {
          await videoTrack.applyConstraints({
            width: { ideal: constraints.width },
            height: { ideal: constraints.height }
          });
        } catch (error) {
          console.error("Error setting resolution:", error);
        }
      }
    }
  };

  // --- Recording Logic ---
  const startRecording = () => {
    if (!audioContextRef.current || !streamRef.current || !aiGainNodeRef.current) return;
    
    // Create a destination for the recording mix
    const dest = audioContextRef.current.createMediaStreamDestination();
    audioChunksRef.current = [];

    // 1. Connect AI output to recording dest
    aiGainNodeRef.current.connect(dest);

    // 2. Connect User input to recording dest
    // Note: We create a new source in the *playback* context to mix it in for recording
    const userSource = audioContextRef.current.createMediaStreamSource(streamRef.current);
    userSource.connect(dest);
    recordingUserSourceRef.current = userSource;

    const recorder = new MediaRecorder(dest.stream, { mimeType: 'audio/webm' });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  };

  const stopRecording = (): Promise<string> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
          resolve("");
          return;
      }

      mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const url = URL.createObjectURL(blob);
          
          // Clean up user source connection
          recordingUserSourceRef.current?.disconnect();
          recordingUserSourceRef.current = null;
          
          resolve(url);
      };
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    });
  };

  const toggleRecording = async () => {
    if (isRecording) {
        await stopRecording();
    } else {
        startRecording();
    }
  };

  const calculateDuration = () => {
     if (!sessionStartTime) return "0 min";
     const end = Date.now();
     const diff = Math.floor((end - sessionStartTime) / 1000 / 60);
     return `${diff} min`;
  };

  const handleEndCall = async () => {
    // Check if recording and stop it to get the URL
    let recordingUrl = "";
    if (isRecording) {
       recordingUrl = await stopRecording();
    }

    stopMedia();
    setIsActive(false);
    setStatus("Call ended");
    
    // Save session summary
    const duration = calculateDuration();
    const sessionId = Date.now().toString();
    const newSession: SessionSummary = {
        id: sessionId,
        date: new Date().toLocaleDateString(),
        duration: duration,
        doctorName: selectedDoctor?.name || "Dr. Ibidun",
        notes: [...notes],
        recommendations: "",
        audioRecordingUrl: recordingUrl // Save audio URL
    };
    
    setPastSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(sessionId);
    setRecommendationsInput("");

    setSessionEnded(true);
    setVolume(0);
    setIsPipActive(false);
    setSelectedDoctor(null); // Reset doctor selection
  };

  const handleCloseSummary = () => {
    // Save recommendations to the current session in history
    if (currentSessionId) {
      setPastSessions(prev => prev.map(session => 
        session.id === currentSessionId 
          ? { ...session, recommendations: recommendationsInput } 
          : session
      ));
    }
    
    setSessionEnded(false);
    setStatus("Ready to connect");
    setCurrentSessionId(null);
  };

  const handleGenerateAIRecommendation = () => {
    setIsGeneratingRecs(true);
    // Simulate AI processing notes
    setTimeout(() => {
        const symptoms = notes.length > 0 ? "based on reported symptoms" : "based on consultation";
        const draft = `Clinical Impression: Likely mild acute malaria ${symptoms}.\n\nTreatment Plan:\n1. Artemether/Lumefantrine 80/480mg twice daily for 3 days.\n2. Paracetamol 1g every 8 hours for fever.\n\nAdvice: Rest, hydration, and use of insecticide-treated nets.`;
        setRecommendationsInput(draft);
        setIsGeneratingRecs(false);
    }, 1500);
  };

  const handleNoteSubmit = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerHTML;
    if (text.trim()) {
      const newNote = {
        id: Date.now().toString(),
        text: text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setNotes(prev => [...prev, newNote]);
      editorRef.current.innerHTML = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleNoteSubmit();
    }
  };

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const renderShareModal = (session: SessionSummary) => {
    if (!isShareModalOpen) return null;

    const handleShareEmail = () => {
       const subject = encodeURIComponent(`Consultation Summary - MedConnect Nigeria - ${session.date}`);
       const notesText = session.notes.map(n => `- [${n.timestamp}] ${n.text.replace(/<[^>]+>/g, '')}`).join('\n');
       const recsText = session.recommendations ? `\n\nDoctor's Recommendations:\n${session.recommendations}` : '';
       const body = encodeURIComponent(`Hello,\n\nHere is the summary of your consultation with ${session.doctorName} on ${session.date}.\n\nDuration: ${session.duration}\n\nNotes:\n${notesText}${recsText}\n\nMedConnect Nigeria`);
       window.location.href = `mailto:?subject=${subject}&body=${body}`;
       setIsShareModalOpen(false);
    };

    const handleCopyLink = () => {
        // Mock link generation
        navigator.clipboard.writeText(`https://medconnect.ng/share/${session.id}`);
        setIsCopied(true);
        setTimeout(() => {
            setIsCopied(false);
            setIsShareModalOpen(false);
        }, 2000);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-fade-in">
           <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-lg font-bold text-slate-800">Share Notes</h3>
                 <button onClick={() => setIsShareModalOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
              </div>
              
              <div className="space-y-3">
                 <button onClick={handleShareEmail} className="w-full flex items-center gap-3 p-4 bg-slate-50 hover:bg-teal-50 border border-slate-100 hover:border-teal-200 rounded-xl transition-all group">
                    <div className="bg-white p-2 rounded-lg shadow-sm text-slate-600 group-hover:text-teal-600"><Mail className="w-5 h-5" /></div>
                    <span className="font-semibold text-slate-700 group-hover:text-teal-800">Share via Email</span>
                 </button>

                 <button onClick={handleCopyLink} className="w-full flex items-center gap-3 p-4 bg-slate-50 hover:bg-teal-50 border border-slate-100 hover:border-teal-200 rounded-xl transition-all group">
                    <div className="bg-white p-2 rounded-lg shadow-sm text-slate-600 group-hover:text-teal-600">
                        {isCopied ? <Check className="w-5 h-5 text-green-500" /> : <LinkIcon className="w-5 h-5" />}
                    </div>
                    <span className="font-semibold text-slate-700 group-hover:text-teal-800">
                        {isCopied ? "Link Copied!" : "Copy Secure Link"}
                    </span>
                 </button>
              </div>
           </div>
        </div>
    );
  };

  if (sessionEnded) {
    const currentSession = pastSessions.find(s => s.id === currentSessionId);
    
    return (
      <div className="animate-fade-in space-y-6 max-w-3xl mx-auto pb-10">
        {currentSession && renderShareModal(currentSession)}
        
        <div className="bg-green-50 border border-green-100 rounded-2xl p-8 text-center">
           <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8" />
           </div>
           <h2 className="text-2xl font-bold text-slate-800 mb-2">Consultation Completed</h2>
           <p className="text-slate-500">Your session has been securely recorded.</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
           <div className="p-6 border-b border-slate-100 flex flex-wrap gap-4 justify-between items-center bg-slate-50/50">
              <div className="flex gap-4 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                     <Calendar className="w-4 h-4 text-slate-400" />
                     {currentSession?.date}
                  </div>
                  <div className="flex items-center gap-2">
                     <Clock className="w-4 h-4 text-slate-400" />
                     {currentSession?.duration}
                  </div>
                  <div className="flex items-center gap-2">
                     <User className="w-4 h-4 text-slate-400" />
                     {currentSession?.doctorName}
                  </div>
              </div>
              <div className="flex gap-2">
                 {currentSession?.audioRecordingUrl && (
                     <a 
                       href={currentSession.audioRecordingUrl} 
                       download={`consultation-${currentSession.id}.webm`}
                       className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
                     >
                        <Download className="w-4 h-4" /> Recording
                     </a>
                 )}
                 <button 
                   onClick={() => setIsShareModalOpen(true)}
                   className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                 >
                    <Share2 className="w-4 h-4" /> Share
                 </button>
              </div>
           </div>

           <div className="p-6 space-y-6">
              <div>
                 <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <NotebookPen className="w-4 h-4 text-teal-600" /> Session Notes
                 </h3>
                 {currentSession?.notes.length === 0 ? (
                    <p className="text-slate-400 italic text-sm">No notes were taken during this session.</p>
                 ) : (
                    <div className="space-y-3">
                       {currentSession?.notes.map(note => (
                          <div key={note.id} className="flex gap-3 text-sm">
                             <span className="font-mono text-slate-400 text-xs shrink-0 mt-0.5">{note.timestamp}</span>
                             <div className="text-slate-700 prose prose-sm max-w-none w-full bg-slate-50 p-3 rounded-lg" dangerouslySetInnerHTML={{ __html: note.text }} />
                          </div>
                       ))}
                    </div>
                 )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                   <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-teal-600" /> Doctor's Recommendations
                   </h3>
                   <div className="flex items-center gap-3">
                      {/* Template Selector */}
                      <select 
                        className="text-xs border-slate-200 rounded-lg p-1.5 bg-white shadow-sm outline-none focus:ring-2 focus:ring-teal-500 text-slate-600"
                        onChange={(e) => {
                          if (e.target.value) setRecommendationsInput(RECOMMENDATION_TEMPLATES[e.target.value]);
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled>Load Template...</option>
                        {Object.keys(RECOMMENDATION_TEMPLATES).map(key => (
                          <option key={key} value={key}>{key}</option>
                        ))}
                      </select>

                      <button 
                        onClick={handleGenerateAIRecommendation}
                        disabled={isGeneratingRecs}
                        className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
                      >
                         {isGeneratingRecs ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                         Auto-Draft
                      </button>
                   </div>
                </div>
                <textarea 
                  className="w-full h-40 p-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-none"
                  placeholder="Enter medical advice, prescriptions, or follow-up instructions..."
                  value={recommendationsInput}
                  onChange={(e) => setRecommendationsInput(e.target.value)}
                />
              </div>
           </div>

           <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={handleCloseSummary}
                className="px-6 py-2.5 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors shadow-lg shadow-teal-600/20"
              >
                 Save & Close
              </button>
           </div>
        </div>
      </div>
    );
  }

  // Doctor Selection View (Lobby)
  if (!isActive && !isConnecting) {
    return (
      <div className="animate-fade-in space-y-6 max-w-5xl mx-auto pb-10">
        <div className="text-center mb-10">
           <h2 className="text-3xl font-bold text-slate-800 mb-2">Select a Specialist</h2>
           <p className="text-slate-500">Choose a doctor to begin your consultation.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
           {AVAILABLE_DOCTORS.map(doc => (
             <div 
               key={doc.id}
               onClick={() => setSelectedDoctor(doc)}
               className={`relative p-6 rounded-2xl border-2 transition-all cursor-pointer group ${
                 selectedDoctor?.id === doc.id 
                 ? 'border-teal-500 bg-teal-50 shadow-lg' 
                 : 'border-slate-100 bg-white hover:border-teal-200 hover:shadow-md'
               }`}
             >
                <div className="flex items-start gap-4">
                   <div className="text-4xl bg-white p-3 rounded-2xl shadow-sm">{doc.image}</div>
                   <div>
                      <h3 className="text-xl font-bold text-slate-800 group-hover:text-teal-700 transition-colors">{doc.name}</h3>
                      <p className="text-teal-600 font-medium text-sm mb-1">{doc.specialty}</p>
                      <p className="text-slate-500 text-xs leading-relaxed">{doc.desc}</p>
                   </div>
                </div>
                
                {selectedDoctor?.id === doc.id && (
                  <div className="absolute top-4 right-4 text-teal-500 animate-fade-in">
                     <CheckCircle className="w-6 h-6 fill-teal-500 text-white" />
                  </div>
                )}
             </div>
           ))}
        </div>

        <div className="fixed bottom-8 left-0 right-0 flex justify-center px-4 pointer-events-none">
           <button 
             onClick={startConsultation}
             disabled={!selectedDoctor}
             className="pointer-events-auto bg-slate-900 text-white px-8 py-4 rounded-full font-bold text-lg shadow-2xl hover:bg-slate-800 disabled:opacity-50 disabled:translate-y-10 disabled:pointer-events-none transition-all duration-300 flex items-center gap-3 transform hover:scale-105"
           >
             <Video className="w-6 h-6" />
             Start Video Consultation
           </button>
        </div>
      </div>
    );
  }

  // Video Consultation View
  return (
    <div className="h-[calc(100vh-140px)] flex gap-6 animate-fade-in relative">
      {/* Settings Modal */}
      {isSettingsOpen && (
        <div ref={settingsRef} className="absolute bottom-20 left-4 z-50 bg-white rounded-xl shadow-xl border border-slate-200 w-64 overflow-hidden animate-fade-in">
           <div className="p-3 bg-slate-50 border-b border-slate-100 font-semibold text-slate-700 text-sm">
             Video Settings
           </div>
           <div className="p-2">
             {Object.entries(RESOLUTIONS).map(([key, res]) => (
               <button
                 key={key}
                 onClick={() => handleResolutionChange(key as ResolutionKey)}
                 className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between ${resolution === key ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50'}`}
               >
                 {res.label}
                 {resolution === key && <Check className="w-4 h-4" />}
               </button>
             ))}
           </div>
           <div className="p-3 bg-blue-50 border-t border-blue-100 text-xs text-blue-800 flex gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <p>Lower resolutions work better on slow connections.</p>
           </div>
        </div>
      )}

      {/* Share Modal */}
      {isActive && currentSessionId && renderShareModal(pastSessions[0])}
      
      {/* Main Video Area */}
      <div className={`flex-1 flex flex-col bg-slate-900 rounded-3xl overflow-hidden shadow-2xl relative transition-all duration-300 ${activeSidebarView !== 'none' ? 'mr-[350px] hidden md:flex' : 'flex'}`}>
        
        {/* Header Overlay - Call Controls & Stats */}
        <div className="absolute top-0 left-0 right-0 p-6 z-20 flex justify-between items-start pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto">
             <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border ${
               isActive ? 'bg-green-500/20 border-green-500/30 text-green-100' : 'bg-white/10 border-white/10 text-slate-300'
             }`}>
                <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400 animate-pulse' : 'bg-slate-400'}`}></div>
                <span className="text-xs font-semibold tracking-wide uppercase">{isActive ? 'Live' : 'Connecting'}</span>
             </div>
             
             {/* Timer */}
             {isActive && (
                 <div className="flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md bg-black/40 border border-white/10 text-white text-xs font-mono">
                    <Clock className="w-3 h-3 text-slate-300" />
                    {elapsedTime}
                 </div>
             )}

             {/* Network Quality */}
             {isActive && (
                 <div className="group relative flex items-center">
                   <div className="flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md bg-black/40 border border-white/10 cursor-help transition-colors hover:bg-black/50">
                      {/* Signal Bars */}
                      <Signal className={`w-4 h-4 ${
                         networkStats.quality === 'excellent' ? 'text-emerald-400' : 
                         networkStats.quality === 'good' ? 'text-green-400' : 
                         networkStats.quality === 'fair' ? 'text-yellow-400' : 
                         networkStats.quality === 'poor' ? 'text-orange-400' : 'text-red-500'
                      }`} />
                   </div>
                 </div>
             )}

             {/* Recording Indicator */}
             {isRecording && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md bg-red-500/20 border border-red-500/30 text-red-100 text-xs font-semibold animate-pulse">
                   <Disc className="w-3 h-3 fill-red-500 text-red-500" /> REC
                </div>
             )}
          </div>

          {/* Patient Info Overlay */}
          <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-xs">
                  {user.name.charAt(0)}
              </div>
              <div className="text-white text-xs">
                  <p className="font-bold">{user.name}</p>
                  <p className="opacity-60">{user.age} yrs • {user.location}</p>
              </div>
          </div>
        </div>
        
        {/* VIDEO ELEMENT */}
        <video 
            ref={videoRef} 
            className={`w-full h-full object-cover transition-transform duration-500 transform -scale-x-100 ${isConnecting ? 'opacity-80' : 'opacity-100'}`}
            autoPlay 
            playsInline 
            muted={true} // Local video should always be muted to prevent feedback
        />

        {/* CONNECTING SPINNER (Transparent Background) */}
        {isConnecting && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 z-30 pointer-events-none">
                 <Loader2 className="w-12 h-12 text-white animate-spin mb-4" />
                 <p className="text-white font-bold text-lg animate-pulse">{status}</p>
                 <p className="text-white/60 text-sm mt-2">Setting up secure connection...</p>
            </div>
        )}

        {/* CONTROLS BAR */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 z-40 bg-black/60 backdrop-blur-xl p-3 rounded-full border border-white/10 shadow-2xl">
             <button onClick={toggleMute} className={`p-4 rounded-full transition-all ${isMuted ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`} title={isMuted ? "Unmute" : "Mute"}>
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
             </button>
             
             <button onClick={toggleVideo} className={`p-4 rounded-full transition-all ${!isVideoEnabled ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`} title={!isVideoEnabled ? "Turn Video On" : "Turn Video Off"}>
                {!isVideoEnabled ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
             </button>

             {/* Picture-in-Picture Button */}
             <button onClick={togglePip} className={`p-4 rounded-full transition-all ${isPipActive ? 'bg-teal-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`} title="Picture-in-Picture">
                <PictureInPicture className="w-6 h-6" />
             </button>

             <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className={`p-4 rounded-full transition-all ${isSettingsOpen ? 'bg-white text-slate-900' : 'bg-white/10 text-white hover:bg-white/20'}`} title="Settings">
                <Settings className="w-6 h-6" />
             </button>

             <button onClick={handleEndCall} className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all px-8 flex items-center gap-2 font-bold shadow-lg shadow-red-600/30">
                <PhoneOff className="w-6 h-6" />
                <span className="hidden md:inline">End Call</span>
             </button>
             
             <div className="w-px h-8 bg-white/20 mx-1"></div>

             <button onClick={() => toggleSidebar('notes')} className={`p-4 rounded-full transition-all ${activeSidebarView === 'notes' ? 'bg-white text-slate-900' : 'bg-white/10 text-white hover:bg-white/20'}`} title="Notes">
                <NotebookPen className="w-6 h-6" />
             </button>
        </div>

        {/* Hidden Canvas for Video Processing */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* SIDEBAR */}
      {activeSidebarView === 'notes' && (
        <div className="absolute md:static inset-y-0 right-0 w-full md:w-[350px] bg-white shadow-2xl border-l border-slate-200 flex flex-col z-50 animate-slide-in-right">
           <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                 <NotebookPen className="w-5 h-5 text-teal-600" /> Consultation Notes
              </h3>
              <div className="flex gap-1">
                 <button onClick={toggleRecording} className={`p-2 rounded-lg transition-colors ${isRecording ? 'text-red-500 bg-red-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`} title="Record Session">
                    <Disc className={`w-5 h-5 ${isRecording ? 'animate-pulse' : ''}`} />
                 </button>
                 <button onClick={() => toggleSidebar('none')} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                    <X className="w-5 h-5" />
                 </button>
              </div>
           </div>

           <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {notes.length === 0 ? (
                 <div className="text-center py-10 text-slate-400">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No notes yet. Type below to add.</p>
                 </div>
              ) : (
                 notes.map(note => (
                    <div key={note.id} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-sm group">
                       <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-mono text-slate-400">{note.timestamp}</span>
                       </div>
                       <div className="text-slate-700 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: note.text }} />
                    </div>
                 ))
              )}
           </div>

           {/* Editor Toolbar */}
           <div className="p-2 border-t border-slate-100 bg-white flex gap-1 justify-center">
              <button onClick={() => execCommand('bold')} className="p-2 hover:bg-slate-100 rounded text-slate-600"><Bold className="w-4 h-4" /></button>
              <button onClick={() => execCommand('italic')} className="p-2 hover:bg-slate-100 rounded text-slate-600"><Italic className="w-4 h-4" /></button>
              <button onClick={() => execCommand('insertUnorderedList')} className="p-2 hover:bg-slate-100 rounded text-slate-600"><ListIcon className="w-4 h-4" /></button>
           </div>

           {/* Input Area */}
           <div className="p-4 border-t border-slate-100 bg-white">
              <div 
                 ref={editorRef}
                 contentEditable
                 className="w-full min-h-[80px] max-h-[150px] overflow-y-auto p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none text-sm transition-all mb-3"
                 onKeyDown={handleKeyDown}
                 data-placeholder="Type notes here..."
              />
              <button 
                 onClick={handleNoteSubmit}
                 className="w-full py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                 <Plus className="w-4 h-4" /> Add Note
              </button>
           </div>
        </div>
      )}
    </div>
  );
}