import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Bot, 
  User as UserIcon, 
  WifiOff, 
  ShieldAlert, 
  RefreshCw, 
  FileQuestion, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  Lock 
} from 'lucide-react';
import { TransactionData } from '../types/fraud';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  quickActions?: { label: string; action: string }[];
  ticketId?: string;
  transactionMatch?: {
    id: string;
    amount: number;
    status: string;
  };
}

interface TransactionChatbotProps {
  transactions: TransactionData[];
  onReviewTransaction?: (txId: string) => void;
}

export const TransactionChatbot: React.FC<TransactionChatbotProps> = ({
  transactions,
  onReviewTransaction
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [input, setInput] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const initialMessages: ChatMessage[] = [
    {
      id: 'msg-1',
      sender: 'bot',
      text: "Hello! I am NeuralBot 🧠, your AI Transaction & Resolution Assistant. How can I assist you with your transactions today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      quickActions: [
        { label: '🌐 Network Timeout / Pending Debit', action: 'network_issue' },
        { label: '🔄 Sent to Wrong Recipient / Amount', action: 'wrong_transaction' },
        { label: '🚨 Dispute Suspicious / Flagged Charge', action: 'dispute_fraud' },
        { label: '🔍 Check Status by Transaction ID', action: 'check_status' }
      ]
    }
  ];

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('neuralbank_chat_history');
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return initialMessages;
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem('neuralbank_chat_history', JSON.stringify(messages));
    } catch {
      // Ignore
    }
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsTyping(true);

    // Simulate resolution response
    setTimeout(() => {
      const botResponse = generateResolution(query);
      setMessages((prev) => [...prev, botResponse]);
      setIsTyping(false);
      if (!isOpen) {
        setUnreadCount((c) => c + 1);
      }
    }, 450);
  };

  const generateResolution = (query: string): ChatMessage => {
    const q = query.toLowerCase();
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Transaction ID match (e.g. TX-99401, TX-88219)
    const matchTx = query.match(/TX-\d+/i);
    if (matchTx) {
      const txId = matchTx[0].toUpperCase();
      const found = transactions.find((t) => t.transactionId.toUpperCase() === txId);
      if (found) {
        const isSuspicious = found.amount > (found.userHistoricalAvg * 3) || found.location.toUpperCase().includes('PROXY');
        return {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: `Found Transaction record for **${found.transactionId}**:\n• Amount: ₹${found.amount.toFixed(2)}\n• Timestamp: ${found.timestamp.substring(0, 16)}\n• Location: ${found.location}\n• Status: ${isSuspicious ? '⚠️ SUSPICIOUS / HIGH RISK' : '✅ NORMAL / APPROVED'}\n\nWould you like to dispute this or file a reversal?`,
          timestamp: time,
          transactionMatch: {
            id: found.transactionId,
            amount: found.amount,
            status: isSuspicious ? 'SUSPICIOUS' : 'NORMAL'
          },
          quickActions: isSuspicious ? [
            { label: '🔒 Emergency Freeze Card', action: 'freeze_card' },
            { label: '📝 File Formal Fraud Dispute', action: 'file_dispute' }
          ] : [
            { label: '📄 Download Receipt', action: 'receipt' },
            { label: '🔄 Request Accidental Reversal', action: 'wrong_transaction' }
          ]
        };
      }
    }

    // 2. Network issue / timeout / dropped payment
    if (q.includes('network') || q.includes('timeout') || q.includes('debited') || q.includes('deducted') || q.includes('pending') || q.includes('not received') || q.includes('failed')) {
      const ticket = `NET-${Math.floor(100000 + Math.random() * 900000)}`;
      return {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `**Network Failure / Unconfirmed Debit Resolution:**\n\n1. **Auto-Reconciliation:** If your money was deducted during a network timeout or connection loss, our core banking switch holds the funds in escrow.\n2. **Settlement Window:** Most network drops reverse automatically within **15 to 30 minutes**.\n3. **Priority Hold Placed:** I have generated an automated reconciliation ticket **#${ticket}** linked to your account.\n\nIf the funds do not reflect within 30 minutes, this ticket guarantees an immediate manual ledger refund.`,
        timestamp: time,
        ticketId: ticket,
        quickActions: [
          { label: '🔄 Check Live Ledger Status', action: 'check_status' },
          { label: '📞 Request Priority Banker Callback', action: 'callback' }
        ]
      };
    }

    // 3. Wrong transaction / accidental transfer / incorrect recipient
    if (q.includes('wrong') || q.includes('mistake') || q.includes('accidental') || q.includes('incorrect') || q.includes('recipient') || q.includes('sent by error') || q.includes('refund')) {
      const ticket = `REV-${Math.floor(100000 + Math.random() * 900000)}`;
      return {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `**Wrong Transaction / Accidental Transfer Protocol:**\n\n• **Recall Request Initiated:** Under NeuralBank Interbank Protocol Rule 42, accidental transfers reported within 4 hours can be placed under a **Temporary Recall Hold**.\n• **Ticket Reference:** #${ticket}\n\n**Immediate Steps Taken:**\n1. Recipient bank notified with a Recall Hold Notice.\n2. In-transit settlement locked.\n\nPlease enter the **Transaction ID** (e.g., TX-88219) or recipient details so I can bind this recall directly to the transaction.`,
        timestamp: time,
        ticketId: ticket,
        quickActions: [
          { label: 'TX-88219 (₹42.50)', action: 'TX-88219' },
          { label: 'TX-99401 (₹4,950.00)', action: 'TX-99401' }
        ]
      };
    }

    // 4. Dispute fraud / unauthorized transaction
    if (q.includes('dispute') || q.includes('fraud') || q.includes('unauthorized') || q.includes('hacked') || q.includes('stolen') || q.includes('high risk') || q.includes('suspicious')) {
      const ticket = `DIS-${Math.floor(100000 + Math.random() * 900000)}`;
      return {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `**Fraudulent & Unauthorized Charge Dispute:**\n\n🚨 **Security Alert Triggered.**\n• We take unauthorized transactions very seriously. A dispute case has been opened under **Ticket #${ticket}**.\n• The NeuralBank AI Risk Engine has marked the transaction for immediate forensic compliance review.\n• Would you like me to immediately freeze your digital and physical payment cards to prevent further unauthorized attempts?`,
        timestamp: time,
        ticketId: ticket,
        quickActions: [
          { label: '🔒 Emergency Freeze All Cards Now', action: 'freeze_card' },
          { label: '📋 View Forensic Triggers', action: 'view_triggers' }
        ]
      };
    }

    // 5. Card freeze action
    if (q.includes('freeze') || q.includes('block') || q.includes('lock')) {
      return {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `✅ **Action Confirmed:** Your card has been temporarily **FROZEN**. No new debits, online authorizations, or ATM withdrawals will be permitted until you verify your identity via 2-Factor Authentication.\n\nYou can unfreeze it anytime from your account settings.`,
        timestamp: time,
        quickActions: [
          { label: '🔓 Request Unfreeze Code', action: 'unfreeze' },
          { label: '💬 Talk to Fraud Agent', action: 'callback' }
        ]
      };
    }

    // 6. Generic / Default helpful response
    return {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      text: `I understand you have an inquiry regarding: "${query}".\n\nI can instantly help you with:\n• **Network failures & pending debits**\n• **Recalling wrong or accidental transactions**\n• **Disputing flagged suspicious charges**\n• **Checking real-time transaction status by ID (e.g. TX-99401)**\n\nPlease select an option below or provide your Transaction ID:`,
      timestamp: time,
      quickActions: [
        { label: '🌐 Network dropped during payment', action: 'network_issue' },
        { label: '🔄 Sent money to wrong account', action: 'wrong_transaction' },
        { label: '🚨 Dispute unauthorized charge', action: 'dispute_fraud' }
      ]
    };
  };

  const handleQuickAction = (action: string) => {
    if (action === 'freeze_card') {
      handleSendMessage('Please freeze my card immediately to protect my balance.');
    } else if (action === 'network_issue') {
      handleSendMessage('I had a network issue during my transaction and the amount was debited.');
    } else if (action === 'wrong_transaction') {
      handleSendMessage('I accidentally sent money to the wrong transaction / recipient.');
    } else if (action === 'dispute_fraud') {
      handleSendMessage('I want to dispute an unauthorized suspicious transaction.');
    } else if (action === 'check_status') {
      handleSendMessage('Can you check the fraud risk score and status of my transactions?');
    } else if (action.startsWith('TX-')) {
      handleSendMessage(`Check status for transaction ${action}`);
    } else {
      handleSendMessage(action);
    }
  };

  const handleClearChat = () => {
    setMessages(initialMessages);
    try {
      localStorage.removeItem('neuralbank_chat_history');
    } catch {
      // Ignore
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setUnreadCount(0);
          }}
          className="fixed bottom-6 left-6 z-40 rounded-full bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-400 p-0.5 shadow-2xl shadow-cyan-500/20 hover:scale-105 transition-all group"
          title="Open Transaction Support Chatbot"
        >
          <div className="flex items-center gap-2 px-4 py-3 bg-[#090e1a] rounded-full">
            <div className="relative">
              <Bot className="w-5 h-5 text-cyan-400 group-hover:rotate-12 transition-transform" />
              <span className="w-2 h-2 rounded-full bg-emerald-400 absolute -top-0.5 -right-0.5 animate-pulse" />
            </div>
            <span className="text-xs font-bold text-white tracking-wide">
              NeuralBot <span className="text-[10px] text-cyan-400 font-normal">Support</span>
            </span>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white font-mono text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {unreadCount}
              </span>
            )}
          </div>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <aside
          aria-label="Transaction resolution chatbot"
          className="fixed bottom-6 left-6 z-50 w-96 max-w-[calc(100vw-3rem)] h-[520px] max-h-[85vh] rounded-2xl border border-slate-700 bg-[#0d1424] shadow-2xl shadow-black/80 flex flex-col overflow-hidden animate-slide-up"
        >
          {/* Top Bar */}
          <div className="px-4 py-3 bg-gradient-to-r from-[#0d1424] via-indigo-950/80 to-[#0d1424] border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-violet-950 border border-violet-700/80 flex items-center justify-center text-cyan-400 shadow-sm">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>NeuralBot 🧠</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </h4>
                <p className="text-[10px] text-slate-400">
                  Transaction & Dispute Resolution Assistant
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearChat}
                className="text-slate-400 hover:text-slate-200 p-1 text-[11px] rounded"
                title="Reset conversation"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
                title="Minimize chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 font-sans text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'bot' && (
                  <div className="w-6 h-6 rounded-md bg-indigo-950 border border-indigo-800 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2.5 space-y-1.5 ${
                    msg.sender === 'user'
                      ? 'bg-violet-600 text-white font-medium rounded-tr-none'
                      : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none shadow-md'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {msg.text}
                  </p>

                  {/* Ticket Card if present */}
                  {msg.ticketId && (
                    <div className="mt-2 p-2 rounded bg-violet-950/70 border border-violet-800/60 flex items-center justify-between text-[11px]">
                      <span className="text-violet-300">Reference Ticket:</span>
                      <span className="font-mono font-bold text-cyan-300">{msg.ticketId}</span>
                    </div>
                  )}

                  {/* Transaction match info */}
                  {msg.transactionMatch && (
                    <div className="mt-2 p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between text-[11px]">
                      <span className="font-mono text-slate-300">{msg.transactionMatch.id}</span>
                      <span
                        className={`font-semibold ${
                          msg.transactionMatch.status === 'SUSPICIOUS'
                            ? 'text-red-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {msg.transactionMatch.status}
                      </span>
                    </div>
                  )}

                  {/* Quick Action Chips */}
                  {msg.quickActions && (
                    <div className="pt-2 flex flex-wrap gap-1.5">
                      {msg.quickActions.map((qa, i) => (
                        <button
                          key={i}
                          onClick={() => handleQuickAction(qa.action)}
                          className="px-2 py-1 text-[10px] font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors text-left"
                        >
                          {qa.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <span className="text-[9px] text-slate-500 block text-right">
                    {msg.timestamp}
                  </span>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-6 h-6 rounded-md bg-violet-900 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <UserIcon className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2 items-center text-slate-400 text-[11px]">
                <div className="w-6 h-6 rounded-md bg-indigo-950 border border-indigo-800 text-cyan-400 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 animate-spin" />
                </div>
                <span>NeuralBot is resolving...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Problem Shortcut Bar */}
          <div className="px-3 py-1.5 bg-slate-950/60 border-t border-slate-800 flex gap-1.5 overflow-x-auto text-[10px] whitespace-nowrap text-slate-400">
            <span className="text-slate-500 self-center">Quick:</span>
            <button
              onClick={() => handleSendMessage('Network issue during transaction')}
              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300"
            >
              🌐 Network Drop
            </button>
            <button
              onClick={() => handleSendMessage('Wrong transaction transferred')}
              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300"
            >
              🔄 Wrong Account
            </button>
            <button
              onClick={() => handleSendMessage('Check status for TX-99401')}
              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono"
            >
              🔍 TX-99401
            </button>
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-2.5 bg-[#090e1a] border-t border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about network drop, wrong tx, or TX ID..."
              className="flex-1 bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="p-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-40 transition-colors"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </aside>
      )}
    </>
  );
};
