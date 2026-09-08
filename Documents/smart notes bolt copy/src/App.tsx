import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Landing from './pages/Landing';
import Editor from './pages/Editor';
import Notes from './pages/Notes';
import Features from './pages/Features';
import About from './pages/About';

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/editor" element={<Editor />} />
              <Route path="/notes" element={<Notes />} />
              <Route path="/features" element={<Features />} />
              <Route path="/about" element={<About />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </ToastProvider>
  );
}
