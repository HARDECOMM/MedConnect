import React, { useState, useRef, useEffect } from 'react';
import { ViewState } from '../types';
import { searchMedicalInfo, createMedicalChatSession, generateEducationalVideo, SEARCH_SUGGESTIONS } from '../services/gemini';
import { Search, Info, Loader2, X, MessageCircle, Send, Minimize2, Bot, User, LayoutGrid, AlertCircle, Sparkles, Video, Play, ArrowLeft } from 'lucide-react';
import { Chat, GenerateContentResponse } from "@google/genai";

interface EducationProps {
  setViewState: (view: ViewState) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

const QUICK_TOPICS = [
  { label: "Malaria Prevention", emoji: "🦟" },
  { label: "Typhoid Symptoms", emoji: "🤒" },
  { label: "High Blood Pressure", emoji: "❤️" },
  { label: "Diabetes Diet", emoji: "🥗" },
  { label: "Pregnancy Care", emoji: "🤰" },
  { label: "Baby Vaccination", emoji: "💉" },
  { label: "First Aid for Burns", emoji: "🩹" },
  { label: "Clean Water Tips", emoji: "💧" },
];

const Education: React.FC<EducationProps> = ({ setViewState }) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ text: string; grounding?: any[] } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  // Video Generation State
  const [showVideoGenerator, setShowVideoGenerator] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  
  // Auto-suggestion state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Chatbot State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'model', text: "Hello! I'm your MedConnect assistant. How can I help you today?" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatSessionRef = useRef<Chat | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Click outside to close suggestions
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    
    // Initialize Chat Session once on mount
    if (!chatSessionRef.current) {
        try {
            chatSessionRef.current = createMedicalChatSession();
        } catch (e) {
            console.error("Failed to init chat", e);
        }
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    if (isChatOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setSearchError(null);
    
    if (val.trim().length > 0) {
      const matches = SEARCH_SUGGESTIONS.filter(item => 
        item.toLowerCase().includes(val.toLowerCase())
      );
      setFilteredSuggestions(matches);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    triggerSearch(suggestion, activeCategory);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    triggerSearch(query, activeCategory);
  };

  const triggerSearch = async (searchQuery: string, category: string) => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setSearchError(null);
    setShowSuggestions(false);
    setResult(null);
    setGeneratedVideoUrl(null); 
    setVideoError(null);
    setShowVideoGenerator(false); // Reset video view
    
    try {
        const data = await searchMedicalInfo(searchQuery, category);
        if (!data || (!data.text && !data.grounding)) {
             setSearchError("No results found. Please try a different query.");
        } else {
             // Clean markdown code blocks if present
             const cleanText = data.text ? data.text.replace(/```html/g, '').replace(/```/g, '') : '';
             setResult({ ...data, text: cleanText });
        }
    } catch (e) {
        setSearchError("An error occurred while searching. Please check your connection.");
    } finally {
        setLoading(false);
    }
  };

  const handleGenerateSearchVideo = async () => {
    if (!query.trim()) return;
    
    setIsGeneratingVideo(true);
    setShowVideoGenerator(true);
    setVideoError(null);
    
    try {
        const url = await generateEducationalVideo(query);
        if (url) {
            setGeneratedVideoUrl(url);
        } else {
            setVideoError("Unable to generate video at this time. Please try again later.");
        }
    } catch (e) {
        console.error(e);
        setVideoError("An error occurred while connecting to the video service.");
    } finally {
        setIsGeneratingVideo(false);
    }
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
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-20 relative min-h-[80vh]">
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
          <button onClick={() => setViewState(ViewState.DASHBOARD)} className="p-2 hover:bg-slate-100 rounded-full transition-colors md:hidden">
             <ArrowLeft className="w-6 h-6 text-slate-600" />
          </button>
          <div>
             <h2 className="text-3xl font-bold text-slate-800">Health Education Hub</h2>
             <p className="text-slate-500">Search trusted medical articles and guides.</p>
          </div>
      </div>

      {/* SEARCH SECTION */}
      <div className="relative z-20 max-w-2xl" ref={wrapperRef}>
        <form onSubmit={handleSearch} className="relative">
            <input
                type="text"
                value={query}
                onChange={handleInputChange}
                onFocus={() => query.trim() && setShowSuggestions(true)}
                placeholder="Search topic (e.g., 'Malaria Symptoms')"
                className="w-full pl-12 pr-28 py-4 rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-lg"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6" />
            
            {query && (
                <button
                type="button"
                onClick={() => { setQuery(''); setShowSuggestions(false); }}
                className="absolute right-28 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                <X className="w-5 h-5" />
                </button>
            )}

            <button 
                type="submit"
                disabled={loading}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-teal-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </button>
        </form>

        {/* Auto-suggestions */}
        {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute w-full mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50">
                {filteredSuggestions.map((suggestion, index) => (
                <button
                    key={index}
                    onClick={() => selectSuggestion(suggestion)}
                    className="w-full text-left px-4 py-3 hover:bg-teal-50 text-slate-700 text-sm flex items-center gap-3 transition-colors border-b border-slate-50 last:border-0"
                >
                    <Search className="w-4 h-4 text-slate-300" />
                    {suggestion}
                </button>
                ))}
            </div>
        )}
      </div>

      {/* QUICK TOPICS - VISIBLE WHEN NO RESULTS */}
      {!result && !loading && (
        <div className="max-w-4xl mt-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 ml-1">Explore Popular Topics</h3>
            <div className="flex flex-wrap gap-3">
                {QUICK_TOPICS.map((topic, idx) => (
                    <button
                        key={idx}
                        onClick={() => {
                            setQuery(topic.label);
                            triggerSearch(topic.label, 'All');
                        }}
                        className="flex items-center gap-2 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-200 px-4 py-3 rounded-xl transition-all shadow-sm group"
                    >
                        <span className="text-lg">{topic.emoji}</span>
                        <span className="text-slate-700 font-medium text-sm group-hover:text-teal-700">{topic.label}</span>
                    </button>
                ))}
            </div>
        </div>
      )}

      {/* ERROR STATE */}
      {searchError && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl text-center border border-red-100 max-w-2xl mt-4">
            <p>{searchError}</p>
          </div>
      )}

      {/* EMPTY STATE - INFO CARDS */}
      {!result && !loading && !searchError && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 opacity-60">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 text-center flex flex-col items-center">
                <Search className="w-10 h-10 text-teal-200 mb-3" />
                <h3 className="font-bold text-slate-700 mb-1">Search Articles</h3>
                <p className="text-xs text-slate-500">Verified medical data grounded in science.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 text-center flex flex-col items-center">
                <LayoutGrid className="w-10 h-10 text-indigo-200 mb-3" />
                <h3 className="font-bold text-slate-700 mb-1">Structured Data</h3>
                <p className="text-xs text-slate-500">Clear lists of symptoms and treatments.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 text-center flex flex-col items-center">
                <Video className="w-10 h-10 text-purple-200 mb-3" />
                <h3 className="font-bold text-slate-700 mb-1">AI Video Guides</h3>
                <p className="text-xs text-slate-500">Premium: Convert text to animated coaching.</p>
            </div>
          </div>
      )}

      {/* SEARCH RESULTS */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8 animate-slide-in-right">
            
            {/* LEFT COLUMN: Text Content */}
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                    <div className="prose prose-slate max-w-none prose-headings:text-teal-900 prose-headings:font-bold prose-h3:text-xl prose-a:text-teal-600 prose-strong:text-slate-800 prose-li:marker:text-teal-500">
                        <div dangerouslySetInnerHTML={{ __html: result.text }} />
                    </div>
                    
                    {/* Sources Footer */}
                    {result.grounding && result.grounding.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-slate-100">
                            <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                                <Info className="w-3 h-3" /> Verified Sources
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {result.grounding.map((chunk, i) => (
                                    chunk.web?.uri && (
                                        <a 
                                            key={i} 
                                            href={chunk.web.uri} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="text-xs bg-slate-50 text-slate-500 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-teal-300 hover:text-teal-700 transition-colors truncate max-w-[200px] flex items-center gap-1"
                                        >
                                            <Info className="w-3 h-3" />
                                            {chunk.web.title || "Source"}
                                        </a>
                                    )
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT COLUMN: AI Video Generator */}
            <div className="lg:col-span-1">
                <div className="sticky top-6 space-y-4">
                    
                    {/* Video Generator Card */}
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 text-white shadow-xl overflow-hidden relative">
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                        
                        <div className="relative z-10">
                            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-yellow-300" />
                                AI Video Coach
                            </h3>
                            <p className="text-indigo-100 text-sm mb-6 leading-relaxed">
                                Need a visual guide? Generate a custom animated video about <strong>"{query}"</strong> instantly.
                            </p>

                            {!showVideoGenerator ? (
                                <button 
                                    onClick={handleGenerateSearchVideo}
                                    className="w-full py-4 bg-white text-indigo-700 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-all shadow-lg flex items-center justify-center gap-2 group"
                                >
                                    <Video className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    Generate Video Guide
                                </button>
                            ) : (
                                <div className="rounded-xl overflow-hidden border-2 border-white/20 bg-black/40 backdrop-blur-sm shadow-inner aspect-video flex items-center justify-center relative">
                                    {isGeneratingVideo ? (
                                        <div className="text-center p-4">
                                            <Loader2 className="w-8 h-8 text-white animate-spin mx-auto mb-2" />
                                            <p className="text-xs text-white font-medium">Creating Animation...</p>
                                        </div>
                                    ) : generatedVideoUrl ? (
                                        <>
                                            <video src={generatedVideoUrl} controls autoPlay loop className="w-full h-full object-contain" />
                                            <button 
                                                onClick={() => setShowVideoGenerator(false)} 
                                                className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/80"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </>
                                    ) : (
                                        <div className="text-center p-4">
                                            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                                            <p className="text-xs text-white mb-2">{videoError || "Generation Failed"}</p>
                                            <button onClick={() => setShowVideoGenerator(false)} className="text-xs underline text-white/80">Close</button>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            <div className="mt-4 flex items-center gap-2 justify-center opacity-60">
                                <span className="text-[10px] uppercase tracking-wider font-bold">Powered by Gemini Veo</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Floating Chat Widget */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {isChatOpen && (
          <div className="mb-4 w-[350px] max-w-[calc(100vw-48px)] h-[500px] max-h-[60vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-fade-in">
             {/* Chat Header */}
             <div className="bg-teal-600 p-4 text-white flex justify-between items-center shrink-0">
               <div className="flex items-center gap-2">
                 <div className="bg-white/20 p-1.5 rounded-lg">
                   <Bot className="w-5 h-5" />
                 </div>
                 <div>
                   <h3 className="font-bold text-sm">Health Assistant</h3>
                   <p className="text-xs opacity-80">Ask me anything</p>
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
             <div className="bg-amber-50 p-2 text-center border-b border-amber-100 shrink-0">
               <p className="text-[10px] text-amber-800 font-medium flex items-center justify-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  I am an AI. Please consult a doctor for medical advice.
               </p>
             </div>

             {/* Chat Messages */}
             <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
               {chatMessages.map((msg) => (
                 <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-teal-100 text-teal-700' : 'bg-white border border-slate-200 text-slate-600'}`}>
                      {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                   </div>
                   <div className={`max-w-[80%] rounded-2xl p-3 text-sm leading-relaxed shadow-sm ${
                     msg.role === 'user' 
                       ? 'bg-teal-600 text-white rounded-tr-none' 
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
                 placeholder="Type your health question..."
                 className="flex-1 bg-slate-100 border-0 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
               />
               <button 
                 type="submit"
                 disabled={!chatInput.trim() || isChatLoading}
                 className="bg-teal-600 text-white p-2.5 rounded-xl hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
              : 'bg-teal-600 text-white hover:bg-teal-700 hover:scale-105'
          }`}
        >
          {isChatOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
          {!isChatOpen && <span>AI Assistant</span>}
        </button>
      </div>
    </div>
  );
};

export default Education;