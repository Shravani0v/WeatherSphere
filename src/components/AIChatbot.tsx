import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, 
  Send, 
  X, 
  Sparkles, 
  Trash2, 
  MessageSquare, 
  HelpCircle, 
  Loader2, 
  CornerDownLeft 
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import { WeatherDataPayload } from '../types';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

interface AIChatbotProps {
  currentWeather: WeatherDataPayload | null;
}

export const AIChatbot: React.FC<AIChatbotProps> = ({ currentWeather }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('weathersphere_ai_chat');
      if (saved) {
        setMessages(JSON.parse(saved));
      } else {
        // Initial welcoming message
        const welcomeMessage: Message = {
          id: 'welcome',
          role: 'model',
          content: `### Welcome to **WeatherSphere AI**! 🌦️🤖

I am your advanced meteorological, agricultural, and lifestyle co-pilot. I can help you:
* Plan **optimal outfits** for any temperature.
* Formulate **crop irrigation and seeding calendars** based on live soil metrics.
* Assess **outdoor sports viability** and wind hazard ratings.
* Break down **complex particulate indices (PM2.5, AQI)**.

Feel free to ask any question, or click one of the quick suggestions below!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages([welcomeMessage]);
      }
    } catch (e) {
      console.error('Failed to parse saved chat history:', e);
    }
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('weathersphere_ai_chat', JSON.stringify(messages));
    }
  }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text) return;

    if (!textToSend) {
      setInput('');
    }

    const userMessage: Message = {
      id: Math.random().toString(36).substring(2, 11),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      // Proxy request to Express server `/api/chat`
      const response = await axios.post('/api/chat', {
        messages: updatedMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        weatherContext: currentWeather
      });

      const aiMessage: Message = {
        id: Math.random().toString(36).substring(2, 11),
        role: 'model',
        content: response.data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      console.error('Chat AI request failed:', err);
      const errorMessage: Message = {
        id: Math.random().toString(36).substring(2, 11),
        role: 'model',
        content: `⚠️ **Connection Error**: I was unable to reach the advanced meteorological models. Please verify your connection or try again shortly.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    const welcomeMessage: Message = {
      id: 'welcome',
      role: 'model',
      content: `### Welcome back! 🌦️🤖\n\nChat cleared. How can I assist you with weather analysis, planting suggestions, or outdoor activities today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([welcomeMessage]);
    localStorage.removeItem('weathersphere_ai_chat');
  };

  const handleSuggestionClick = (topic: string) => {
    if (!currentWeather) {
      handleSend(`Let's discuss general weather analytics, clothing, and farming tips!`);
      return;
    }

    const cityName = currentWeather.location?.name || 'this city';
    let prompt = '';

    switch (topic) {
      case 'crops':
        prompt = `What specific agricultural recommendations, soil irrigation guidelines, and crop recommendations do you have for ${cityName} right now?`;
        break;
      case 'clothing':
        prompt = `Based on current temperatures and conditions in ${cityName}, what clothing combinations and accessories do you recommend for today?`;
        break;
      case 'activity':
        prompt = `Could you analyze the suitability of outdoor physical training (running, trekking, football, or swimming) in ${cityName} right now?`;
        break;
      case 'aqi':
        prompt = `Give me a breakdown of the respiratory and healthcare precautions to consider for ${cityName}'s current air quality and PM levels.`;
        break;
      default:
        prompt = `Can you analyze the current overall weather summary for ${cityName} and give me some safety warnings?`;
    }

    handleSend(prompt);
  };

  return (
    <>
      {/* FLOATING ACTION BUTTON */}
      <div className="fixed bottom-6 right-6 z-40">
        <motion.button
          id="ai-chatbot-toggle"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium px-4 py-3.5 rounded-full shadow-2xl shadow-teal-900/30 cursor-pointer border border-teal-500/30 group transition-all"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Bot className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          <span className="text-sm max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-out whitespace-nowrap">
            Ask AI Assistant
          </span>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
          </span>
        </motion.button>
      </div>

      {/* CHAT DRAWER */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="ai-chatbot-drawer"
            initial={{ opacity: 0, x: 100, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed bottom-24 right-6 w-96 md:w-[450px] h-[600px] max-h-[80vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden text-slate-100"
          >
            {/* HEADER */}
            <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-500/10 rounded-lg border border-teal-500/20 text-teal-400">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm tracking-tight text-white flex items-center gap-1.5">
                    WeatherSphere AI
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {currentWeather ? `Context active: ${currentWeather.location?.name}` : 'General Meteorological Copilot'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={handleClear}
                  title="Clear chat history"
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* MESSAGE CONTENT AREA */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/60 scrollbar-thin scrollbar-thumb-slate-800">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm ${
                      msg.role === 'user'
                        ? 'bg-teal-600 text-white rounded-tr-none shadow-md shadow-teal-900/10'
                        : 'bg-slate-950/60 border border-slate-800/80 text-slate-300 rounded-tl-none'
                    }`}
                  >
                    {msg.role === 'model' ? (
                      <div className="prose prose-invert prose-xs leading-relaxed max-w-none text-slate-300">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-line text-slate-100 font-medium">{msg.content}</p>
                    )}
                    <span className="block text-[9px] mt-1 text-right text-slate-400 select-none">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl rounded-tl-none px-4 py-3 text-sm text-slate-400 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                    <span>Analyzing climate vectors...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* QUICK SUGGESTIONS BLOCK */}
            {currentWeather && (
              <div className="px-4 py-2 bg-slate-950/35 border-t border-slate-800/50 flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none py-2 select-none">
                <button
                  onClick={() => handleSuggestionClick('crops')}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-950 border border-emerald-500/20 rounded-full text-xs text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  Planting & Crops
                </button>
                <button
                  onClick={() => handleSuggestionClick('clothing')}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-950 border border-teal-500/20 rounded-full text-xs text-teal-400 hover:bg-teal-500/10 hover:border-teal-500/40 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  What to Wear
                </button>
                <button
                  onClick={() => handleSuggestionClick('activity')}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-950 border border-sky-500/20 rounded-full text-xs text-sky-400 hover:bg-sky-500/10 hover:border-sky-500/40 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  Workout Viability
                </button>
                <button
                  onClick={() => handleSuggestionClick('aqi')}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-950 border border-amber-500/20 rounded-full text-xs text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/40 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  AQI Breakdown
                </button>
              </div>
            )}

            {/* INPUT PANEL */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-3 bg-slate-950/90 border-t border-slate-800 flex gap-2 items-center"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={currentWeather ? `Ask about weather in ${currentWeather.location?.name}...` : 'Type your query here...'}
                  disabled={isLoading}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-3.5 pr-10 text-xs focus:outline-none focus:border-teal-500/60 text-white placeholder-slate-500 transition-all"
                />
                <div 
                  className="absolute right-3.5 top-3 text-slate-600 cursor-help" 
                  title="Ask about farming, fashion, atmospheric safety, or generic queries!"
                >
                  <HelpCircle className="w-4 h-4" />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="p-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 rounded-xl text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border border-teal-500/20 flex items-center justify-center shadow-lg shadow-teal-900/15"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
