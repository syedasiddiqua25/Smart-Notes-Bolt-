import { motion } from 'framer-motion';
import {
  ScanText,
  FileEdit,
  Palette,
  Sparkles,
  FileDown,
  Shield,
  Search,
  Clock,
  Type,
  List,
  Hash,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: 'easeOut' as const },
  }),
};

const mainFeatures = [
  {
    icon: ScanText,
    title: 'OCR Conversion',
    desc: 'Upload handwritten or printed images and extract text with remarkable accuracy. Supports drag & drop, paste, and file picker uploads.',
    details: ['Handwritten text recognition', 'Printed text extraction', 'Confidence percentage display', 'Line break preservation', 'Automatic editor population'],
  },
  {
    icon: FileEdit,
    title: 'Smart Editor',
    desc: 'A full-featured rich text editor with professional formatting tools, inspired by Google Docs and Notion.',
    details: ['Bold, italic, underline, strikethrough', 'Font family & size selection', 'Text & highlight color pickers', 'Alignment & list formatting', 'Undo, redo, clear formatting'],
  },
  {
    icon: Palette,
    title: 'Notebook Themes',
    desc: 'Choose from 6 beautiful notebook styles that change the look and feel of your writing experience.',
    details: ['Clean White', 'Dark Mode', 'Ruled Notebook', 'Spiral Notebook', 'Grid Notebook', 'Dotted Notebook'],
  },
  {
    icon: Sparkles,
    title: 'AI Summary',
    desc: 'Generate intelligent summaries of your notes with short, medium, and key points extraction.',
    details: ['Short summary', 'Medium summary', 'Key points extraction', 'Keyword-based scoring', 'One-click regeneration'],
  },
  {
    icon: FileDown,
    title: 'Export System',
    desc: 'Export your notes in multiple formats with or without notebook styling applied.',
    details: ['PDF export with styles', 'DOCX export', 'TXT export', 'Plain text option', 'Styled notebook option'],
  },
];

const smartFeatures = [
  { icon: Hash, title: 'Word Count', desc: 'Real-time word and character counting' },
  { icon: Clock, title: 'Reading Time', desc: 'Estimated reading time calculation' },
  { icon: Shield, title: 'Auto-Save', desc: 'Automatic saving every 10 seconds' },
  { icon: Search, title: 'Search & Replace', desc: 'Find and replace text within notes' },
  { icon: Type, title: 'Rich Formatting', desc: 'Full toolbar with formatting options' },
  { icon: List, title: 'Note Management', desc: 'Create, rename, duplicate, delete notes' },
];

export default function Features() {
  return (
    <div className="pt-24 pb-12 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            Powerful Features
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Everything you need to transform, create, and manage your digital notes.
          </p>
        </motion.div>

        {/* Main Features */}
        <div className="space-y-20">
          {mainFeatures.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
              className={`flex flex-col lg:flex-row items-center gap-12 ${
                i % 2 === 1 ? 'lg:flex-row-reverse' : ''
              }`}
            >
              <motion.div variants={fadeUp} custom={0} className="flex-1 max-w-lg">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20">
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">{feature.title}</h2>
                <p className="text-slate-600 leading-relaxed mb-6">{feature.desc}</p>
                <ul className="space-y-2">
                  {feature.details.map(d => (
                    <li key={d} className="flex items-center gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      {d}
                    </li>
                  ))}
                </ul>
              </motion.div>

              <motion.div variants={fadeUp} custom={1} className="flex-1 max-w-lg">
                <div className="p-8 rounded-2xl bg-gradient-to-br from-indigo-50 to-cyan-50 border border-indigo-100">
                  <div className="w-full h-48 rounded-xl bg-white/80 border border-slate-200 flex items-center justify-center">
                    <feature.icon className="w-16 h-16 text-indigo-300" />
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* Smart Features Grid */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="mt-24"
        >
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
            Smart Features
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {smartFeatures.map((f, i) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                custom={i}
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
                className="p-6 rounded-2xl bg-white border border-slate-200/60 shadow-sm hover:shadow-md transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">{f.title}</h3>
                <p className="text-sm text-slate-600">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-24 text-center p-12 rounded-3xl bg-gradient-to-br from-indigo-600 to-cyan-600 relative overflow-hidden"
        >
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
            <div className="absolute bottom-1/4 right-1/4 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
          </div>
          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Try?</h2>
            <p className="text-indigo-100 mb-8 max-w-md mx-auto">
              Start using all these features for free today.
            </p>
            <Link
              to="/editor"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-semibold text-indigo-700 bg-white hover:bg-indigo-50 shadow-xl transition-all"
            >
              <BookOpen className="w-5 h-5" />
              Open Editor
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
