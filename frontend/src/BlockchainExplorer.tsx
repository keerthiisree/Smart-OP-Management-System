import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE } from './config';
import { Shield, ShieldAlert, RefreshCw, Link2, Clock, User, Hash, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Activity, Lock } from 'lucide-react';

interface Block {
  index: number;
  timestamp: number;
  visit_id: string;
  user_id: string;
  action: string;
  data_hash: string;
  signature: string;
  previous_hash: string;
  hash: string;
}

const ACTION_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  GENESIS:      { bg: '#0f172a', border: '#334155', text: '#94a3b8', badge: '#1e293b' },
  REGISTER:     { bg: '#0c1a3b', border: '#3b82f6', text: '#60a5fa', badge: '#1e3a8a' },
  VITALS:       { bg: '#0a2e1c', border: '#22c55e', text: '#4ade80', badge: '#14532d' },
  PRESCRIPTION: { bg: '#2a0a3b', border: '#a855f7', text: '#c084fc', badge: '#581c87' },
};

const ACTION_LABELS: Record<string, string> = {
  GENESIS: '🌐 Genesis Block',
  REGISTER: '👤 Patient Registered',
  VITALS: '❤️ Vitals Recorded',
  PRESCRIPTION: '💊 Prescription Issued',
};

const getColor = (action: string) => ACTION_COLORS[action] || ACTION_COLORS['GENESIS'];

function truncate(str: string, n = 16) {
  return str.length > n ? str.slice(0, n) + '…' : str;
}

function formatTime(ts: number) {
  return new Date(ts * 1000).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function BlockCard({ block, isNew }: { block: Block; isNew: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const c = getColor(block.action);

  return (
    <div
      className={`block-card ${isNew ? 'block-new' : ''}`}
      style={{
        background: c.bg,
        borderColor: c.border,
        borderWidth: 1,
        borderStyle: 'solid',
        borderRadius: 16,
        padding: '20px 24px',
        position: 'relative',
        transition: 'all 0.3s ease',
        animation: isNew ? 'blockAppear 0.6s ease-out' : 'none',
      }}
    >
      {/* Block index badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            background: c.badge, color: c.text, fontWeight: 700, fontSize: 12,
            padding: '4px 10px', borderRadius: 8, fontFamily: 'monospace', letterSpacing: 1,
          }}>
            BLOCK #{block.index}
          </span>
          <span style={{
            background: c.badge, color: c.text, fontWeight: 600, fontSize: 12,
            padding: '4px 10px', borderRadius: 8,
          }}>
            {ACTION_LABELS[block.action] || block.action}
          </span>
          {isNew && (
            <span style={{
              background: '#fbbf24', color: '#000', fontWeight: 700, fontSize: 11,
              padding: '3px 8px', borderRadius: 6, animation: 'pulse 1s infinite',
            }}>
              NEW ⛓
            </span>
          )}
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ background: 'transparent', border: 'none', color: c.text, cursor: 'pointer' }}
        >
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* Key fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <Field icon={<Clock size={13} />} label="Timestamp" value={formatTime(block.timestamp)} color={c.text} />
        <Field icon={<User size={13} />} label="Staff ID" value={block.user_id} color={c.text} />
        <Field icon={<Activity size={13} />} label="Visit ID" value={block.visit_id} color={c.text} />
        <Field icon={<Hash size={13} />} label="Block Hash" value={truncate(block.hash, 20)} color={c.text} mono />
      </div>

      {/* Hash chain visualization */}
      <div style={{
        background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '10px 14px',
        fontFamily: 'monospace', fontSize: 11, color: '#64748b',
      }}>
        <div style={{ marginBottom: 4 }}>
          <span style={{ color: '#475569' }}>prev: </span>
          <span style={{ color: '#94a3b8' }}>{truncate(block.previous_hash, 36)}</span>
        </div>
        <div>
          <span style={{ color: '#475569' }}>curr: </span>
          <span style={{ color: c.text, fontWeight: 600 }}>{truncate(block.hash, 36)}</span>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{
          marginTop: 14, padding: '14px', background: 'rgba(0,0,0,0.4)',
          borderRadius: 10, fontFamily: 'monospace', fontSize: 11,
        }}>
          <FullField label="Full Hash" value={block.hash} color={c.text} />
          <FullField label="Prev Hash" value={block.previous_hash} color="#64748b" />
          <FullField label="Data Hash" value={block.data_hash} color="#64748b" />
          <FullField label="ECDSA Sig" value={block.signature.slice(0, 80) + '…'} color="#64748b" />
        </div>
      )}
    </div>
  );
}

function Field({ icon, label, value, color, mono = false }: {
  icon: React.ReactNode; label: string; value: string; color: string; mono?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
        {icon} {label}
      </div>
      <div style={{ color, fontSize: 13, fontFamily: mono ? 'monospace' : 'inherit', fontWeight: 500 }}>
        {value}
      </div>
    </div>
  );
}

function FullField({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ color: '#475569', fontSize: 10, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      <div style={{ color, wordBreak: 'break-all', lineHeight: 1.6 }}>{value}</div>
    </div>
  );
}

function ConnectorArrow({ color }: { color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '4px 0' }}>
      <div style={{ width: 2, height: 12, background: color, opacity: 0.5 }} />
      <Link2 size={18} style={{ color, opacity: 0.7 }} />
      <div style={{ width: 2, height: 12, background: color, opacity: 0.5 }} />
    </div>
  );
}

export default function BlockchainExplorer() {
  const [chain, setChain] = useState<Block[]>([]);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [newBlockIndex, setNewBlockIndex] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchChain = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/chain`);
      const data = await res.json();
      setChain(prev => {
        if (data.chain.length > prev.length) {
          setNewBlockIndex(data.chain.length - 1);
          setTimeout(() => setNewBlockIndex(null), 3000);
        }
        return data.chain;
      });
      setIsValid(data.is_valid);
      setLastFetched(new Date());
    } catch {
      setIsValid(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChain();
  }, [fetchChain]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchChain, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchChain]);

  const stats = {
    total: chain.length,
    registers: chain.filter(b => b.action === 'REGISTER').length,
    vitals: chain.filter(b => b.action === 'VITALS').length,
    prescriptions: chain.filter(b => b.action === 'PRESCRIPTION').length,
  };

  return (
    <div style={{ minHeight: '100vh', background: '#060d1a', padding: '32px 24px', fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @keyframes blockAppear {
          from { opacity: 0; transform: translateY(-20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{
              background: 'linear-gradient(135deg, #1e3a8a, #7c3aed)',
              borderRadius: 16, padding: 14, display: 'flex',
            }}>
              <Lock size={28} color="white" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <h1 style={{ color: 'white', fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>
                Blockchain Audit Ledger
              </h1>
              <p style={{ color: '#64748b', margin: 0, fontSize: 14 }}>
                Cryptographically sealed clinical audit trail
              </p>
            </div>
          </div>

          {/* Chain integrity banner */}
          {isValid === true && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e',
              borderRadius: 12, padding: '10px 20px', color: '#4ade80', fontWeight: 600,
            }}>
              <CheckCircle size={18} />
              CHAIN INTEGRITY VERIFIED — No tampering detected
            </div>
          )}
          {isValid === false && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444',
              borderRadius: 12, padding: '10px 20px', color: '#f87171', fontWeight: 600,
            }}>
              <ShieldAlert size={18} />
              ⚠️ CHAIN COMPROMISED — Hash mismatch detected!
            </div>
          )}
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Total Blocks', value: stats.total, color: '#94a3b8', icon: '⛓' },
            { label: 'Registrations', value: stats.registers, color: '#60a5fa', icon: '👤' },
            { label: 'Vitals', value: stats.vitals, color: '#4ade80', icon: '❤️' },
            { label: 'Prescriptions', value: stats.prescriptions, color: '#c084fc', icon: '💊' },
          ].map(s => (
            <div key={s.label} style={{
              background: '#0f172a', border: '1px solid #1e293b',
              borderRadius: 14, padding: '16px 20px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ color: s.color, fontSize: 28, fontWeight: 800 }}>{s.value}</div>
              <div style={{ color: '#475569', fontSize: 12, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ color: '#475569', fontSize: 13 }}>
            {lastFetched && `Last updated: ${lastFetched.toLocaleTimeString()}`}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 13, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={e => setAutoRefresh(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              Auto-refresh (5s)
            </label>
            <button
              onClick={fetchChain}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: '#1e293b', border: '1px solid #334155',
                borderRadius: 10, padding: '8px 16px', color: '#94a3b8',
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
              }}
            >
              <RefreshCw size={15} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
              Refresh
            </button>
          </div>
        </div>

        {/* Chain visualization — newest first */}
        {chain.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#475569', padding: '60px 0' }}>
            No blocks yet. Register a patient to seal the first block.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[...chain].reverse().map((block, i, arr) => (
              <React.Fragment key={block.index}>
                <BlockCard block={block} isNew={block.index === newBlockIndex} />
                {i < arr.length - 1 && (
                  <ConnectorArrow color={getColor(arr[i + 1].action).border} />
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* How to read guide for mentor */}
        <div style={{
          marginTop: 48, background: '#0f172a', border: '1px solid #1e293b',
          borderRadius: 16, padding: '24px 28px',
        }}>
          <h3 style={{ color: '#94a3b8', fontWeight: 700, marginBottom: 16, fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 }}>
            🎓 How This Blockchain Works
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { step: '1', title: 'Staff Action', desc: 'Receptionist registers a patient. Nurse records vitals. Doctor prescribes.' },
              { step: '2', title: 'ECDSA Signing', desc: 'Staff private key (P-256 curve) signs the action locally in the browser. Signature is hex DER encoded.' },
              { step: '3', title: 'Verification', desc: 'Server verifies the signature using the staff\'s public key. Forged or unsigned data is rejected with HTTP 403.' },
              { step: '4', title: 'Block Sealing', desc: 'Each block stores: action, data hash, ECDSA signature, and SHA-256 hash of the previous block — forming an unbreakable chain.' },
            ].map(s => (
              <div key={s.step} style={{ display: 'flex', gap: 12 }}>
                <div style={{
                  minWidth: 28, height: 28, background: '#1e3a8a', borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#60a5fa', fontWeight: 700, fontSize: 13,
                }}>
                  {s.step}
                </div>
                <div>
                  <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{s.title}</div>
                  <div style={{ color: '#64748b', fontSize: 12, lineHeight: 1.6 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
