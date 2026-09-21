import { motion } from 'framer-motion';
import { BookOpen, Code as Code2, GraduationCap, Heart, Users, Target, Lightbulb, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' as const },
  }),
};

const values = [
  { icon: Target, title: 'Precision', desc: 'We strive for accuracy in every OCR extraction, ensuring your handwritten words are captured faithfully.' },
  { icon: Lightbulb, title: 'Innovation', desc: 'Combining cutting-edge AI with intuitive design to reimagine how people interact with their notes.' },
  { icon: Users, title: 'Accessibility', desc: 'Making digital note-taking accessible to everyone, from students to professionals.' },
];

const techStack = [
  { category: 'Frontend', items: ['React', 'TypeScript', 'Tailwind CSS', 'Framer Motion'] },
  { category: 'OCR Engine', items: ['PaddleOCR', 'OpenCV (Backend)'] },
  { category: 'Backend', items: ['Python Flask', 'RESTful API', 'Modular Architecture'] },
  { category: 'Export', items: ['jsPDF', 'docx.js', 'File Saver'] },
];

export default function About() {
  return (
    <div className="pt-24 pb-12 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/20">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            About Smart Notes
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Smart Notes is an AI-powered digital notebook that converts handwritten and printed images
            into editable text using OCR technology, with a modern editor for creating and organizing notes.
          </p>
        </motion.div>

        {/* Mission */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mb-20 p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-indigo-50 to-cyan-50 border border-indigo-100"
        >
          <motion.div variants={fadeUp} custom={0} className="text-center">
            <GraduationCap className="w-10 h-10 text-indigo-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Our Mission</h2>
            <p className="text-slate-600 leading-relaxed max-w-2xl mx-auto">
              To bridge the gap between physical and digital note-taking by providing an intuitive,
              AI-powered platform that makes handwritten content instantly accessible, editable, and
              shareable. We believe that great ideas shouldn't be trapped on paper.
            </p>
          </motion.div>
        </motion.div>

        {/* Values */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="mb-20"
        >
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map((v, i) => (
              <motion.div
                key={v.title}
                variants={fadeUp}
                custom={i}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="p-8 rounded-2xl bg-white border border-slate-200/60 shadow-sm hover:shadow-md transition-all text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mx-auto mb-5">
                  <v.icon className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">{v.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Tech Stack */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="mb-20"
        >
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Technology Stack</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {techStack.map((t, i) => (
              <motion.div
                key={t.category}
                variants={fadeUp}
                custom={i}
                className="p-6 rounded-2xl bg-white border border-slate-200/60 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-4">
                  <Code2 className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-semibold text-slate-900">{t.category}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {t.items.map(item => (
                    <span
                      key={item}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 text-sm text-slate-600"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Built with love */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="text-slate-500 flex items-center justify-center gap-2">
            Built with <Heart className="w-4 h-4 text-red-500" /> for students and professionals
          </p>
          <p className="text-sm text-slate-400 mt-2">
            A Computer Engineering Final Year Project
          </p>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center p-10 rounded-3xl bg-slate-900 text-white relative overflow-hidden"
        >
          <h2 className="text-2xl font-bold mb-4">Start Taking Smart Notes</h2>
          <p className="text-slate-300 mb-8 max-w-md mx-auto">
            Try our AI-powered note-taking platform today.
          </p>
          <Link
            to="/editor"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-semibold text-indigo-700 bg-white hover:bg-indigo-50 shadow-xl transition-all"
          >
            Open Editor
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
