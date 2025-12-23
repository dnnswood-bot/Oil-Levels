import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Droplets, Truck, History, Sparkles, TrendingUp, X, Trash2 } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { OilEntry, EntryType, UsageStats } from './types';
import { LITERS_PER_CM, STORAGE_KEY, COLORS } from './constants';
import { getOilInsights } from './geminiService';

const MAX_TANK_HEIGHT_CM = 100;

const App: React.FC = () => {
  const [entries, setEntries] = useState<OilEntry[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<EntryType>(EntryType.READING);
  const [insights, setInsights] = useState<string>('Logging your first entries will enable AI predictions...');
  const [isGenerating, setIsGenerating] = useState(false);

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [levelCm, setLevelCm] = useState<string>('');
  const [liters, setLiters] = useState<string>('');
  const [cost, setCost] = useState<string>('');
  const [note, setNote] = useState<string>('');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setEntries(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse stored data", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    if (entries.length > 1) {
      handleGetInsights();
    }
  }, [entries]);

  const handleGetInsights = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const result = await getOilInsights(entries);
      setInsights(result || "Dashboard analysis complete.");
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const addEntry = () => {
    const val = parseFloat(levelCm);
    const litVal = parseFloat(liters);
    
    const newEntry: OilEntry = {
      id: crypto.randomUUID(),
      date,
      type: modalType,
      levelCm: modalType === EntryType.READING ? val : undefined,
      liters: modalType === EntryType.READING ? val * LITERS_PER_CM : litVal,
      cost: modalType === EntryType.DELIVERY ? parseFloat(cost) : undefined,
      note: modalType === EntryType.DELIVERY ? note : undefined,
    };

    setEntries(prev => [...prev, newEntry].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    setIsModalOpen(false);
    resetForm();
  };

  const deleteEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const resetForm = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setLevelCm('');
    setLiters('');
    setCost('');
    setNote('');
  };

  const stats = useMemo<UsageStats>(() => {
    const sorted = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const latestReading = [...sorted].reverse().find(e => e.type === EntryType.READING);
    const totalSpent = entries.reduce((acc, e) => acc + (e.cost || 0), 0);
    
    let avgUsage = 0;
    if (sorted.length >= 2) {
      const readings = sorted.filter(e => e.type === EntryType.READING);
      if (readings.length >= 2) {
        const first = readings[0];
        const last = readings[readings.length - 1];
        const dayDiff = (new Date(last.date).getTime() - new Date(first.date).getTime()) / (1000 * 3600 * 24);
        
        const deliveriesInBetween = sorted.filter(e => 
          e.type === EntryType.DELIVERY && 
          new Date(e.date) >= new Date(first.date) && 
          new Date(e.date) <= new Date(last.date)
        ).reduce((acc, e) => acc + (e.liters || 0), 0);

        const totalUsed = (first.liters || 0) + deliveriesInBetween - (last.liters || 0);
        avgUsage = dayDiff > 0 ? totalUsed / dayDiff : 0;
      }
    }

    return {
      totalSpent,
      avgDailyUsage: Math.max(0, avgUsage),
      currentLevelLiters: latestReading?.liters || 0,
      estimatedDaysRemaining: avgUsage > 0 ? (latestReading?.liters || 0) / avgUsage : 0
    };
  }, [entries]);

  const currentLevelCm = useMemo(() => {
    const latestReading = [...entries].reverse().find(e => e.type === EntryType.READING);
    return latestReading?.levelCm || 0;
  }, [entries]);

  const chartData = useMemo(() => {
    return entries.filter(e => e.type === EntryType.READING).map(e => ({
      name: new Date(e.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
      liters: e.liters,
      cm: e.levelCm
    }));
  }, [entries]);

  return (
    <div className="min-h-screen pb-10 px-4 md:px-8 bg-slate-950 text-slate-50 selection:bg-purple-500/30">
      <header className="py-6 flex flex-col md:flex-row justify-between items-start md:items-center max-w-7xl mx-auto gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-violet-500 to-orange-500 bg-clip-text text-transparent">
            OilTrack Pro
          </h1>
          <p className="text-purple-400 text-[10px] md:text-xs mt-1 uppercase tracking-[0.2em] font-bold">Smart Heating Management</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={() => { setModalType(EntryType.READING); setIsModalOpen(true); }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-900 border border-violet-500/30 text-violet-400 px-4 py-3 rounded-xl hover:bg-violet-500/10 transition-all text-sm font-bold"
          >
            <Droplets size={16} className="text-orange-500" /> Reading
          </button>
          <button 
            onClick={() => { setModalType(EntryType.DELIVERY); setIsModalOpen(true); }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-900 border border-orange-500/30 text-orange-400 px-4 py-3 rounded-xl hover:bg-orange-500/10 transition-all text-sm font-bold"
          >
            <Truck size={16} className="text-violet-400" /> Delivery
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
             <div className="md:col-span-5 glass-panel p-8 rounded-[2rem] flex flex-col items-center justify-center purple-glow border-violet-500/10">
                <h3 className="text-[10px] font-bold text-slate-500 mb-8 uppercase tracking-[0.3em] text-center">Live Tank Volume</h3>
                <OilTank levelCm={currentLevelCm} />
                <div className="mt-8 text-center">
                  <span className="text-4xl font-black text-green-400 tracking-tighter">{currentLevelCm}<span className="text-sm ml-1 font-normal text-slate-500">cm</span></span>
                  <p className="text-[10px] text-slate-500 uppercase font-bold mt-1 tracking-widest">Vertical Capacity</p>
                </div>
             </div>
             <div className="md:col-span-7 flex flex-col gap-4">
               <div className="grid grid-cols-2 gap-4 h-full">
                  <StatCard label="Current" value={`${stats.currentLevelLiters.toFixed(0)}L`} subValue={`${(stats.currentLevelLiters / LITERS_PER_CM).toFixed(1)} cm`} icon={<Droplets size={20} className="text-orange-500" />} color="purple" />
                  <StatCard label="Total Cost" value={`£${stats.totalSpent.toLocaleString()}`} subValue="Lifetime spend" icon={<TrendingUp size={20} className="text-violet-500" />} color="orange" />
                  <StatCard label="Daily Avg" value={`${stats.avgDailyUsage.toFixed(1)}L`} subValue="Burn rate" icon={<History size={20} className="text-orange-500" />} color="purple" />
                  <StatCard label="Heat Days" value={`${Math.round(stats.estimatedDaysRemaining)}`} subValue="Days remaining" icon={<Sparkles size={20} className="text-violet-500" />} color="orange" />
               </div>
             </div>
          </div>

          <div className="glass-panel p-6 rounded-3xl orange-glow relative overflow-hidden border-orange-500/10">
            <h2 className="text-[10px] font-black flex items-center gap-2 mb-4 text-orange-400 uppercase tracking-[0.2em]"><Sparkles size={14} /> AI Intelligence Engine</h2>
            <div className="text-slate-200 text-sm leading-relaxed min-h-[50px] font-medium">
              {isGenerating ? (
                <div className="flex items-center gap-3 animate-pulse text-xs text-slate-500">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce delay-75"></div>
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce delay-150"></div>
                  </div>
                  Analyzing consumption patterns and supply chain pricing...
                </div>
              ) : (
                <span className="text-slate-300 md:text-sm">{insights}</span>
              )}
            </div>
          </div>

          <div className="glass-panel p-8 rounded-[2rem] purple-glow border-violet-500/10">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-[10px] font-black flex items-center gap-2 uppercase tracking-[0.3em] text-violet-400"><LayoutDashboard size={16} /> 12-Month Usage Trend</h2>
            </div>
            <div className="h-[240px] md:h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorLiters" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.purple} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={COLORS.purple} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', fontSize: '11px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                    itemStyle={{ color: COLORS.purple, fontWeight: 'bold' }}
                    labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                  />
                  <Area type="monotone" dataKey="liters" stroke={COLORS.purple} fillOpacity={1} fill="url(#colorLiters)" strokeWidth={4} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="glass-panel rounded-[2rem] flex-1 flex flex-col min-h-[400px] border-slate-800/40">
            <div className="p-6 border-b border-slate-800/50 flex justify-between items-center">
              <h2 className="text-[10px] font-black flex items-center gap-2 uppercase tracking-[0.3em] text-violet-400"><History size={16} /> Audit Timeline</h2>
              <span className="text-[10px] bg-slate-800 px-3 py-1 rounded-full text-orange-400 font-bold border border-orange-500/20">{entries.length} Events</span>
            </div>
            <div className="overflow-y-auto max-h-[600px] lg:max-h-none flex-1 p-4 space-y-4 scrollbar-hide">
              {entries.length === 0 ? (
                <div className="text-center py-24 text-slate-600 flex flex-col items-center gap-4">
                  <div className="w-12 h-12 rounded-full border border-slate-800 flex items-center justify-center">
                    <History size={20} />
                  </div>
                  <p className="text-xs font-medium uppercase tracking-widest">No transaction history</p>
                </div>
              ) : (
                [...entries].reverse().map(entry => <HistoryItem key={entry.id} entry={entry} onDelete={deleteEntry} />)
              )}
            </div>
          </div>
        </div>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-md bg-slate-900 border-t md:border border-slate-800 rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="p-8">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-xl font-black flex items-center gap-3 tracking-tight">
                  {modalType === EntryType.READING ? <Droplets className="text-violet-500" /> : <Truck className="text-orange-500" />}
                  {modalType === EntryType.READING ? 'Log Tank Level' : 'Oil Delivery'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="bg-slate-800/50 hover:bg-slate-800 p-2.5 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-[0.2em]">Transaction Date</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-violet-500/50 transition-colors" />
                </div>
                {modalType === EntryType.READING ? (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-[0.2em]">Dip Level (cm)</label>
                    <div className="relative">
                      <input type="number" value={levelCm} placeholder="0" max={100} onChange={e => setLevelCm(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-5 text-4xl font-black text-white focus:outline-none focus:border-violet-500/50" />
                      <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600 font-black text-sm">CM</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-[0.2em]">Liters</label>
                        <input type="number" value={liters} placeholder="500" onChange={e => setLiters(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-black focus:outline-none focus:border-orange-500/50" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-[0.2em]">Cost £</label>
                        <input type="number" value={cost} placeholder="0.00" onChange={e => setCost(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-black focus:outline-none focus:border-orange-500/50" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-[0.2em]">Delivery Metadata</label>
                      <textarea value={note} placeholder="Supplier details or notes..." onChange={e => setNote(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-orange-500/50 h-28 resize-none text-sm" />
                    </div>
                  </>
                )}
                <button 
                  onClick={addEntry} 
                  className={`w-full py-5 rounded-[1.5rem] font-black text-lg shadow-2xl transition-all active:scale-95 ${modalType === EntryType.READING ? 'bg-violet-600 shadow-violet-500/20' : 'bg-orange-600 shadow-orange-500/20'} text-white`}
                >
                  Authorize Entry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const OilTank: React.FC<{ levelCm: number }> = ({ levelCm }) => {
  const percentage = Math.min(100, Math.max(0, (levelCm / MAX_TANK_HEIGHT_CM) * 100));
  return (
    <div className="relative w-44 h-64 md:w-48 md:h-72">
      <div className="absolute inset-0 bg-green-950/30 border-[8px] border-green-900/50 rounded-[3rem] overflow-hidden flex flex-col justify-end shadow-inner">
        <div className="absolute inset-0 flex flex-col justify-between py-6 px-1 opacity-20 pointer-events-none">
          {[...Array(9)].map((_, i) => <div key={i} className="w-full h-px bg-white/40"></div>)}
        </div>
        <div 
          className="bg-gradient-to-t from-green-600 to-green-400 w-full transition-all duration-1000 ease-in-out relative shadow-[0_-15px_40px_rgba(34,197,94,0.3)]" 
          style={{ height: `${percentage}%` }}
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-white/50 blur-[2px]"></div>
        </div>
      </div>
      <div className="absolute -right-10 inset-y-0 flex flex-col justify-between text-[10px] text-slate-600 font-black py-8">
        <span>100</span><span>80</span><span>60</span><span>40</span><span>20</span><span>0</span>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string, value: string, subValue: string, icon: React.ReactNode, color: 'purple' | 'orange' }> = ({ label, value, subValue, icon, color }) => (
  <div className={`glass-panel p-5 rounded-3xl flex flex-col justify-between transition-transform hover:scale-[1.02] ${color === 'purple' ? 'border-violet-500/10' : 'border-orange-500/10'}`}>
    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-4 ${color === 'purple' ? 'bg-violet-500/10 text-violet-400' : 'bg-orange-500/10 text-orange-400'}`}>{icon}</div>
    <div>
      <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">{label}</p>
      <p className={`text-2xl font-black mt-1 leading-none tracking-tight ${color === 'purple' ? 'text-violet-400' : 'text-orange-400'}`}>{value}</p>
      <p className="text-[10px] text-slate-500 mt-2 font-medium">{subValue}</p>
    </div>
  </div>
);

const HistoryItem: React.FC<{ entry: OilEntry, onDelete: (id: string) => void }> = ({ entry, onDelete }) => (
  <div className="p-5 bg-slate-900/40 border border-slate-800/40 rounded-[1.5rem] group hover:bg-slate-900/60 transition-all border-l-4 overflow-hidden" style={{ borderLeftColor: entry.type === EntryType.READING ? COLORS.purple : COLORS.orange }}>
    <div className="flex justify-between items-start mb-2">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-2xl ${entry.type === EntryType.READING ? 'bg-violet-500/10 text-violet-400' : 'bg-orange-500/10 text-orange-400'}`}>
          {entry.type === EntryType.READING ? <Droplets size={16} /> : <Truck size={16} />}
        </div>
        <div>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{new Date(entry.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          <p className="font-black text-slate-100 text-base mt-0.5">
            {entry.type === EntryType.READING ? `${entry.levelCm}cm reading` : `Delivery of ${entry.liters}L`}
          </p>
        </div>
      </div>
      <button onClick={() => onDelete(entry.id)} className="p-2 text-slate-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10 rounded-lg"><Trash2 size={16} /></button>
    </div>
    {(entry.cost || entry.note) && (
      <div className="mt-4 pt-4 border-t border-slate-800/30 flex flex-col gap-2">
        {entry.cost && <div className="text-orange-400 text-sm font-black flex items-center gap-2"><TrendingUp size={14}/> Total: £{entry.cost.toLocaleString()}</div>}
        {entry.note && <p className="text-xs text-slate-400 italic font-medium leading-relaxed">"{entry.note}"</p>}
      </div>
    )}
  </div>
);

export default App;
