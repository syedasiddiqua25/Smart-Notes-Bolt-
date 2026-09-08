import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, ChevronDown, ChevronUp, Loader2, ListChecks, FileText, AlignLeft } from 'lucide-react';
import { generateSummary } from '../../utils/summary';
import { SummaryResult } from '../../types';

interface SummaryPanelProps {
  content: string;
  open: boolean;
  onClose: () => void;
}

export default function SummaryPanel({ content, open, onClose }: SummaryPanelProps) {
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['short']));

  const toggleSection = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleGenerate = async () => {
    if (!content.trim()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const result = generateSummary(content);
    setSummary(result);
    setLoading(false);
  };

  const sections = [
    { key: 'short', icon: AlignLeft, label: 'Short Summary', content: summary?.short },
    { key: 'medium', icon: FileText, label: 'Medium Summary', content: summary?.medium },
    { key: 'keyPoints', icon: ListChecks, label: 'Key Points', content: null },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ duration: 0.25 }}
          className="fixed top-16 right-0 bottom-0 w-full sm:w-96 bg-white border-l border-slate-200 shadow-2xl z-30 flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-slate-900">AI Summary</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {!summary && !loading && (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-indigo-600" />
                </div>
                <h4 className="font-semibold text-slate-900 mb-2">Generate Summary</h4>
                <p className="text-slate-500 text-sm mb-6">
                  Get an intelligent summary of your note content
                </p>
                <button
                  onClick={handleGenerate}
                  disabled={!content.trim()}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate Summary
                </button>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
                <p className="text-sm text-slate-600 font-medium">Analyzing your note...</p>
                <p className="text-xs text-slate-400 mt-1">Extracting key themes and points</p>
              </div>
            )}

            {summary && !loading && (
              <div className="space-y-3">
                <button
                  onClick={handleGenerate}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  Regenerate
                </button>

                {sections.map(section => {
                  const Icon = section.icon;
                  const isOpen = expanded.has(section.key);
                  return (
                    <div key={section.key} className="rounded-xl border border-slate-200 overflow-hidden">
                      <button
                        onClick={() => toggleSection(section.key)}
                        className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-indigo-500" />
                          <span className="text-sm font-medium text-slate-900">{section.label}</span>
                        </div>
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            {section.key === 'keyPoints' ? (
                              <ul className="px-3 pb-3 space-y-2">
                                {summary.keyPoints.length > 0 ? (
                                  summary.keyPoints.map((point, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0 text-xs font-medium mt-0.5">
                                        {i + 1}
                                      </span>
                                      <span className="leading-relaxed">{point}</span>
                                    </li>
                                  ))
                                ) : (
                                  <li className="text-sm text-slate-500 px-1 pb-1">Not enough content for key points.</li>
                                )}
                              </ul>
                            ) : (
                              <p className="px-3 pb-3 text-sm text-slate-600 leading-relaxed">
                                {section.content || 'Not enough content to generate a summary.'}
                              </p>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
