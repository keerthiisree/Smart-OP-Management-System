import React, { useState, useEffect } from 'react';
import { Heart, Printer, Download } from 'lucide-react';

export default function NurseDashboard() {
  const [activeTab, setActiveTab] = useState<'triage' | 'printing'>('triage');
  const [triageQueue, setTriageQueue] = useState<any[]>([]);
  const [printQueue, setPrintQueue] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [vitals, setVitals] = useState({ temp: '', hr: '', bp: '', spo2: '', height: '', weight: '' });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchQueues = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/queue/nurse');
      const data = await response.json();
      setTriageQueue(data.waiting);
      setPrintQueue(data.printing);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchQueues();
    const interval = setInterval(fetchQueues, 4000);
    return () => clearInterval(interval);
  }, []);

  const calculateBMI = () => {
    const hMetres = parseFloat(vitals.height) / 100;
    const wKgs = parseFloat(vitals.weight);
    if (hMetres > 0 && wKgs > 0) return (wKgs / (hMetres * hMetres)).toFixed(2);
    return '0.00';
  };

  const handleTriageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    try {
      await fetch('http://127.0.0.1:5000/api/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visit_id: selectedPatient.visit_id, ...vitals, bmi: calculateBMI() })
      });
      setSuccessMessage(`Vitals pushed for ${selectedPatient.name}. Routed to Doctor!`);
      setSelectedPatient(null);
      // This will now successfully clear the UI boxes because we bound the values to the inputs!
      setVitals({ temp: '', hr: '', bp: '', spo2: '', height: '', weight: '' });
      fetchQueues();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  // ADVANCED HTML PRINT GENERATOR (Models the KIMS layout - Dynamically linked to DB)
  const handleDownload = async (patient: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Please allow popups to print the prescription.");
        return;
    }

    const medicationsHtml = (patient.medications && patient.medications.length > 0) 
      ? patient.medications.map((m: any, index: number) => `
          <tr>
              <td>${index + 1}</td>
              <td><strong>${m.name}</strong></td>
              <td>${m.route}</td>
              <td>${m.dose}</td>
              <td>${m.frequency}</td>
              <td>${m.timing}</td>
              <td>${m.duration}</td>
          </tr>
      `).join('')
      : `<tr>
          <td colspan="7" style="text-align:center; font-style:italic; padding: 20px;">
              No medications prescribed.
          </td>
         </tr>`;

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Prescription - ${patient.name}</title>
        <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #000; padding: 40px; max-width: 800px; margin: auto; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .hospital-name { font-size: 24px; font-weight: bold; text-transform: uppercase; margin: 0; }
            .hospital-contact { font-size: 12px; margin: 5px 0 0 0; }
            
            .title { text-align: center; font-size: 16px; font-weight: bold; text-decoration: underline; margin-bottom: 20px; text-transform: uppercase; }
            
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #000; margin-bottom: 20px; }
            .info-col { padding: 10px; }
            .info-col:first-child { border-right: 1px solid #000; }
            .info-line { margin: 5px 0; font-size: 14px; }
            
            .assessment-grid { display: grid; grid-template-columns: 2fr 1fr; border: 1px solid #000; border-top: none; margin-top: -20px; margin-bottom: 20px; }
            .vitals-box { padding: 10px; border-right: 1px solid #000; }
            .diagnosis-box { padding: 10px; }
            
            .section-title { font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
            .vitals-data { font-size: 12px; line-height: 1.6; }
            
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            th { background-color: #f0f0f0; }
            
            .footer { margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end; }
            .sign-box { text-align: center; }
            .sign-line { border-top: 1px dashed #000; padding-top: 5px; width: 200px; font-weight: bold; font-size: 14px; margin-top: 40px;}
        </style>
    </head>
    <body>
        <div class="header">
            <h1 class="hospital-name">HOSPITAL NAME HERE</h1>
            <p class="hospital-contact">Hospital Address Line 1, City, State ZIP<br>Phone: +91-XXXXXXXXXX | Email: contact@hospital.com | Web: www.hospital.com</p>
        </div>

        <div class="title">DEPARTMENT OF ${patient.department || 'GENERAL MEDICINE'}<br>OUT PATIENT ASSESSMENT RECORD</div>

        <div class="info-grid">
            <div class="info-col">
                <div class="info-line"><strong>${patient.name.toUpperCase()}</strong></div>
                <div class="info-line">Age/Gender: ${patient.age || '--'} / ${patient.gender || '--'}</div>
                <div class="info-line">Phone: ${patient.phone || 'N/A'}</div>
            </div>
            <div class="info-col">
                <div class="info-line"><strong>Consult ID:</strong> ${patient.visit_id}</div>
                <div class="info-line"><strong>Consult Date:</strong> ${new Date().toLocaleDateString()}</div>
                <div class="info-line"><strong>Physician:</strong> ${patient.doctor_name ? patient.doctor_name.toUpperCase() : '--'}</div>
            </div>
        </div>

        <div class="assessment-grid">
            <div class="vitals-box">
                <div class="section-title" style="margin-bottom: 12px;">VITALS</div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); row-gap: 15px; font-size: 12px; line-height: 1.4;">
                    <div>
                        <span style="font-weight: bold;">Temp :</span><br>
                        ${patient.temperature || '--'} &deg;F
                    </div>
                    <div>
                        <span style="font-weight: bold;">HR :</span><br>
                        ${patient.heart_rate || '--'} /min
                    </div>
                    <div>
                        <span style="font-weight: bold;">BP (mmHg) :</span><br>
                        ${patient.bp || '--'}
                    </div>
                    <div>
                        <span style="font-weight: bold;">SpO2 :</span><br>
                        ${patient.spo2 || '--'} %
                    </div>
                    <div>
                        <span style="font-weight: bold;">Weight :</span><br>
                        ${patient.weight || '--'} kgs
                    </div>
                    <div>
                        <span style="font-weight: bold;">BMI :</span><br>
                        ${patient.bmi || '--'}
                    </div>
                </div>
            </div>
            <div class="diagnosis-box">
                <div class="section-title">Diagnosis</div>
                <strong>${patient.diagnosis ? patient.diagnosis.toUpperCase() : '--'}</strong>
            </div>
        </div>

        <div class="section-title">Medication Prescribed</div>
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Medicine</th>
                    <th>Route</th>
                    <th>Dose</th>
                    <th>Frequency</th>
                    <th>When</th>
                    <th>Duration</th>
                </tr>
            </thead>
            <tbody>
                ${medicationsHtml}
            </tbody>
        </table>

        <div class="footer">
            <div>
                <strong>FOLLOW UP</strong><br>
                Date: ${patient.follow_up || 'As Directed'}
            </div>
            <div class="sign-box">
                <div class="sign-line">${patient.doctor_name ? patient.doctor_name.toUpperCase() : 'AUTHORIZED SIGNATORY'}</div>
                <div style="font-size: 10px; margin-top: 5px;">Printed On: ${new Date().toLocaleString()}</div>
            </div>
        </div>
        
        <script>
            window.onload = function() {
                window.print();
            }
        </script>
    </body>
    </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handlePrintComplete = async (visitId: string, name: string) => {
    try {
      await fetch('http://127.0.0.1:5000/api/print/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visit_id: visitId })
      });
      alert(`Print cycle complete for ${name}! Session finalized.`);
      fetchQueues();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-dark text-white p-6 font-sans">
      
      {/* Tab Controls */}
      <div className="max-w-5xl mx-auto mb-6 flex bg-slate-900 p-1.5 rounded-lg border border-slate-800 w-fit">
        <button onClick={() => { setActiveTab('triage'); setSelectedPatient(null); }} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition ${activeTab === 'triage' ? 'bg-brand text-slate-900 shadow' : 'text-slate-400'}`}>
          <Heart size={16} /> Triage Queue ({triageQueue.length})
        </button>
        <button onClick={() => { setActiveTab('printing'); setSelectedPatient(null); }} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition ${activeTab === 'printing' ? 'bg-brand text-slate-900 shadow' : 'text-slate-400'}`}>
          <Printer size={16} /> Print Desk ({printQueue.length})
        </button>
      </div>

      {activeTab === 'triage' ? (
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Triage Queue List */}
          <div className="lg:col-span-1 bg-slate-800 p-6 rounded-xl border border-slate-700 h-fit">
            <h2 className="text-xl font-bold text-brand mb-4 border-b border-slate-700 pb-2">Triage Waiting List</h2>
            {triageQueue.length === 0 ? <p className="text-slate-500 text-sm italic">Queue clear.</p> : (
              <div className="space-y-3">
                {triageQueue.map(p => (
                  <div key={p.visit_id} onClick={() => setSelectedPatient(p)} className={`p-4 rounded-lg border cursor-pointer transition ${selectedPatient?.visit_id === p.visit_id ? 'bg-brand text-slate-900 font-semibold' : 'bg-slate-900 border-slate-700'}`}>
                    <h4 className="truncate">{p.name}</h4>
                    <p className="text-xs font-mono opacity-80">{p.visit_id} • {p.department}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Vitals Form */}
          <div className="lg:col-span-2 bg-slate-800 p-6 rounded-xl border border-slate-700">
            <h2 className="text-xl font-bold text-brand mb-4 border-b border-slate-700 pb-2">Record Vitals</h2>
            {successMessage && <div className="bg-emerald-900 p-4 rounded mb-4 font-semibold text-sm">{successMessage}</div>}
            {selectedPatient ? (
              <form onSubmit={handleTriageSubmit} className="space-y-6">
                <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                  <div><span className="text-slate-400">Patient:</span> <strong className="text-brand">{selectedPatient.name}</strong></div>
                  <div><span className="text-slate-400">ID:</span> <span className="font-mono">{selectedPatient.visit_id}</span></div>
                </div>
                
                {/* REFINED UI: Persistent Labels and Embedded Units */}
                <div className="grid grid-cols-2 gap-4">
                  
                  {/* Temperature */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1 font-semibold">Temperature</label>
                    <div className="relative">
                      <input type="number" step="0.1" required value={vitals.temp} className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-sm text-white focus:border-brand outline-none pr-8" onChange={e => setVitals({...vitals, temp: e.target.value})} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono">°F</span>
                    </div>
                  </div>

                  {/* Heart Rate */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1 font-semibold">Heart Rate</label>
                    <div className="relative">
                      <input type="number" required value={vitals.hr} className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-sm text-white focus:border-brand outline-none pr-10" onChange={e => setVitals({...vitals, hr: e.target.value})} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono">bpm</span>
                    </div>
                  </div>

                  {/* Blood Pressure */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1 font-semibold">Blood Pressure</label>
                    <div className="relative">
                      <input type="text" required value={vitals.bp} placeholder="120/80" className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-sm text-white focus:border-brand outline-none pr-12 placeholder-slate-600" onChange={e => setVitals({...vitals, bp: e.target.value})} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono">mmHg</span>
                    </div>
                  </div>

                  {/* SpO2 */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1 font-semibold">Oxygen (SpO2)</label>
                    <div className="relative">
                      <input type="number" required value={vitals.spo2} className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-sm text-white focus:border-brand outline-none pr-8" onChange={e => setVitals({...vitals, spo2: e.target.value})} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono">%</span>
                    </div>
                  </div>

                  {/* Height */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1 font-semibold">Height</label>
                    <div className="relative">
                      <input type="number" required value={vitals.height} className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-sm text-white focus:border-brand outline-none pr-8" onChange={e => setVitals({...vitals, height: e.target.value})} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono">cm</span>
                    </div>
                  </div>

                  {/* Weight */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1 font-semibold">Weight</label>
                    <div className="relative">
                      <input type="number" step="0.1" required value={vitals.weight} className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-sm text-white focus:border-brand outline-none pr-8" onChange={e => setVitals({...vitals, weight: e.target.value})} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono">kg</span>
                    </div>
                  </div>

                </div>

                <div className="bg-slate-900 p-4 rounded border border-slate-700 flex justify-between items-center mt-6">
                  <span className="text-sm font-semibold uppercase tracking-wider text-slate-400">Calculated BMI</span>
                  <span className="text-xl font-mono text-brand font-bold">{calculateBMI()}</span>
                </div>
                
                <button type="submit" className="w-full bg-brand text-slate-900 font-bold py-3 rounded-lg hover:bg-opacity-90 transition mt-6">
                  Forward Data to Doctor
                </button>
              </form>
            ) : <div className="h-48 flex items-center justify-center text-slate-500 italic">Select patient from triage list.</div>}
          </div>
        </div>
      ) : (
        /* Print Queue View */
        <div className="max-w-4xl mx-auto bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h2 className="text-xl font-bold text-brand mb-4">Post-Consultation Print Desk</h2>
          {printQueue.length === 0 ? <p className="text-slate-500 text-sm italic p-4 text-center">No prescriptions waiting for print.</p> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {printQueue.map(p => (
                <div key={p.visit_id} className="bg-slate-900 border border-slate-700 rounded-lg p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-bold text-lg text-white">{p.name}</h4>
                      <span className="text-xs font-mono bg-slate-800 border px-2 py-0.5 rounded text-brand border-slate-600">{p.visit_id}</span>
                    </div>
                    <p className="text-sm text-slate-400">Physician: <strong className="text-slate-200">{p.doctor_name}</strong></p>
                    <p className="text-sm text-slate-400 mt-1">Diagnosis: <span className="font-mono text-amber-400 font-semibold">{p.diagnosis}</span></p>
                  </div>
                  
                  {/* View/Print Report Button */}
                  <div className="mt-6 flex gap-2">
                    <button onClick={() => handleDownload(p)} className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-semibold py-2 rounded flex items-center justify-center gap-2 transition text-sm">
                      <Download size={16} /> Print Report
                    </button>
                    <button onClick={() => handlePrintComplete(p.visit_id, p.name)} className="flex-1 bg-slate-800 hover:bg-brand hover:text-slate-900 border border-slate-600 text-brand font-bold py-2 rounded flex items-center justify-center gap-2 transition text-sm">
                      <Printer size={16} /> Finalize
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}