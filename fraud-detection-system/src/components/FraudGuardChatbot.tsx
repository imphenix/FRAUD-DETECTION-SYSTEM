import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  X,
  Bot,
  User as UserIcon,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Trash2,
  Maximize2,
  Minimize2,
  ChevronRight,
  Loader2,
  HelpCircle,
  Cpu,
  AlertTriangle
} from 'lucide-react';
import { cyberSound } from '../utils/cyberSound';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  isError?: boolean;
}

interface FraudGuardChatbotProps {
  currentUser: {
    id: number;
    username: string;
    fullName: string;
    role: 'ADMIN' | 'CUSTOMER';
    accountNumber?: string;
    balance?: number;
  } | null;
  activeTab?: string;
  onNavigateTab?: (tab: any) => void;
}

const QUICK_PROMPTS_LOGGED_IN = [
  'How do I make a payment or transfer?',
  'How does QR Pay & mobile OTP approval work?',
  'Check my linked bank balance & security status',
  'Analyze my recent transactions & risk score',
  'Why do payments get FLAGGED or BLOCKED?'
];

const QUICK_PROMPTS_GUEST = [
  'How do payments work on this website?',
  'How does QR Pay mobile verification work?',
  'Why do payments get FLAGGED or BLOCKED?',
  'How are accounts & transactions secured?'
];

export const FraudGuardChatbot: React.FC<FraudGuardChatbotProps> = ({
  currentUser,
  activeTab,
  onNavigateTab
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'model',
      text: currentUser
        ? `Hello **${currentUser.fullName}**! I am **FraudGuard SOC Copilot**, your AI cybersecurity & banking assistant.\n\nI have live access to your account telemetry, transaction ledger, fraud rules, and investigation cases. How can I assist you today?`
        : `Welcome to **FraudGuard SOC**! I am your AI Threat Intelligence & Payment Assistant.\n\nYou can ask me how payments and QR Pay work, how our real-time fraud detection rules operate, or how transaction anomalies are evaluated.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // Update welcome greeting when user logs in or out
  useEffect(() => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'model',
        text: currentUser
          ? `Hello **${currentUser.fullName}** (${currentUser.role})! I am **FraudGuard SOC Copilot**.\n\nI can analyze your live transactions in **₹ INR**, explain triggered fraud rules, check active investigation cases, or guide you through QR Pay & simulator scenarios.`
          : `Welcome to **FraudGuard SOC**! I am your AI Threat Intelligence & Banking Assistant.\n\nAsk me anything about signing in, testing the Fraud Detection Engine, or exploring our security features.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  }, [currentUser?.id]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, messages.length]);

  const sendMessage = async (promptText?: string) => {
    const textToSend = (promptText !== undefined ? promptText : input).trim();
    if (!textToSend || isLoading) return;

    cyberSound.playClick();
    if (promptText === undefined) {
      setInput('');
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const historyPayload = updatedMessages
        .filter(m => !m.isError)
        .slice(-10)
        .map(m => ({
          role: m.role,
          text: m.text
        }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: historyPayload,
          activeTab: activeTab || 'dashboard'
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || `Server error (${res.status})`);
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'model',
        text: data.reply || 'No response received from SOC AI Engine.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);
      if (!isOpen) {
        setUnreadCount(prev => prev + 1);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        text: `⚠️ **SOC AI Communication Alert:** ${err.message || 'Unable to reach the Gemini AI endpoint.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    cyberSound.playClick();
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'model',
        text: currentUser
          ? `Chat history cleared. Ready for new queries, **${currentUser.fullName}**.`
          : `Chat history cleared. How can I help you explore **FraudGuard SOC**?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Simple inline formatter for ### headings, **bold**, `code`, and bullet lines
  const formatMessageText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      const isHeading = trimmed.startsWith('### ') || trimmed.startsWith('## ');
      const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ');
      const cleanLine = isHeading
        ? trimmed.replace(/^#{2,3}\s+/, '')
        : isBullet
        ? trimmed.substring(2)
        : line;

      const parts = cleanLine.split(/(\*\*.*?\*\*|`.*?`)/g);
      const renderedParts = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={pIdx} className="text-[#F8FAFC] font-bold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code
              key={pIdx}
              className="px-1.5 py-0.5 rounded bg-[#07111F] text-[#00D9FF] font-mono text-[11px] border border-cyan-500/30"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={pIdx}>{part}</span>;
      });

      if (isHeading) {
        return (
          <div key={idx} className="text-xs font-bold text-[#00D9FF] border-b border-blue-900/50 pb-1 mb-1.5 mt-1">
            {renderedParts}
          </div>
        );
      }

      if (isBullet) {
        return (
          <div key={idx} className="flex items-start gap-2 pl-1 my-1">
            <span className="text-[#00D9FF] mt-1 text-[10px]">●</span>
            <span className="flex-1">{renderedParts}</span>
          </div>
        );
      }

      if (trimmed === '') {
        return <div key={idx} className="h-2" />;
      }

      return (
        <p key={idx} className="leading-relaxed">
          {renderedParts}
        </p>
      );
    });
  };

  const quickPrompts = currentUser ? QUICK_PROMPTS_LOGGED_IN : QUICK_PROMPTS_GUEST;

  return (
    <div className="fixed bottom-5 right-5 z-50 font-sans">
      {/* CHAT WINDOW */}
      {isOpen && (
        <div
          className={`mb-3 bg-[#0D1828]/95 backdrop-blur-2xl border border-cyan-500/40 rounded-2xl shadow-[0_0_45px_rgba(0,217,255,0.22)] flex flex-col overflow-hidden transition-all duration-300 ${
            isExpanded
              ? 'w-[92vw] sm:w-[560px] h-[80vh] sm:h-[680px]'
              : 'w-[90vw] sm:w-[400px] h-[540px] max-h-[82vh]'
          }`}
        >
          {/* HEADER */}
          <div className="p-3.5 bg-gradient-to-r from-[#07111F] via-[#0D1F38] to-[#07111F] border-b border-blue-900/60 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#1677FF] to-[#00D9FF] flex items-center justify-center text-white shadow-[0_0_15px_rgba(0,217,255,0.4)]">
                  <Bot className="w-5 h-5" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#07111F] animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-[#F8FAFC] tracking-wide">
                    FraudGuard AI Copilot
                  </h3>
                  <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold rounded bg-cyan-500/20 text-[#00D9FF] border border-cyan-500/30">
                    SOC-AI
                  </span>
                </div>
                <div className="text-[10px] font-mono text-[#94A3B8] flex items-center gap-1.5">
                  <Sparkles className="w-2.5 h-2.5 text-[#00D9FF]" />
                  <span>Real-Time Threat & Banking Intelligence</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearChat}
                className="p-1.5 rounded-lg text-[#94A3B8] hover:text-rose-400 hover:bg-blue-950/50 transition cursor-pointer"
                title="Clear conversation"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#00D9FF] hover:bg-blue-950/50 transition cursor-pointer hidden sm:flex"
                title={isExpanded ? 'Compact size' : 'Expand window'}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => {
                  cyberSound.playClick();
                  setIsOpen(false);
                }}
                className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-blue-950/50 transition cursor-pointer"
                title="Minimize chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* STATUS TELEMETRY BAR */}
          <div className="px-3.5 py-1.5 bg-[#07111F]/90 border-b border-blue-950/80 flex items-center justify-between text-[10px] font-mono text-[#94A3B8] shrink-0">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3 h-3 text-[#00D9FF]" />
              CONTEXT:{' '}
              <strong className="text-[#36C8FF]">
                {currentUser ? `VERIFIED SESSION (${currentUser.role})` : 'GUEST SESSION [CREDENTIALS MASKED]'}
              </strong>
            </span>
            {currentUser && onNavigateTab && (
              <button
                onClick={() => onNavigateTab('submit')}
                className="text-[#00D9FF] hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>Test Rules</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* MESSAGE STREAM */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#081221]/70">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${
                  msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    msg.role === 'user'
                      ? 'bg-[#1677FF] text-white shadow-[0_0_10px_rgba(22,119,255,0.4)]'
                      : msg.isError
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      : 'bg-[#07111F] text-[#00D9FF] border border-cyan-500/40'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <UserIcon className="w-3.5 h-3.5" />
                  ) : msg.isError ? (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  ) : (
                    <Bot className="w-3.5 h-3.5" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-[#1677FF] to-[#1D82FF] text-white rounded-tr-xs shadow-[0_0_15px_rgba(22,119,255,0.25)]'
                      : msg.isError
                      ? 'bg-rose-950/40 text-rose-200 border border-rose-500/40 rounded-tl-xs'
                      : 'bg-[#0D1B2E] text-[#CBD5E1] border border-blue-800/50 rounded-tl-xs shadow-sm'
                  }`}
                >
                  <div className="space-y-1">{formatMessageText(msg.text)}</div>
                  <div
                    className={`text-[9px] font-mono mt-1.5 text-right ${
                      msg.role === 'user' ? 'text-blue-200' : 'text-[#64748B]'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#07111F] text-[#00D9FF] border border-cyan-500/40 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 animate-pulse" />
                </div>
                <div className="bg-[#0D1B2E] border border-blue-800/50 rounded-2xl rounded-tl-xs px-3.5 py-2.5 text-xs text-[#94A3B8] font-mono flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-[#00D9FF] animate-spin" />
                  <span>Analyzing SOC telemetry...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* QUICK SUGGESTION CHIPS */}
          <div className="px-3 py-2 bg-[#07111F]/90 border-t border-blue-900/40 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                disabled={isLoading}
                onClick={() => sendMessage(prompt)}
                className="px-2.5 py-1 rounded-lg bg-[#0D1828] hover:bg-[#1677FF]/20 text-[#CBD5E1] hover:text-[#00D9FF] border border-blue-900/60 hover:border-cyan-500/50 text-[10px] font-mono whitespace-nowrap transition cursor-pointer shrink-0 active:scale-95 disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* INPUT FORM */}
          <form
            onSubmit={e => {
              e.preventDefault();
              sendMessage();
            }}
            className="p-3 bg-[#07111F] border-t border-blue-900/60 flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about transactions, fraud rules, QR pay..."
              disabled={isLoading}
              className="flex-1 bg-[#0D1828] border border-blue-900/60 rounded-xl px-3.5 py-2 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#00D9FF] transition font-sans"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2.5 rounded-xl bg-gradient-to-r from-[#1677FF] to-[#00D9FF] text-white shadow-[0_0_15px_rgba(0,217,255,0.3)] hover:opacity-95 disabled:opacity-40 transition cursor-pointer active:scale-95 shrink-0"
              aria-label="Send message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* FLOATING ACTION BUTTON */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            cyberSound.playClick();
            setIsOpen(!isOpen);
          }}
          className={`group relative flex items-center gap-2.5 px-4 py-3 rounded-2xl font-mono text-xs font-bold text-white transition-all duration-300 cursor-pointer active:scale-95 ${
            isOpen
              ? 'bg-[#0D1828] border border-cyan-400/50 shadow-[0_0_20px_rgba(0,217,255,0.25)]'
              : 'bg-gradient-to-r from-[#1677FF] via-[#1D82FF] to-[#00D9FF] shadow-[0_0_25px_rgba(0,217,255,0.45)] hover:shadow-[0_0_35px_rgba(0,217,255,0.7)] border border-cyan-300/40'
          }`}
          aria-label="Toggle FraudGuard AI Chatbot"
        >
          {isOpen ? (
            <>
              <X className="w-4 h-4 text-[#00D9FF]" />
              <span className="text-[#CBD5E1]">CLOSE COPILOT</span>
            </>
          ) : (
            <>
              <div className="relative flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-white" />
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <span>SOC AI CHATBOT</span>
              {unreadCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 bg-rose-500 text-white text-[10px] font-black rounded-full shadow">
                  {unreadCount}
                </span>
              )}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
