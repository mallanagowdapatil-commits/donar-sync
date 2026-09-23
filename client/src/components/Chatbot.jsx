import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageSquare, X, Send, Bot, User, Sparkles, Trash2, AlertCircle, RefreshCw } from 'lucide-react';

export default function Chatbot() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('donorsync_chat_history');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      { 
        id: 'm1', 
        text: "👋 Hello! I am **DonorSync AI**, your clinical support assistant. How can I assist with blood matching, eligibility pre-screening, or platform navigation today?", 
        sender: 'ai',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [lastFailedMsg, setLastFailedMsg] = useState(null);
  const messagesEndRef = useRef(null);

  const SUGGESTED_PROMPTS = [
    "Am I eligible to donate?",
    "How does emergency matching work?",
    "Explain blood compatibility",
    "How to register as a donor?"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, isOpen]);

  useEffect(() => {
    localStorage.setItem('donorsync_chat_history', JSON.stringify(messages));
  }, [messages]);

  const handleClearHistory = () => {
    const defaultMsg = [
      { 
        id: 'm1', 
        text: "👋 Hello! I am **DonorSync AI**, your clinical support assistant. How can I assist with blood matching, eligibility pre-screening, or platform navigation today?", 
        sender: 'ai',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
    setMessages(defaultMsg);
    localStorage.setItem('donorsync_chat_history', JSON.stringify(defaultMsg));
  };

  const handleSendMessage = async (textToSend) => {
    if (!textToSend.trim()) return;

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { id: `u-${Date.now()}`, text: textToSend, sender: 'user', time: currentTime };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);
    setLastFailedMsg(null);

    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          currentRoute: location.pathname
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        text: data.reply,
        sender: 'ai',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: data.suggestedPrompts
      }]);
    } catch (err) {
      setLastFailedMsg(textToSend);
      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        text: "🤖 Unable to connect to clinical knowledge service. Please verify your connection.\n\n*Notice: Pre-screening only. Final eligibility is determined by qualified healthcare professionals.*",
        sender: 'ai',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        failed: true
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="relative group p-4 rounded-full bg-brand-primary text-white shadow-2xl hover:scale-105 transition-all duration-300 neon-glow-red cursor-pointer flex items-center justify-center"
          title="Open Clinical AI Assistant"
        >
          <Sparkles className="h-6 w-6 animate-pulse" />
          <span className="absolute right-0 top-0 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        </button>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div className="w-[360px] sm:w-[420px] h-[580px] max-h-[85vh] rounded-3xl glass-panel border border-clinical-border shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-250">
          {/* Header */}
          <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-brand-primary/20 text-brand-primary neon-glow-red">
                <Bot className="h-5 w-5" />
              </div>
              <div className="text-left">
                <div className="flex items-center space-x-1.5">
                  <h3 className="text-sm font-bold text-white">DonorSync AI</h3>
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                </div>
                <p className="text-[10px] text-slate-400">Clinical Support & Triage Guide</p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={handleClearHistory}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
                title="Reset Conversation"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close Assistant"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Medical Advisory Banner */}
          <div className="px-3 py-1.5 bg-yellow-500/10 border-b border-yellow-500/20 text-[10px] text-yellow-500 flex items-center space-x-1 text-left">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-1">AI clinical guide only. Does not diagnose diseases or certify medical eligibility.</span>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
            {messages.map((msg) => (
              <div 
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-start space-x-2 max-w-[85%]">
                  {msg.sender === 'ai' && (
                    <div className="p-1 rounded-lg bg-brand-primary/10 text-brand-primary shrink-0 mt-0.5">
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                  )}

                  <div className={`p-3 rounded-2xl text-left ${
                    msg.sender === 'user' 
                      ? 'bg-brand-primary text-white rounded-br-none shadow-md' 
                      : 'bg-slate-900/90 text-slate-200 border border-slate-800 rounded-bl-none'
                  }`}>
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {msg.text}
                    </div>

                    {msg.failed && lastFailedMsg && (
                      <button
                        onClick={() => handleSendMessage(lastFailedMsg)}
                        className="mt-2 text-[10px] text-brand-primary flex items-center space-x-1 underline hover:text-red-300"
                      >
                        <RefreshCw className="h-3 w-3" />
                        <span>Retry query</span>
                      </button>
                    )}

                    {/* Optional Quick Action Suggestions */}
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                        {msg.suggestions.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => handleSendMessage(s)}
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-[10px] text-slate-300 transition-colors border border-slate-700 cursor-pointer"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {msg.sender === 'user' && (
                    <div className="p-1 rounded-lg bg-slate-800 text-slate-300 shrink-0 mt-0.5">
                      <User className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>

                {msg.time && (
                  <span className="text-[9px] text-slate-500 mt-1 px-1">{msg.time}</span>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center space-x-2 text-slate-400 text-xs">
                <Bot className="h-3.5 w-3.5 text-brand-primary" />
                <div className="flex space-x-1 p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Carousel */}
          <div className="px-3 py-1.5 bg-slate-950/80 border-t border-slate-800/80 overflow-x-auto flex space-x-1.5 scrollbar-none text-left">
            {SUGGESTED_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(p)}
                className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] text-slate-300 whitespace-nowrap hover:border-brand-primary/50 hover:text-white transition-all cursor-pointer shrink-0"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputValue); }}
            className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center space-x-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about compatibility, pre-screening, blood drives..."
              className="flex-1 px-3.5 py-2 rounded-xl glass-input text-xs text-white placeholder-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              className="p-2 rounded-xl bg-brand-primary text-white hover:bg-brand-hover disabled:opacity-50 transition-all cursor-pointer shadow-md"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
