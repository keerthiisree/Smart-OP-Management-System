import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ReceptionistDashboard from './Receptionist';
import NurseDashboard from './Nurse';
import DoctorDashboard from './Doctor';
import BlockchainExplorer from './BlockchainExplorer';
import { Activity, UserPlus, Heart, Stethoscope, Shield } from 'lucide-react';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-darker text-white antialiased font-sans">
        
        {/* Navigation Core */}
        <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 shadow-md">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-brand font-bold text-lg tracking-wide hover:opacity-90">
              <Activity className="text-brand" size={22} />
              <span>CLINICFLOW <span className="text-white text-xs font-light">v1.1</span></span>
            </Link>
            
            <div className="flex items-center space-x-1 md:space-x-4">
              <Link to="/reception" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 text-slate-300 hover:text-brand transition">
                <UserPlus size={16} /> <span className="hidden md:inline">Reception desk</span>
              </Link>
              <Link to="/nurse" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 text-slate-300 hover:text-brand transition">
                <Heart size={16} /> <span className="hidden md:inline">Triage / Nurse</span>
              </Link>
              <Link to="/doctor" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 text-slate-300 hover:text-brand transition">
                <Stethoscope size={16} /> <span className="hidden md:inline">Physician desk</span>
              </Link>
              <Link to="/explorer" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 text-slate-300 hover:text-purple-400 transition">
                <Shield size={16} /> <span className="hidden md:inline">⛓ Chain Explorer</span>
              </Link>
            </div>
          </div>
        </nav>

        {/* View Router */}
        <main className="animate-fade-in">
          <Routes>
            <Route path="/reception" element={<ReceptionistDashboard />} />
            <Route path="/nurse" element={<NurseDashboard />} />
            <Route path="/doctor" element={<DoctorDashboard />} />
            <Route path="/explorer" element={<BlockchainExplorer />} />
            <Route path="/" element={
              <div className="max-w-4xl mx-auto text-center mt-24 px-6">
                <div className="inline-flex p-4 bg-slate-900 rounded-2xl border border-slate-800 mb-6 text-brand shadow-xl">
                  <Activity size={48} className="animate-pulse" />
                </div>
                <h1 className="text-5xl font-extrabold text-white tracking-tight mb-4">
                  Smart OP Management System
                </h1>
                <p className="text-slate-400 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
                  A high-speed, dynamic out-patient workflow engine designed to synchronize Front Desk, Triage, and Clinical treatment operations in real time.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
                  <Link to="/reception" className="p-5 bg-slate-800 border border-slate-700 rounded-xl hover:border-brand transition text-center group">
                    <UserPlus className="mx-auto mb-2 text-slate-400 group-hover:text-brand" size={24} />
                    <span className="block font-bold text-sm text-slate-200">1. Reception</span>
                  </Link>
                  <Link to="/nurse" className="p-5 bg-slate-800 border border-slate-700 rounded-xl hover:border-brand transition text-center group">
                    <Heart className="mx-auto mb-2 text-slate-400 group-hover:text-brand" size={24} />
                    <span className="block font-bold text-sm text-slate-200">2. Nurse Triage</span>
                  </Link>
                  <Link to="/doctor" className="p-5 bg-slate-800 border border-slate-700 rounded-xl hover:border-brand transition text-center group">
                    <Stethoscope className="mx-auto mb-2 text-slate-400 group-hover:text-brand" size={24} />
                    <span className="block font-bold text-sm text-slate-200">3. Physician</span>
                  </Link>
                </div>
              </div>
            } />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;