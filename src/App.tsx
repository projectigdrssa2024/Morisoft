/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  FileText, 
  Search, 
  Trash2, 
  LayoutList, 
  Sparkles, 
  Loader2,
  ChevronRight,
  Database,
  ArrowRight,
  Copy,
  Check,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';

// --- Types ---

interface Source {
  id: string;
  name: string;
  content: string;
  type: 'text' | 'file';
}

interface Result {
  id: string;
  query: string;
  answer: string;
  sourceRefs: string[];
  timestamp: number;
}

// --- Components ---

const Button = ({ 
  children, 
  variant = 'primary', 
  className, 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) => {
  const base = "px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-neutral-900 text-white hover:bg-neutral-800 border border-neutral-700 shadow-sm",
    secondary: "bg-white text-neutral-900 hover:bg-neutral-50 border border-neutral-200 shadow-sm",
    ghost: "bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200",
  };
  
  return (
    <button className={cn(base, variants[variant], className)} {...props}>
      {children}
    </button>
  );
};

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm", className)}>
    {children}
  </div>
);

// --- Main App ---

export default function App() {
  const [sources, setSources] = useState<Source[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAddSource, setShowAddSource] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceContent, setNewSourceContent] = useState('');
  
  const aiRef = useRef<GoogleGenAI | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (process.env.GEMINI_API_KEY) {
      aiRef.current = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddSource = () => {
    if (!newSourceName || !newSourceContent) return;
    
    const newSource: Source = {
      id: crypto.randomUUID(),
      name: newSourceName,
      content: newSourceContent,
      type: 'text'
    };
    
    setSources([...sources, newSource]);
    setNewSourceName('');
    setNewSourceContent('');
    setShowAddSource(false);
  };

  const removeSource = (id: string) => {
    setSources(sources.filter(s => s.id !== id));
  };

  const processQuery = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query || sources.length === 0 || !aiRef.current) return;

    setIsProcessing(true);
    try {
      const context = sources.map(s => `[Source: ${s.name}]\n${s.content}`).join('\n\n---\n\n');
      
      const response = await aiRef.current.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `CONTEXT:\n${context}\n\nQUERY: ${query}`,
        config: {
          systemInstruction: `You are a high-fidelity information extraction engine. 
          Analyze the provided sources and the user query.
          Extract the most relevant information and present it as a concise list of short, punchy sentences or bullet points. 
          Be extremely brief. Avoid conversational filler.
          Always reference which source the information came from using [Source Name].
          If the answer is not in the sources, say so clearly in one short sentence.`,
        }
      });

      const answer = response.text || "No response generated.";
      
      const newResult: Result = {
        id: crypto.randomUUID(),
        query,
        answer,
        sourceRefs: sources.filter(s => answer.includes(s.name)).map(s => s.name),
        timestamp: Date.now()
      };

      setResults([newResult, ...results]);
      setQuery('');
    } catch (error) {
      console.error("AI Error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-neutral-900 font-sans flex flex-col md:flex-row overflow-hidden">
      
      {/* Sidebar: Sources */}
      <aside className="w-full md:w-80 bg-white border-r border-neutral-200 flex flex-col shrink-0">
        <div className="p-6 border-bottom border-neutral-100">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-neutral-900 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-lg tracking-tight">Source Insight</h1>
          </div>
          
          <Button 
            variant="secondary" 
            className="w-full justify-start py-3"
            onClick={() => setShowAddSource(true)}
          >
            <Plus className="w-4 h-4" /> Add Source
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest px-2 mb-3">
            Loaded Sources ({sources.length})
          </p>
          
          {sources.length === 0 && (
            <div className="px-2 py-8 text-center bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
              <FileText className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
              <p className="text-xs text-neutral-500">No sources added yet</p>
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {sources.map((source) => (
              <motion.div
                key={source.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group relative flex items-center gap-3 p-3 bg-white hover:bg-neutral-50 border border-neutral-100 rounded-xl transition-colors"
              >
                <div className="p-2 bg-neutral-100 rounded-lg group-hover:bg-white transition-colors">
                  <FileText className="w-4 h-4 text-neutral-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{source.name}</p>
                  <p className="text-[10px] text-neutral-400 uppercase tracking-tighter">
                    {source.content.length} characters
                  </p>
                </div>
                <button 
                  onClick={() => removeSource(source.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="p-4 border-t border-neutral-100 bg-neutral-50 text-[10px] text-neutral-500 leading-relaxed">
          <p>This explorer uses Gemini to synthesize intelligence from your provided sources.</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Top Header */}
        <header className="h-16 px-8 flex items-center justify-between border-b border-neutral-200 bg-white/80 backdrop-blur-sm z-10 shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-1.5 bg-neutral-100 rounded text-neutral-500">
               <ChevronRight className="w-4 h-4" />
            </span>
            <span className="text-sm font-medium text-neutral-600">Notebook View</span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              aiRef.current ? "bg-green-500" : "bg-red-500"
            )} />
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
              {aiRef.current ? 'Engine Ready' : 'API Key Missing'}
            </span>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-12 pb-32">
          
          {/* Query Section */}
          <section className="max-w-4xl mx-auto space-y-6">
            <div className="space-y-1 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-neutral-900">What do you want to find?</h2>
              <p className="text-neutral-500">Ask questions across all your loaded sources simultaneously.</p>
            </div>

            <form onSubmit={processQuery} className="relative group">
              <input 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={sources.length > 0 ? "Ask a question about your sources..." : "Add sources first to start querying"}
                disabled={sources.length === 0 || isProcessing}
                className={cn(
                  "w-full h-16 pl-14 pr-32 bg-white border-2 border-neutral-200 rounded-2xl text-lg focus:outline-none focus:border-neutral-900 focus:shadow-xl transition-all disabled:bg-neutral-50 disabled:border-neutral-100 disabled:opacity-60",
                  query && "border-neutral-900 shadow-lg"
                )}
              />
              <div className="absolute left-5 top-1/2 -translate-y-1/2">
                {isProcessing ? (
                  <Loader2 className="w-6 h-6 text-neutral-400 animate-spin" />
                ) : (
                  <Search className="w-6 h-6 text-neutral-400 group-focus-within:text-neutral-900 transition-colors" />
                )}
              </div>
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Button 
                  type="submit"
                  disabled={!query || isProcessing || sources.length === 0}
                  className="bg-neutral-900 text-white rounded-xl h-10 px-6"
                >
                  {isProcessing ? 'Processing...' : 'Run Query'}
                </Button>
              </div>
            </form>
          </section>

          {/* Results Datatable View (Single Column) */}
          <section className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
              <div className="flex items-center gap-2">
                <LayoutList className="w-5 h-5 text-neutral-400" />
                <h3 className="font-bold text-lg">Results Datatable</h3>
              </div>
              <p className="text-xs text-neutral-400 font-medium italic">
                {results.length} row{results.length !== 1 ? 's' : ''} extracted
              </p>
            </div>

            {results.length === 0 ? (
              <div className="py-20 text-center border-2 border-dashed border-neutral-200 rounded-3xl bg-neutral-50/50">
                <Sparkles className="w-12 h-12 text-neutral-200 mx-auto mb-4" />
                <p className="text-neutral-400 font-medium italic">Your extracted insights will appear here as a structured datatable.</p>
              </div>
            ) : (
              <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-100">
                      <th className="px-6 py-3 text-[10px] uppercase tracking-widest font-bold text-neutral-500">
                        Insights & Findings (Single Column View)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    <AnimatePresence mode="popLayout">
                      {results.map((result) => (
                        <motion.tr 
                          key={result.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="hover:bg-neutral-50/50 transition-colors group"
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-start justify-between gap-6">
                              <div className="space-y-3 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="px-1.5 py-0.5 bg-neutral-900 text-white text-[9px] font-bold rounded">QUERY</span>
                                  <span className="text-xs font-semibold text-neutral-500 uppercase tracking-tight">{result.query}</span>
                                </div>
                                <div className="prose prose-sm prose-neutral max-w-none prose-p:leading-tight prose-p:text-neutral-700 prose-p:m-0 prose-ul:m-0 prose-li:m-0 prose-li:text-neutral-700">
                                  <ReactMarkdown>{result.answer}</ReactMarkdown>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="flex gap-1">
                                    {result.sourceRefs.map(ref => (
                                      <span key={ref} className="text-[10px] text-neutral-400 font-medium border border-neutral-200 px-1.5 rounded bg-white">
                                        @{ref}
                                      </span>
                                    ))}
                                  </div>
                                  <span className="text-[10px] text-neutral-300 font-mono">
                                    {new Date(result.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                              
                              <button 
                                onClick={() => handleCopy(result.answer, result.id)}
                                className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-400 hover:text-neutral-900 transition-all opacity-0 group-hover:opacity-100 flex flex-col items-center gap-1 shrink-0"
                                title="Copy Findings"
                              >
                                {copiedId === result.id ? (
                                  <Check className="w-4 h-4 text-green-500" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                                <span className="text-[8px] font-bold uppercase tracking-tighter">Copy</span>
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Floating Input Area for active conversations - optional */}
      </main>

      {/* Add Source Modal */}
      <AnimatePresence>
        {showAddSource && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddSource(false)}
              className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-6">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight">Add New Source</h3>
                  <p className="text-sm text-neutral-500 mt-1">Paste text content to analyze with Gemini.</p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider ml-1">Source Name</label>
                    <input 
                      autoFocus
                      placeholder="e.g. Quarterly Report, Product Spec..."
                      value={newSourceName}
                      onChange={(e) => setNewSourceName(e.target.value)}
                      className="w-full h-12 px-4 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900 transition-colors"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider ml-1">Content</label>
                    <textarea 
                      placeholder="Paste your source text here..."
                      value={newSourceContent}
                      onChange={(e) => setNewSourceContent(e.target.value)}
                      rows={8}
                      className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900 transition-colors resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="ghost" onClick={() => setShowAddSource(false)} className="flex-1 border border-neutral-100">
                    Cancel
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={handleAddSource} 
                    className="flex-1 h-12 bg-neutral-900 text-white"
                    disabled={!newSourceName || !newSourceContent}
                  >
                    Load Document <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
