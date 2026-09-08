import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ScanText,
  FileEdit,
  Palette,
  Sparkles,
  FileDown,
  ArrowRight,
  Upload,
  Zap,
  Shield,
  Clock,
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' as const },
  }),
};

const features = [
  { icon: ScanText, title: 'OCR Conversion', desc: 'Transform handwritten and printed images into editable text with industry-leading accuracy.' },
  { icon: FileEdit, title: 'Smart Editor', desc: 'A full-featured rich text editor with formatting, lists, alignment, and more.' },
  { icon: Palette, title: 'Notebook Themes', desc: 'Choose from 5 beautiful notebook styles including ruled, grid, spiral, and dark mode.' },
  { icon: Sparkles, title: 'AI Summary', desc: 'Generate intelligent summaries and key points from your notes automatically.' },
  { icon: FileDown, title: 'Export Anywhere', desc: 'Export your notes as PDF, DOCX, or TXT with or without notebook styling.' },
];

const stats = [
  { value: '99%', label: 'OCR Accuracy' },
  { value: '6', label: 'Notebook Themes' },
  { value: '3', label: 'Export Formats' },
  { value: '<3s', label: 'Processing Time' },
];

const howItWorks = [
  { icon: Upload, step: '1', title: 'Upload Image', desc: 'Upload a photo of your handwritten or printed notes via drag & drop, paste, or file picker.' },
  { icon: ScanText, step: '2', title: 'OCR Processing', desc: 'Our AI engine extracts text from your image, preserving structure and line breaks.' },
  { icon: FileEdit, step: '3', title: 'Edit & Organize', desc: 'Edit the extracted text in our smart editor, apply themes, and organize your notes.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
        {/* Background decorations */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-medium mb-8"
            >
              <Sparkles className="w-4 h-4" />
              AI-Powered Note Taking
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1]"
            >
              Smart{' '}
              <span className="bg-gradient-to-r from-indigo-600 via-cyan-600 to-indigo-600 bg-clip-text text-transparent">
                Notes
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-6 text-xl sm:text-2xl text-slate-600 leading-relaxed max-w-2xl mx-auto"
            >
              Transform Handwritten Notes Into Editable Digital Documents
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                to="/editor"
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-semibold text-white bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all"
              >
                Get Started
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/editor"
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-semibold text-slate-700 bg-white border-2 border-slate-200 hover:border-indigo-300 hover:text-indigo-600 shadow-lg transition-all"
              >
                <Upload className="w-5 h-5" />
                Upload Note
              </Link>
            </motion.div>
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="text-center p-6 rounded-2xl bg-white/60 backdrop-blur-sm border border-slate-200/60">
                <div className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="mt-1 text-sm text-slate-500">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="py-20 sm:py-28 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl sm:text-4xl font-bold text-slate-900">
              Everything You Need
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
              Powerful features designed to make your note-taking experience seamless and productive.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                custom={i}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="group p-8 rounded-2xl bg-white border border-slate-200/60 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center mb-5 shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/30 transition-shadow">
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl sm:text-4xl font-bold text-slate-900">
              How It Works
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
              Three simple steps to digitize your notes.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {howItWorks.map((step, i) => (
              <motion.div
                key={step.step}
                variants={fadeUp}
                custom={i}
                className="relative text-center p-8"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/25">
                  <step.icon className="w-8 h-8 text-white" />
                </div>
                <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold">
                  {step.step}
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">{step.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-28 bg-gradient-to-br from-indigo-600 via-indigo-700 to-cyan-700 relative overflow-hidden">
        <div className="absolute inset-0 -z-0">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
              Ready to Transform Your Notes?
            </h2>
            <p className="text-lg text-indigo-100 mb-10 max-w-2xl mx-auto">
              Start using Smart Notes for free and experience the future of digital note-taking.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/editor"
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-semibold text-indigo-700 bg-white hover:bg-indigo-50 shadow-xl transition-all"
              >
                Start for Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust indicators */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Zap, title: 'Lightning Fast', desc: 'OCR processing in under 3 seconds for most documents' },
              { icon: Shield, title: 'Secure & Private', desc: 'Your notes stay on your device with local storage' },
              { icon: Clock, title: 'Auto-Save', desc: 'Never lose your work with automatic saving every 10 seconds' },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-4 p-6 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">{item.title}</h4>
                  <p className="text-sm text-slate-600 mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
