import { BookOpen, Github, Twitter, Linkedin } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Smart Notes</span>
            </div>
            <p className="text-sm leading-relaxed max-w-md">
              Transform your handwritten notes into editable digital documents with AI-powered OCR technology. Create, organize, and export your notes with ease.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Product</h4>
            <div className="flex flex-col gap-2 text-sm">
              <Link to="/editor" className="hover:text-white transition-colors">Editor</Link>
              <Link to="/notes" className="hover:text-white transition-colors">My Notes</Link>
              <Link to="/features" className="hover:text-white transition-colors">Features</Link>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <div className="flex flex-col gap-2 text-sm">
              <Link to="/about" className="hover:text-white transition-colors">About</Link>
              <span className="hover:text-white transition-colors cursor-pointer">Privacy Policy</span>
              <span className="hover:text-white transition-colors cursor-pointer">Terms of Service</span>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm">&copy; 2026 Smart Notes. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Twitter className="w-5 h-5 hover:text-white transition-colors cursor-pointer" />
            <Github className="w-5 h-5 hover:text-white transition-colors cursor-pointer" />
            <Linkedin className="w-5 h-5 hover:text-white transition-colors cursor-pointer" />
          </div>
        </div>
      </div>
    </footer>
  );
}
