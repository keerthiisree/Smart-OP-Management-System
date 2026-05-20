import React, { useState, useEffect } from 'react';

interface WaitingPatient {
  visit_id: string;
  name: string;
  age: string;
  gender: string;
  department: string;
}

export default function NurseDashboard() {
  const [queue, setQueue] = useState<WaitingPatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<WaitingPatient | null>(null);
  const [vitals, setVitals] = useState({
    temp: '',
    hr: '',
    bp: '',
    spo2: '',
    height: '',
    weight: ''
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch the live waiting queue from the Flask backend
  const fetchQueue = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/queue/nurse');
      const data = await response.json();
      setQueue(data);
    } catch (err) {
      console.error("Error fetching nurse queue:", err);
    }
  };

  useEffect(() => {
    fetchQueue();
    // Auto-refresh the queue every 5 seconds to catch new check-ins instantly
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  // Calculate BMI dynamically if height and weight are present
  const calculateBMI = () => {
    const hMetres = parseFloat(vitals.height) / 100;
    const wKgs = parseFloat(vitals.weight);
    if (hMetres > 0 && wKgs > 0) {
      return (wKgs / (hMetres * hMetres)).toFixed(2);
    }
    return '0.00';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    const bmiValue = calculateBMI();
    const payload = {
      visit_id: selectedPatient.visit_id,
      ...vitals,
      bmi: bmiValue
    };

    try {
      const response = await fetch('http://127.0.0.1:5000/api/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        setSuccessMessage(`Vitals pushed for ${selectedPatient.name}. Routed to Doctor!`);
        setSelectedPatient(null);
        setVitals({ temp: '', hr: '', bp: '', spo2: '', height: '', weight: '' });
        fetchQueue();
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err) {
      console.error("Error submitting vitals:", err);
    }
  };

  return (
    <div className="min-h-screen bg-dark text-white p-6 font-sans">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Queue Column (Left Side) */}
        <div className="lg:col-span-1 bg-slate-800 p-6 rounded-xl border border-slate-700 h-fit">
          <h2 className="text-xl font-bold text-brand mb-4 border-b border-slate-700 pb-2">Triage Waiting Queue</h2>
          {queue.length === 0 ? (
            <p className="text-slate-500 text-sm italic">No patients waiting for vitals...</p>
          ) : (
            <div className="space-y-3">
              {queue.map((p) => (
                <div 
                  key={p.visit_id}
                  onClick={() => setSelectedPatient(p)}
                  className={`p-4 rounded-lg border cursor-pointer transition ${
                    selectedPatient?.visit_id === p.visit_id 
                      ? 'bg-brand text-slate-900 border-brand font-semibold shadow-lg' 
                      : 'bg-slate-900 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold truncate">{p.name}</h4>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      selectedPatient?.visit_id === p.visit_id ? 'bg-slate-900 text-white' : 'bg-slate-800 text-brand'
                    }`}>{p.visit_id}</span>
                  </div>
                  <p className={`text-xs mt-1 ${selectedPatient?.visit_id === p.visit_id ? 'text-slate-800' : 'text-slate-400'}`}>
                    {p.age} / {p.gender} • <span className="underline">{p.department}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Form Column (Right Side) */}
        <div className="lg:col-span-2 bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h2 className="text-xl font-bold text-brand mb-4 border-b border-slate-700 pb-2">Vitals Assessment</h2>
          
          {successMessage && (
            <div className="bg-emerald-900 border border-emerald-500 text-emerald-200 p-4 rounded mb-6 font-semibold">
              {successMessage}
            </div>
          )}

          {selectedPatient ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 flex flex-wrap gap-x-6 gap-y-2">
                <div><span className="text-xs text-slate-400">Assessing:</span> <strong className="text-brand">{selectedPatient.name}</strong></div>
                <div><span className="text-xs text-slate-400">ID:</span> <span className="font-mono text-sm">{selectedPatient.visit_id}</span></div>
                <div><span className="text-xs text-slate-400">Target Dept:</span> <span>{selectedPatient.department}</span></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Temperature (°F)</label>
                  <input type="number" step="0.1" required placeholder="e.g., 98.0" value={vitals.temp}
                    className="w-full bg-slate-900 border border-slate-600 rounded p-3 focus:outline-none focus:border-brand"
                    onChange={e => setVitals({...vitals, temp: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Heart Rate (HR / min)</label>
                  <input type="number" required placeholder="e.g., 77" value={vitals.hr}
                    className="w-full bg-slate-900 border border-slate-600 rounded p-3 focus:outline-none focus:border-brand"
                    onChange={e => setVitals({...vitals, hr: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Blood Pressure (BP - mmHg)</label>
                  <input type="text" required placeholder="e.g., 120/80" value={vitals.bp}
                    className="w-full bg-slate-900 border border-slate-600 rounded p-3 focus:outline-none focus:border-brand"
                    onChange={e => setVitals({...vitals, bp: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Oxygen Saturation (SpO2 %RA)</label>
                  <input type="number" required placeholder="e.g., 99" value={vitals.spo2}
                    className="w-full bg-slate-900 border border-slate-600 rounded p-3 focus:outline-none focus:border-brand"
                    onChange={e => setVitals({...vitals, spo2: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Height (cms)</label>
                  <input type="number" required placeholder="e.g., 167" value={vitals.height}
                    className="w-full bg-slate-900 border border-slate-600 rounded p-3 focus:outline-none focus:border-brand"
                    onChange={e => setVitals({...vitals, height: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Weight (kgs)</label>
                  <input type="number" step="0.1" required placeholder="e.g., 77" value={vitals.weight}
                    className="w-full bg-slate-900 border border-slate-600 rounded p-3 focus:outline-none focus:border-brand"
                    onChange={e => setVitals({...vitals, weight: e.target.value})} />
                </div>
              </div>

              <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-semibold">Body Mass Index (BMI)</h4>
                  <p className="text-xs text-slate-400">Calculated automatically from height & weight</p>
                </div>
                <div className="text-2xl font-bold font-mono text-brand bg-slate-800 px-4 py-2 rounded border border-slate-600">
                  {calculateBMI()}
                </div>
              </div>

              <button type="submit" className="w-full bg-brand text-slate-900 font-bold py-3 rounded-lg hover:bg-opacity-90 transition shadow-lg shadow-brand/10">
                Save Vitals & Send to Doctor
              </button>
            </form>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500 italic border-2 border-dashed border-slate-700 rounded-lg">
              Select a patient from the waiting queue to check vitals.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}