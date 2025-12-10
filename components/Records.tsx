
import React, { useState, useRef, useEffect } from 'react';
import { MedicalRecord } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FileText, Download, ImageIcon, Sparkles, Loader2, Maximize2, X, Activity, Grid, MessageSquareText, Send, Bot, User, Minimize2 } from 'lucide-react';
import { createRecordsChatSession } from '../services/gemini';
import { Chat, GenerateContentResponse } from "@google/genai";

interface RecordsProps {
  records: MedicalRecord[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

const chartData = [
  { name: 'Jan', bp: 120, sugar: 95 },
  { name: 'Feb', bp: 122, sugar: 98 },
  { name: 'Mar', bp: 118, sugar: 92 },
  { name: 'Apr', bp: 125, sugar: 105 },
  { name: 'May', bp: 121, sugar: 96 },
  { name: 'Jun', bp: 119, sugar: 94 },
];

const mockImages = [
  { id: 1, title: 'Chest X-Ray', date: '2023-10-15', type: 'X-Ray', url: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&q=80&w=600', finding: 'Clear lung fields. No sign of pneumonia or consolidation.' },
  { id: 2, title: 'MRI Scan - Head', date: '2023-08-22', type: 'MRI', url: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&q=80&w=600', finding: 'Normal brain structure. No abnormalities detected.' },
  { id: 3, title: 'Lab Results - Blood', date: '2023-09-01', type: 'Report', url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&q=80&w=600', finding: 'Hemoglobin slightly low (11.5 g/dL). Recommend iron supplements.' },
];

const Records: React.FC<RecordsProps> = ({ records }) => {
  const [activeTab, setActiveTab] = useState<'trends' | 'gallery'>('trends');
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{id: number, text: string} | null>(null);

  // Chatbot State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'model', text: "Hello! I'm your Medical Records Assistant. I've reviewed your history. Ask me anything about your past visits, prescriptions, or test results." }
  ]);
  const chatSessionRef = useRef<Chat | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize session with records context
    if (!chatSessionRef.current) {
        chatSessionRef.current = createRecordsChatSession(records);
    }
  }, [records]);

  useEffect(() => {
    if (isChatOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

  const handleAnalyze = (id: number, finding: string) => {
    setAnalyzingId(id);
    setAnalysisResult(null);
    
    // Simulate AI Analysis delay
    setTimeout(() => {
        setAnalyzingId(null);
        setAnalysisResult({ id, text: finding });
    }, 2500);
  };

  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !chatSessionRef.current) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const response: GenerateContentResponse = await chatSessionRef.current.sendMessage({ message: userMsg.text });
      const aiMsg: ChatMessage = { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        text: response.text || "I'm sorry, I couldn't process that request." 
      };
      setChatMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("Chat error", error);
      setChatMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        text: "I'm having trouble connecting right now. Please try again later." 
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Medical Records & Imaging</h2>
        
        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
           <button 
             onClick={() => setActiveTab('trends')}
             className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'trends' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
             <Activity className="w-4 h-4" /> Vitals & History
           </button>
           <button 
             onClick={() => setActiveTab('gallery')}
             className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'gallery' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
             <Grid className="w-4 h-4" /> Imaging Gallery
           </button>
        </div>
      </div>

      {activeTab === 'trends' ? (
        <div className="space-y-6 animate-fade-in">
          {/* Health Trends Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                Health Trends (Blood Pressure vs Sugar)
            </h3>
            {/* Explicit inline style for height to prevent Recharts calculation issues */}
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                  />
                  <Line type="monotone" dataKey="bp" stroke="#0d9488" strokeWidth={3} dot={{ r: 4, fill: '#0d9488', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} name="BP (Sys)" />
                  <Line type="monotone" dataKey="sugar" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, fill: '#f43f5e', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} name="Blood Sugar" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Record List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800">Visit History</h3>
            {records.map(record => (
              <div key={record.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between group hover:border-teal-200 transition-all hover:shadow-md">
                <div className="flex gap-4">
                  <div className="bg-teal-50 p-3 rounded-xl text-teal-600 h-fit">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{record.diagnosis}</h4>
                    <p className="text-sm text-slate-500 font-medium mb-2">Dr. {record.doctor} • {new Date(record.date).toLocaleDateString()}</p>
                    {record.notes && (
                      <div className="text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 max-w-xl">
                         {record.notes}
                      </div>
                    )}
                  </div>
                </div>
                <button className="text-slate-400 hover:text-teal-600 transition-colors p-2 bg-slate-50 rounded-lg hover:bg-teal-50">
                  <Download className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
           {mockImages.map(img => (
              <div key={img.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden group hover:shadow-xl transition-all duration-300">
                 {/* Image Area */}
                 <div className="relative h-48 bg-slate-100 overflow-hidden">
                    <img src={img.url} alt={img.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                       {img.type}
                    </div>
                 </div>

                 {/* Content Area */}
                 <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                       <div>
                          <h4 className="font-bold text-slate-800">{img.title}</h4>
                          <p className="text-xs text-slate-500">{new Date(img.date).toLocaleDateString()}</p>
                       </div>
                       <button className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
                          <Maximize2 className="w-4 h-4" />
                       </button>
                    </div>

                    {/* AI Analysis Section */}
                    <div className="mt-4">
                       {analysisResult?.id === img.id ? (
                          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 animate-fade-in">
                             <div className="flex justify-between items-start mb-1">
                                <h5 className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                                   <Sparkles className="w-3 h-3" /> AI Findings
                                </h5>
                                <button onClick={() => setAnalysisResult(null)} className="text-indigo-400 hover:text-indigo-600">
                                   <X className="w-3 h-3" />
                                </button>
                             </div>
                             <p className="text-xs text-indigo-800 leading-relaxed">{analysisResult.text}</p>
                          </div>
                       ) : (
                          <button 
                            onClick={() => handleAnalyze(img.id, img.finding)}
                            disabled={analyzingId !== null}
                            className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                          >
                             {analyzingId === img.id ? (
                                <>
                                   <Loader2 className="w-3 h-3 animate-spin" /> Analyzing...
                                </>
                             ) : (
                                <>
                                   <Sparkles className="w-3 h-3 text-teal-400" /> Analyze with AI
                                </>
                             )}
                          </button>
                       )}
                    </div>
                 </div>
              </div>
           ))}
           
           {/* Add New Card */}
           <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center min-h-[300px] cursor-pointer hover:border-teal-300 hover:bg-teal-50/30 transition-all group">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
                 <ImageIcon className="w-8 h-8 text-slate-300 group-hover:text-teal-500" />
              </div>
              <p className="font-semibold text-slate-500 group-hover:text-teal-600">Upload New Scan</p>
              <p className="text-xs text-slate-400 mt-1">Supports JPG, PNG, DICOM</p>
           </div>
        </div>
      )}

      {/* Floating Chat Widget */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {isChatOpen && (
          <div className="mb-4 w-[350px] max-w-[calc(100vw-48px)] h-[500px] max-h-[60vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-fade-in">
             {/* Chat Header */}
             <div className="bg-indigo-600 p-4 text-white flex justify-between items-center shrink-0">
               <div className="flex items-center gap-2">
                 <div className="bg-white/20 p-1.5 rounded-lg">
                   <Bot className="w-5 h-5" />
                 </div>
                 <div>
                   <h3 className="font-bold text-sm">Records Assistant</h3>
                   <p className="text-xs opacity-80">Connected to Medical History</p>
                 </div>
               </div>
               <button 
                 onClick={() => setIsChatOpen(false)}
                 className="hover:bg-white/10 p-1 rounded transition-colors"
               >
                 <Minimize2 className="w-5 h-5" />
               </button>
             </div>

             {/* Disclaimer Banner */}
             <div className="bg-amber-50 p-2 text-center border-b border-amber-100">
               <p className="text-[10px] text-amber-800 font-medium">
                  AI-generated responses based on your records. Not medical advice.
               </p>
             </div>

             {/* Chat Messages */}
             <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
               {chatMessages.map((msg) => (
                 <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-indigo-100 text-indigo-700' : 'bg-white border border-slate-200 text-slate-600'}`}>
                      {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                   </div>
                   <div className={`max-w-[80%] rounded-2xl p-3 text-sm leading-relaxed shadow-sm ${
                     msg.role === 'user' 
                       ? 'bg-indigo-600 text-white rounded-tr-none' 
                       : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                   }`}>
                     {msg.text}
                   </div>
                 </div>
               ))}
               {isChatLoading && (
                 <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div className="bg-white border border-slate-100 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100"></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200"></div>
                    </div>
                 </div>
               )}
               <div ref={chatEndRef} />
             </div>

             {/* Chat Input */}
             <form onSubmit={handleSendChatMessage} className="p-3 bg-white border-t border-slate-100 flex gap-2">
               <input
                 type="text"
                 value={chatInput}
                 onChange={(e) => setChatInput(e.target.value)}
                 placeholder="Ask about your history..."
                 className="flex-1 bg-slate-100 border-0 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
               />
               <button 
                 type="submit"
                 disabled={!chatInput.trim() || isChatLoading}
                 className="bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
               >
                 <Send className="w-4 h-4" />
               </button>
             </form>
          </div>
        )}

        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`flex items-center gap-2 px-5 py-4 rounded-full shadow-xl transition-all font-bold ${
            isChatOpen 
              ? 'bg-slate-800 text-white hover:bg-slate-900' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105'
          }`}
        >
          {isChatOpen ? <X className="w-6 h-6" /> : <MessageSquareText className="w-6 h-6" />}
          {!isChatOpen && <span>Ask Records</span>}
        </button>
      </div>

    </div>
  );
};

export default Records;
