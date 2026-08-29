'use client';
import React, { useState, useEffect, useRef } from 'react';

// ==========================================
// TYPES & INTERFACES
// ==========================================
interface Message {
  role: 'user' | 'model';
  content: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
}

type PageView = 'chat' | 'axioms' | 'library' | 'about';

export default function SocraticCoreApp() {
  // Navigation & Page State
  const [activePage, setActivePage] = useState<PageView>('chat');
  const [mounted, setMounted] = useState(false);

  // Chat Sessions & Persistence State (Start empty to match SSR, populate on mount)
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('socratic_core_sessions');
      if (saved) {
        try { 
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSessions(parsed);
            setActiveId(parsed[0].id);
          }
        } catch (e) { console.error(e); }
      }
    }
  }, []);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentSession = sessions.find((s) => s.id === activeId);
  const messages = currentSession ? currentSession.messages : [];

  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      localStorage.setItem('socratic_core_sessions', JSON.stringify(sessions));
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, loading, mounted]);

  const createNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Inquiry',
      messages: [],
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveId(newSession.id);
    setActivePage('chat');
    setSidebarOpen(false);
  };

  const deleteChat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated);
    if (activeId === id) {
      setActiveId(updated.length > 0 ? updated[0].id : null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    let targetId = activeId;
    let currentSessionsSnapshot = [...sessions];

    if (!targetId) {
      targetId = Date.now().toString();
      const newSession: ChatSession = {
        id: targetId,
        title: input.slice(0, 28) + (input.length > 28 ? '...' : ''),
        messages: [],
      };
      currentSessionsSnapshot = [newSession, ...currentSessionsSnapshot];
      setActiveId(targetId);
    }

    const userMessage: Message = { role: 'user', content: input };
    
    const updatedSessions = currentSessionsSnapshot.map((session) => {
      if (session.id === targetId) {
        return {
          ...session,
          title: session.messages.length === 0 ? input.slice(0, 28) + (input.length > 28 ? '...' : '') : session.title,
          messages: [...session.messages, userMessage],
        };
      }
      return session;
    });

    setSessions(updatedSessions);
    setInput('');
    setLoading(true);

    const activeMessagesList = updatedSessions.find((s) => s.id === targetId)?.messages || [userMessage];

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: activeMessagesList }),
      });

      const data = await res.json();
      if (res.ok) {
        setSessions((prev) =>
          prev.map((session) => {
            if (session.id === targetId) {
              return {
                ...session,
                messages: [...session.messages, { role: 'model', content: data.reply }],
              };
            }
            return session;
          })
        );
      } else {
        throw new Error(data.error || 'Failed to fetch response');
      }
    } catch (error) {
      console.error(error);
      setSessions((prev) =>
        prev.map((session) => {
          if (session.id === targetId) {
            return {
              ...session,
              messages: [...session.messages, { role: 'model', content: '⚠️ Error: Failed to communicate with the Socratic Core.' }],
            };
          }
          return session;
        })
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#FDFBF7] text-[#2C2A29] font-sans antialiased overflow-hidden selection:bg-[#D97706] selection:text-white relative">
      
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/30 z-40 md:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* ================= SIDEBAR ================= */}
      <aside
        className={`fixed md:relative inset-y-0 left-0 z-50 w-72 transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden'
        } transition-all duration-300 ease-in-out bg-[#F7F4EE] border-r border-[#EBE5DA] flex flex-col shrink-0 shadow-lg md:shadow-none`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-[#EBE5DA] flex items-center justify-between bg-[#F4EFE6]">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#D97706] flex items-center justify-center text-white font-serif font-bold text-xs shadow-sm">
              Σ
            </div>
            <span className="font-semibold text-xs tracking-wider text-[#5C5552] uppercase font-serif">Socratic Core AI</span>
          </div>
          <button
            onClick={createNewChat}
            className="p-1.5 rounded-lg bg-[#D97706]/10 hover:bg-[#D97706] text-[#B45309] hover:text-white border border-[#D97706]/30 transition-all text-xs flex items-center gap-1.5 px-3 font-medium cursor-pointer"
          >
            <span>+</span> New
          </button>
        </div>

        {/* Multi-Page Navigation Links */}
        <div className="p-3 border-b border-[#EBE5DA] space-y-1 bg-[#F7F4EE]">
          <div className="text-[10px] font-bold text-[#8C827B] px-3 py-1 uppercase tracking-widest">Navigation</div>
          
          <button
            onClick={() => { setActivePage('chat'); setSidebarOpen(false); }}
            className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs transition cursor-pointer font-medium ${
              activePage === 'chat' ? 'bg-[#EFEADB] text-[#D97706]' : 'text-[#6C635E] hover:bg-[#EFEADB]/50 hover:text-[#1C1917]'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
            <span>Dialectic Workspace</span>
          </button>

          <button
            onClick={() => { setActivePage('axioms'); setSidebarOpen(false); }}
            className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs transition cursor-pointer font-medium ${
              activePage === 'axioms' ? 'bg-[#EFEADB] text-[#D97706]' : 'text-[#6C635E] hover:bg-[#EFEADB]/50 hover:text-[#1C1917]'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
            <span>First Principles Vault</span>
          </button>

          <button
            onClick={() => { setActivePage('library'); setSidebarOpen(false); }}
            className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs transition cursor-pointer font-medium ${
              activePage === 'library' ? 'bg-[#EFEADB] text-[#D97706]' : 'text-[#6C635E] hover:bg-[#EFEADB]/50 hover:text-[#1C1917]'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
            <span>Classical Library</span>
          </button>

          <button
            onClick={() => { setActivePage('about'); setSidebarOpen(false); }}
            className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs transition cursor-pointer font-medium ${
              activePage === 'about' ? 'bg-[#EFEADB] text-[#D97706]' : 'text-[#6C635E] hover:bg-[#EFEADB]/50 hover:text-[#1C1917]'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span>About the Method</span>
          </button>
        </div>

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          <div className="text-[10px] font-bold text-[#8C827B] px-3 py-1 uppercase tracking-widest">Past Inquiries</div>
          {!mounted ? (
            <div className="text-xs text-[#A89F96] px-3 py-4 italic text-center">Loading...</div>
          ) : sessions.length === 0 ? (
            <div className="text-xs text-[#A89F96] px-3 py-4 italic text-center">No dialogues saved.</div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => { setActiveId(session.id); setActivePage('chat'); setSidebarOpen(false); }}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all border ${
                  activeId === session.id && activePage === 'chat'
                    ? 'bg-[#EFEADB] border-[#D97706]/40 text-[#1C1917] font-medium shadow-2xs'
                    : 'bg-transparent border-transparent text-[#6C635E] hover:bg-[#EFEADB]/50 hover:text-[#1C1917]'
                }`}
              >
                <span className="truncate pr-2">{session.title}</span>
                <button
                  onClick={(e) => deleteChat(e, session.id)}
                  className="opacity-0 group-hover:opacity-100 text-[#A89F96] hover:text-[#DC2626] p-1 rounded transition cursor-pointer"
                  title="Delete chat"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* ================= MAIN CONTENT CONTAINER ================= */}
      <main className="flex-1 flex flex-col h-full bg-[#FDFBF7] relative overflow-hidden min-w-0">
        {/* Top Navbar */}
        <header className="h-14 border-b border-[#EBE5DA] bg-[#FDFBF7]/90 backdrop-blur-md flex items-center px-4 justify-between z-20 shrink-0">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg bg-[#F4EFE6] border border-[#EBE5DA] text-[#6C635E] hover:text-[#1C1917] transition cursor-pointer"
              title="Toggle Sidebar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#059669]"></span>
              <span className="text-xs font-semibold text-[#3C3633] tracking-tight font-serif uppercase truncate">
                {activePage === 'chat' && 'Dialectic Workspace'}
                {activePage === 'axioms' && 'First Principles Vault'}
                {activePage === 'library' && 'Classical Library'}
                {activePage === 'about' && 'About Socratic Core AI'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="hidden sm:inline-block text-[11px] text-[#7C736D] bg-[#F4EFE6] border border-[#EBE5DA] px-3 py-1 rounded-full shadow-2xs font-medium">
              Dialectic Mode Active
            </span>
          </div>
        </header>

        {/* ================= PAGE VIEW: CHAT WORKSPACE ================= */}
        {activePage === 'chat' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-6 px-4">
                  {/* Hero Image */}
                  <div className="relative w-full h-44 sm:h-48 rounded-2xl overflow-hidden shadow-md border border-[#EBE5DA] group">
                    <img 
                      src="https://images.unsplash.com/photo-1516962215378-7fa2e137ae93?auto=format&fit=crop&w=1200&q=80" 
                      alt="Philosophy & Inquiry"
                      className="w-full h-full object-cover object-center filter sepia-[0.15] brightness-95 group-hover:scale-105 transition duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1C1917]/80 via-[#1C1917]/30 to-transparent flex flex-col justify-end p-6 text-left">
                      <span className="text-amber-400 font-serif text-xs uppercase tracking-widest font-semibold">Socratic Core AI</span>
                      <h2 className="text-base sm:text-lg font-serif font-medium text-white tracking-tight">Deconstruct Reality from First Principles</h2>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-[#7C736D] leading-relaxed max-w-md mx-auto">
                      Every concept is built from absolute foundational premises with strict relational mapping. Enter a topic below to begin your dialogue.
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex flex-col w-full ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div className="text-[10px] text-[#8C827B] mb-1 px-1 font-mono uppercase tracking-wider">
                      {msg.role === 'user' ? 'You' : 'Socratic Core'}
                    </div>
                    <div
                      className={`max-w-[90%] sm:max-w-3xl rounded-2xl px-4 sm:px-5 py-3.5 sm:py-4 text-xs sm:text-sm leading-relaxed shadow-sm ${
                        msg.role === 'user'
                          ? 'bg-[#D97706] text-white rounded-br-xs font-normal'
                          : 'bg-[#F7F4EE] border border-[#EBE5DA] text-[#2C2A29] rounded-bl-xs whitespace-pre-wrap'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))
              )}

              {loading && (
                <div className="flex flex-col items-start">
                  <div className="text-[10px] text-[#8C827B] mb-1 px-1 font-mono uppercase tracking-wider">Socratic Core</div>
                  <div className="flex items-center space-x-2 text-sm text-[#7C736D] bg-[#F7F4EE] border border-[#EBE5DA] px-5 py-4 rounded-2xl rounded-bl-xs shadow-xs">
                    <div className="w-2 h-2 bg-[#D97706] rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-[#D97706] rounded-full animate-bounce [animation-delay:-.2s]"></div>
                    <div className="w-2 h-2 bg-[#D97706] rounded-full animate-bounce [animation-delay:-.4s]"></div>
                    <span className="ml-2 text-xs font-mono text-[#7C736D]">Deriving lowest-level premises...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Control Area */}
            <div className="p-3 sm:p-6 bg-[#FDFBF7] border-t border-[#EBE5DA] shrink-0">
              <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Introduce a concept, term, or physical reality to deconstruct..."
                  className="w-full bg-[#F7F4EE] border border-[#EBE5DA] focus:border-[#D97706] focus:ring-1 focus:ring-[#D97706] rounded-2xl py-3.5 sm:py-4 pl-4 sm:pl-5 pr-14 text-xs sm:text-sm text-[#2C2A29] placeholder-[#A89F96] outline-none transition shadow-2xs"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="absolute right-3 bg-[#D97706] hover:bg-[#B45309] disabled:opacity-30 text-white p-2 sm:p-2.5 rounded-xl transition shadow-xs flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </form>
              <div className="text-center mt-2">
                <span className="text-[10px] text-[#A89F96] font-mono">Sessions persist locally via browser storage</span>
              </div>
            </div>
          </div>
        )}

        {/* ================= PAGE VIEW: FIRST PRINCIPLES VAULT ================= */}
        {activePage === 'axioms' && (
          <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8 max-w-4xl mx-auto">
            <div className="space-y-2 border-b border-[#EBE5DA] pb-6">
              <span className="text-xs font-serif uppercase tracking-widest text-[#D97706] font-bold">Foundation</span>
              <h1 className="text-2xl font-serif font-medium text-[#1C1917]">The First Principles Vault</h1>
              <p className="text-sm text-[#7C736D] leading-relaxed">
                Core axioms and baseline definitions established across all dialogues. No argument proceeds without grounding in these foundational truths.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-[#F7F4EE] border border-[#EBE5DA] space-y-3 shadow-2xs">
                <div className="w-8 h-8 rounded-lg bg-[#D97706]/10 flex items-center justify-center text-[#D97706] font-serif font-bold">I</div>
                <h3 className="font-serif font-medium text-base text-[#1C1917]">Definition Precedes Deduction</h3>
                <p className="text-xs text-[#7C736D] leading-relaxed">
                  Before analyzing properties or consequences of any abstract term, its absolute constituent boundaries must be explicitly stated.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#F7F4EE] border border-[#EBE5DA] space-y-3 shadow-2xs">
                <div className="w-8 h-8 rounded-lg bg-[#D97706]/10 flex items-center justify-center text-[#D97706] font-serif font-bold">II</div>
                <h3 className="font-serif font-medium text-base text-[#1C1917]">Material Reality Anchor</h3>
                <p className="text-xs text-[#7C736D] leading-relaxed">
                  Every philosophical or technical construct must ultimately map down to observable physical mechanisms or verifiable logical primitives.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#F7F4EE] border border-[#EBE5DA] space-y-3 shadow-2xs">
                <div className="w-8 h-8 rounded-lg bg-[#D97706]/10 flex items-center justify-center text-[#D97706] font-serif font-bold">III</div>
                <h3 className="font-serif font-medium text-base text-[#1C1917]">Rejection of Circularity</h3>
                <p className="text-xs text-[#7C736D] leading-relaxed">
                  Tautologies and self-referential explanations are systematically dismantled in favor of external, independent verification.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#F7F4EE] border border-[#EBE5DA] space-y-3 shadow-2xs">
                <div className="w-8 h-8 rounded-lg bg-[#D97706]/10 flex items-center justify-center text-[#D97706] font-serif font-bold">IV</div>
                <h3 className="font-serif font-medium text-base text-[#1C1917]">Relational Mapping</h3>
                <p className="text-xs text-[#7C736D] leading-relaxed">
                  Concepts do not exist in isolation; understanding emerges entirely from mapping how one variable impacts another under transformation.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ================= PAGE VIEW: CLASSICAL LIBRARY ================= */}
        {activePage === 'library' && (
          <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8 max-w-4xl mx-auto">
            <div className="space-y-2 border-b border-[#EBE5DA] pb-6">
              <span className="text-xs font-serif uppercase tracking-widest text-[#D97706] font-bold">Reference</span>
              <h1 className="text-2xl font-serif font-medium text-[#1C1917]">Classical Library & Texts</h1>
              <p className="text-sm text-[#7C736D] leading-relaxed">
                Curated excerpts, works on moral responsibility, willpower, and dialectic method explored by the Socratic Core.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-[#F7F4EE] border border-[#EBE5DA] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-[#D97706] uppercase tracking-wider">Fyodor Dostoevsky</span>
                  <h3 className="font-serif font-medium text-base text-[#1C1917]">Crime and Punishment</h3>
                  <p className="text-xs text-[#7C736D]">Examination of moral accountability, psychological burden, and individual redemption.</p>
                </div>
                <button onClick={() => { setActivePage('chat'); setInput("Analyze the theme of moral responsibility in Crime and Punishment from first principles."); }} className="px-4 py-2 bg-[#D97706] hover:bg-[#B45309] text-white rounded-xl text-xs transition cursor-pointer shrink-0">
                  Deconstruct Text
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-[#F7F4EE] border border-[#EBE5DA] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-[#D97706] uppercase tracking-wider">Victor Hugo</span>
                  <h3 className="font-serif font-medium text-base text-[#1C1917]">Les Misérables</h3>
                  <p className="text-xs text-[#7C736D]">Exploration of societal justice, human dignity, and the mechanics of grace and law.</p>
                </div>
                <button onClick={() => { setActivePage('chat'); setInput("Examine the conflict between institutional law and moral duty in Les Misérables."); }} className="px-4 py-2 bg-[#D97706] hover:bg-[#B45309] text-white rounded-xl text-xs transition cursor-pointer shrink-0">
                  Deconstruct Text
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-[#F7F4EE] border border-[#EBE5DA] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-[#D97706] uppercase tracking-wider">Plato</span>
                  <h3 className="font-serif font-medium text-base text-[#1C1917]">The Socratic Dialogues</h3>
                  <p className="text-xs text-[#7C736D]">The foundational method of questioning assumptions to expose contradictions and attain clarity.</p>
                </div>
                <button onClick={() => { setActivePage('chat'); setInput("Apply the Socratic elenchus method to examine the definition of justice."); }} className="px-4 py-2 bg-[#D97706] hover:bg-[#B45309] text-white rounded-xl text-xs transition cursor-pointer shrink-0">
                  Deconstruct Text
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= PAGE VIEW: ABOUT ================= */}
        {activePage === 'about' && (
          <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8 max-w-3xl mx-auto">
            <div className="space-y-2 border-b border-[#EBE5DA] pb-6">
              <span className="text-xs font-serif uppercase tracking-widest text-[#D97706] font-bold">Architecture</span>
              <h1 className="text-2xl font-serif font-medium text-[#1C1917]">About Socratic Core AI</h1>
              <p className="text-sm text-[#7C736D] leading-relaxed">
                An unyielding dialectic engine designed to strip away superficial complexity and examine reality at its foundational roots.
              </p>
            </div>

            <div className="space-y-6 text-sm text-[#5C5552] leading-relaxed">
              <p>
                Socratic Core AI breaks away from conventional conversational interfaces by prioritizing rigorous first-principles deduction over mere pattern matching or stylistic fluff. Every dialogue session is preserved locally in your browser to maintain an uninterrupted continuum of intellectual inquiry.
              </p>
              <div className="p-6 rounded-2xl bg-[#F7F4EE] border border-[#EBE5DA] space-y-3">
                <h3 className="font-serif font-medium text-base text-[#1C1917]">Core Engineering Principles</h3>
                <ul className="list-disc pl-5 space-y-2 text-xs text-[#7C736D]">
                  <li><strong className="text-[#2C2A29]">Local Persistence:</strong> All chat histories and active dialogues stay securely in your local environment.</li>
                  <li><strong className="text-[#2C2A29]">Warm Aesthetic Palette:</strong> Crafted with natural linen, warm paper tones, and refined typography.</li>
                  <li><strong className="text-[#2C2A29]">Multi-Page Modular Structure:</strong> Seamlessly switch between the dialectic chat workspace, foundational axioms, and classical literature references.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}