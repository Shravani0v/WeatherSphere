import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  Sprout, 
  Shirt, 
  Heart, 
  AlertTriangle, 
  RefreshCw,
  HelpCircle,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface WeatherAIChatbotProps {
  weatherData: any | null;
}

// Simple Custom Markdown Renderer to style AI responses beautifully without external md dependencies
function MarkdownRenderer({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5 text-slate-300 text-xs">
      {lines.map((line, i) => {
        // Headers
        if (line.startsWith('### ')) {
          return <h3 key={i} className="text-sm font-bold text-sky-400 mt-4 mb-1.5 flex items-center gap-1.5">{line.slice(4)}</h3>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={i} className="text-base font-bold text-slate-100 mt-4 mb-2">{line.slice(3)}</h2>;
        }
        if (line.startsWith('# ')) {
          return <h1 key={i} className="text-lg font-bold text-slate-100 mt-5 mb-2">{line.slice(2)}</h1>;
        }
        // Bullet lists
        if (line.startsWith('* ') || line.startsWith('- ')) {
          return (
            <div key={i} className="flex gap-2 pl-3 py-0.5">
              <span className="text-sky-500 font-bold">•</span>
              <span className="text-slate-300 leading-relaxed flex-1">{parseBold(line.slice(2))}</span>
            </div>
          );
        }
        // Number lists
        const numMatch = line.match(/^(\d+)\.\s(.*)/);
        if (numMatch) {
          return (
            <div key={i} className="flex gap-2 pl-3 py-0.5">
              <span className="text-sky-500 font-mono text-[10px] font-bold">{numMatch[1]}.</span>
              <span className="text-slate-300 leading-relaxed flex-1">{parseBold(numMatch[2])}</span>
            </div>
          );
        }
        // Empty line
        if (line.trim() === '') {
          return <div key={i} className="h-1.5" />;
        }
        // Default paragraph
        return <p key={i} className="leading-relaxed text-slate-300 py-0.5">{parseBold(line)}</p>;
      })}
    </div>
  );
}

function parseBold(text: string) {
  const parts = text.split('**');
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return <strong key={index} className="text-white font-bold bg-white/5 px-1 rounded">{part}</strong>;
    }
    return part;
  });
}

export function WeatherAIChatbot({ weatherData }: WeatherAIChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Suggested preset questions for the selected city
  const cityName = weatherData?.location?.name || 'your current city';
  const quickTriggers = [
    {
      label: 'Clothing choices today',
      icon: Shirt,
      color: 'text-amber-400 bg-amber-400/5 border-amber-400/10',
      prompt: `Based on the current weather in ${cityName}, what clothes should I wear, and what accessories should I carry today?`
    },
    {
      label: 'Agricultural advice',
      icon: Sprout,
      color: 'text-emerald-400 bg-emerald-400/5 border-emerald-400/10',
      prompt: `Provide agricultural advice for the weather conditions in ${cityName}. What are the crop suggestions, irrigation requirements, and farming tips?`
    },
    {
      label: 'Health & Air Quality impact',
      icon: Heart,
      color: 'text-sky-400 bg-sky-400/5 border-sky-400/10',
      prompt: `What is the current Air Quality Index (AQI) impact in ${cityName}, and are there any physical outdoor activity advisories?`
    },
    {
      label: 'Safety & Risk precautions',
      icon: AlertTriangle,
      color: 'text-rose-400 bg-rose-400/5 border-rose-400/10',
      prompt: `Analyze the safety risks, heavy rainfall, or wind threats in ${cityName} right now and list immediate precautions.`
    }
  ];

  // Auto-scroll to latest messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Set initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeText = weatherData 
        ? `### Welcome to **WeatherSphere AI Assistant**! 🌦️🤖\n\nI am connected to your selected city: **${cityName}**.\n\nYou can query me about **clothing recommendations**, **farming suitabilities**, **outdoor running indices**, **severe alerts safety rules**, or chat freely on any topic!\n\n*Click one of the quick trigger buttons below to start, or type your own question!*`
        : `### Welcome to **WeatherSphere AI Assistant**! 🌦️🤖\n\nI can help you with microclimate analyses, lifestyle guides, safe agricultural planning, or free conversational Q&A.\n\n*Select a city on the dashboard to unlock localized smart weather recommendations, or type a query to begin!*`;

      setMessages([
        {
          role: 'assistant',
          content: welcomeText,
          timestamp: new Date()
        }
      ]);
    }
  }, [weatherData, cityName]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    setError(null);
    const userMsg: Message = {
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Keep only recent messages to control context window and token usage
      const recentHistory = [...messages, userMsg].slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: recentHistory,
          weatherContext: weatherData
        })
      });

      if (!res.ok) {
        throw new Error('Server returned an error response.');
      }

      const data = await res.json();
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.reply || "I am unable to interpret your request at this moment.",
        timestamp: new Date()
      }]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setError('Connection to AI service failed. Using local rule-based safety replies.');
      
      // Local Client-side static fallback if server is completely offline
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `### Offline Metrological Fallback ⚠️\n\nI was unable to connect to the cloud Gemini API. However, here are localized suggestions based on our state engine:\n\n* **Current Active Focus**: ${weatherData?.location?.name || 'General Query'}\n* **Farming Tip**: Prioritize morning watering schedules to secure adequate hydration against soil evaporation.\n* **Wardrobe Tip**: Wear layered clothing to smoothly transition through temperature differences during the day.\n\n*Please verify your Internet connection or check the Settings secrets.*`,
          timestamp: new Date()
        }]);
      }, 800);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-180px)] min-h-[500px]">
      {/* Left Sidebar: Quick Presets */}
      <div className="lg:col-span-1 flex flex-col justify-between p-6 rounded-3xl bg-white/5 dark:bg-slate-950/40 border border-slate-200/10 shadow-2xl glass-card space-y-4 text-left h-full">
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Bot size={20} className="text-sky-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-100 font-display">Climate Presets</h3>
              <p className="text-[10px] text-slate-500">Instant context-aware inquiries</p>
            </div>
          </div>

          <div className="space-y-2">
            {quickTriggers.map((qt, idx) => {
              const QtIcon = qt.icon;
              return (
                <button
                  key={idx}
                  disabled={loading}
                  onClick={() => handleSend(qt.prompt)}
                  className={`w-full p-3 rounded-2xl border text-left flex items-start gap-3 transition-all hover:bg-white/5 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed ${qt.color}`}
                >
                  <QtIcon size={16} className="mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold leading-tight">{qt.label}</h4>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 line-clamp-1">Inquire for {cityName}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected City Details Context Widget */}
        <div className="p-4 rounded-2xl bg-slate-950/20 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-slate-400 text-[10px] font-mono uppercase tracking-wider">
            <Clock size={10} />
            <span>Active City Context</span>
          </div>
          {weatherData ? (
            <div className="space-y-1">
              <p className="font-bold text-slate-200 line-clamp-1">{weatherData.location.name}</p>
              <div className="flex justify-between text-slate-400 text-[10px]">
                <span>Temp: {weatherData.current.temp}°C</span>
                <span>AQI: {weatherData.aqi.aqiUS}</span>
              </div>
              <p className="text-[10px] text-sky-400 font-semibold line-clamp-1 mt-1">{weatherData.current.conditionText}</p>
            </div>
          ) : (
            <p className="text-[10px] text-slate-500 italic">No city selected. Use Dashboard search for full localized analysis.</p>
          )}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="lg:col-span-3 flex flex-col rounded-3xl bg-white/5 dark:bg-slate-950/40 border border-slate-200/10 shadow-2xl glass-card overflow-hidden h-full">
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-slate-900/30">
          <div className="flex items-center gap-3 text-left">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-500/20 to-blue-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Sparkles size={16} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-slate-100 font-display">WeatherSphere AI Assistant</h2>
                <span className="text-[9px] font-mono font-bold bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded">GEMINI LITE</span>
              </div>
              <p className="text-[10px] text-slate-500">Ask free queries or analyze microclimate suitability</p>
            </div>
          </div>

          {messages.length > 1 && (
            <button
              onClick={() => {
                setMessages([]);
              }}
              className="p-2 bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-xl border border-white/5 text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95"
              title="Clear Thread"
            >
              <RefreshCw size={10} />
              Reset Thread
            </button>
          )}
        </div>

        {/* Scrollable messages container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className={`flex gap-3 text-left max-w-[85%] ${
                  msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
                }`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border text-xs ${
                  msg.role === 'user' 
                    ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' 
                    : 'bg-slate-800/80 border-white/5 text-slate-300'
                }`}>
                  {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>

                {/* Message Bubble */}
                <div className={`p-4 rounded-3xl ${
                  msg.role === 'user'
                    ? 'bg-blue-600/15 border border-blue-500/20 text-slate-200 rounded-tr-sm'
                    : 'bg-slate-900/40 border border-white/5 text-slate-300 rounded-tl-sm'
                }`}>
                  {msg.role === 'assistant' ? (
                    <MarkdownRenderer text={msg.content} />
                  ) : (
                    <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  )}
                  
                  {/* Footer Timestamp */}
                  <div className="flex justify-end mt-2 text-[8px] text-slate-500 select-none">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3 text-left max-w-[85%]"
            >
              <div className="w-8 h-8 rounded-xl bg-slate-800/80 border border-white/5 flex items-center justify-center shrink-0 text-slate-300">
                <Bot size={14} />
              </div>
              <div className="px-5 py-3 rounded-3xl bg-slate-900/40 border border-white/5 text-slate-400 text-xs flex items-center gap-2 rounded-tl-sm">
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-[10px] font-mono tracking-wider text-slate-500 uppercase">AI is analyzing context...</span>
              </div>
            </motion.div>
          )}

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] rounded-xl text-center max-w-lg mx-auto">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
          className="p-4 border-t border-white/5 bg-slate-900/30 flex items-center gap-3"
        >
          <input
            type="text"
            value={input}
            disabled={loading}
            onChange={(e) => setInput(e.target.value)}
            placeholder={loading ? "AI is processing..." : "Ask me anything about microclimates, clothing recommendations, general queries..."}
            className="flex-1 px-4 py-3 bg-slate-950/40 border border-white/5 rounded-2xl text-xs text-slate-200 focus:outline-none focus:border-sky-500/40 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white rounded-2xl transition-all disabled:opacity-50 active:scale-95 shrink-0"
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
