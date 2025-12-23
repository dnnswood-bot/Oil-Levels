
import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Droplets, Truck, History, Sparkles, TrendingUp, Plus, X, Trash2 } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { OilEntry, EntryType, UsageStats } from './types';
import { LITERS_PER_CM, STORAGE_KEY, COLORS } from './constants';
import { getOilInsights } from './services/geminiService';

const MAX_TANK_HEIGHT_CM = 100;

const App: React.FC = () => {
  const [entries, setEntries] = useState<OilEntry[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<EntryType>(EntryType.READING);
  const [insights, setInsights] = useState<string>('Analyzing your consumption data...');
  const [isGenerating, setIsGenerating] = useState(false);

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [levelCm, setLevelCm] = useState<string>('');
  const [liters, setLiters] = useState<string>('');
  const [cost, setCost] = useState<string>('');
  const [note, setNote] = useState<string>('');

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setEntries(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    if (entries.length > 1) {
      handleGetInsights();
    }
  }, [entries]);

  const handleGetInsights = async () => {
    setIsGenerating(true);
    const result = await getOilInsights(entries);
    setInsights(result || "Add more data to see trends.");
    setIsGenerating(false);
  };

  const addEntry = () => {
    const newEntry: OilEntry = {
      id: crypto.randomUUID(),
      date,
      type: modalType,
      levelCm: modalType === EntryType.READING ? parseFloat(levelCm) : undefined,
      liters: modalType === EntryType.READING ? parseFloat(levelCm) * LITERS_PER_CM : parseFloat(liters),
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

  // Calculations
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
    <div className="min-h-screen pb-10 px-4 md:px-8">
      {/* Header */}
      <header className="py-6 flex flex-col md:flex-row justify-between items-start md:items-center max-w-7xl mx-auto gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-violet-500 to-orange-500 bg-clip-text text-transparent">
            OilTrack Pro
          </h1>
          <p className="text-purple-400 text-xs mt-1 uppercase tracking-wider font-semibold">UK Heating Management</p>
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
        
        {/* Left Column: Stats & Tank Graphic */}
        <div className="lg:col-span-8 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
             {/* Oil Tank Visualizer */}
             <div className="md:col-span-5 glass-panel p-6 rounded-2xl flex flex-col items-center justify-center purple-glow">
                <h3 className="text-[10px] font-bold text-slate-500 mb-6 uppercase tracking-[0.2em] text-center">Live Tank Volume</h3>
                <OilTank levelCm={currentLevelCm} />
                <div className="mt-6 text-center">
                  <span className="text-3xl font-black text-green-400 tracking-tighter">{currentLevelCm}<span className="text-sm ml-1 font-normal text-slate-500">cm</span></span>
                  <p className="text-[10px] text-slate-500 uppercase font-bold mt-1 tracking-widest">Vertical Height</p>
                </div>
             </div>

             {/* Stats Summary */}
             <div className="md:col-span-7 flex flex-col gap-4">
               <div className="grid grid-cols-2 gap-3 h-full">
                  <StatCard 
                    label="Current" 
                    value={`${stats.currentLevelLiters.toFixed(0)}L`} 
                    subValue={`${(stats.currentLevelLiters / LITERS_PER_CM).toFixed(1)} cm`}
                    icon={<Droplets size={18} className="text-orange-500" />}
                    color="purple"
                  />
                  <StatCard 
                    label="Total Cost" 
                    value={`£${stats.totalSpent.toLocaleString()}`} 
                    subValue="All deliveries"
                    icon={<TrendingUp size={18} className="text-violet-500" />}
                    color="orange"
                  />
                  <StatCard 
                    label="Daily Avg" 
                    value={`${stats.avgDailyUsage.toFixed(1)}L`} 
                    subValue="Est. rate"
                    icon={<History size={18} className="text-orange-500" />}
                    color="purple"
                  />
                  <StatCard 
                    label="Heat Days" 
                    value={`${Math.round(stats.estimatedDaysRemaining)}`} 
                    subValue="Remaining"
                    icon={<Sparkles size={18} className="text-violet-500" />}
                    color="orange"
                  />
               </div>
             </div>
          </div>

          {/* AI Insights */}
          <div className="glass-panel p-5 rounded-2xl orange-glow relative overflow-hidden">
            <h2 className="text-xs font-bold flex items-center gap-2 mb-3 text-orange-400 uppercase tracking-widest">
              <Sparkles size={14} />
              Consumption Intelligence
            </h2>
            <div className="text-slate-300 text-sm leading-relaxed">
              {isGenerating ? (
                <div className="flex items-center gap-3 animate-pulse text-xs text-slate-500">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce delay-75"></div>
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce delay-150"></div>
                  </div>
                  Running predictive analysis...
                </div>
              ) : (
                <span className="text-slate-200 text-xs md:text-sm">{insights}</span>
              )}
            </div>
          </div>

          {/* Main Chart */}
          <div className="glass-panel p-6 rounded-2xl purple-glow">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-violet-400">
                <LayoutDashboard size={16} />
                Usage Trend
              </h2>
            </div>
            <div className="h-[200px] md:h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorLiters" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.purple} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={COLORS.purple} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '10px' }}
                    itemStyle={{ color: COLORS.purple }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="liters" 
                    stroke={COLORS.purple} 
                    fillOpacity={1} 
                    fill="url(#colorLiters)" 
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column: History */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="glass-panel rounded-2xl flex-1 flex flex-col min-h-[400px]">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-xs font-bold flex items-center gap-2 uppercase tracking-widest text-violet-400">
                <History size={16} />
                Audit Log
              </h2>
              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full text-orange-400 font-bold">{entries.length}</span>
            </div>
            <div className="overflow-y-auto max-h-[500px] lg:max-h-none flex-1 p-3 space-y-3 custom-scrollbar">
              {entries.length === 0 ? (
                <div className="text-center py-20 text-slate-600">
                  <p className="text-sm">No activity recorded</p>
                </div>
              ) : (
                [...entries].reverse().map(entry => (
                  <HistoryItem key={entry.id} entry={entry} onDelete={deleteEntry} />
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-md bg-slate-900 border-t md:border border-slate-800 rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden pb-10 md:pb-0 animate-in slide-in-from-bottom duration-300">
            <div className="p-6">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-lg font-black flex items-center gap-3 tracking-tight">
                  {modalType === EntryType.READING ? <Droplets className="text-violet-500" /> : <Truck className="text-orange-500" />}
                  {modalType === EntryType.READING ? 'Log Level' : 'New Delivery'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="bg-slate-800 p-2 rounded-full text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Transaction Date</label>
                  <input 
                    type="date" 
                    value={date} 
                    onChange={e => setDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 appearance-none"
                  />
                </div>

                {modalType === EntryType.READING ? (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Dip Level (cm)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        inputMode="decimal"
                        value={levelCm} 
                        placeholder="0"
                        max={100}
                        onChange={e => setLevelCm(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3.5 text-3xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">CM</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Liters</label>
                        <input 
                          type="number" 
                          inputMode="numeric"
                          value={liters} 
                          placeholder="500"
                          onChange={e => setLiters(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3.5 text-white font-bold focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Total £</label>
                        <input 
                          type="number" 
                          inputMode="decimal"
                          value={cost} 
                          placeholder="0.00"
                          onChange={e => setCost(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3.5 text-white font-bold focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Delivery Note</label>
                      <textarea 
                        value={note} 
                        placeholder="Supplier name or delivery notes..."
                        onChange={e => setNote(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none h-24 resize-none"
                      />
                    </div>
                  </>
                )}

                <button 
                  onClick={addEntry}
                  disabled={modalType === EntryType.READING ? !levelCm : !liters}
                  className={`w-full py-4 rounded-2xl font-black text-lg transition-all shadow-xl active:scale-95 disabled:opacity-30 ${
                    modalType === EntryType.READING 
                    ? 'bg-violet-600 shadow-violet-500/20' 
                    : 'bg-orange-600 shadow-orange-500/20'
                  }`}
                >
                  Confirm & Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-components
const OilTank: React.FC<{ levelCm: number }> = ({ levelCm }) => {
  const percentage = Math.min(100, Math.max(0, (levelCm / MAX_TANK_HEIGHT_CM) * 100));
  
  return (
    <div className="relative w-36 h-56 md:w-40 md:h-64">
      {/* Tank Body */}
      <div className="absolute inset-0 bg-green-950 border-[6px] border-green-900 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col justify-end">
        {/* The Ribs */}
        <div className="absolute inset-0 flex flex-col justify-evenly opacity-10 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-full h-px bg-white"></div>
          ))}
        </div>

        {/* Oil Level */}
        <div 
          className="bg-gradient-to-t from-green-600 to-green-400 w-full transition-all duration-1000 ease-out relative shadow-[0_-10px_30px_rgba(34,197,94,0.4)]"
          style={{ height: `${percentage}%` }}
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-white/30 blur-[2px]"></div>
        </div>
      </div>

      {/* Accessories */}
      <div className="absolute -top-3 left-1/4 w-10 h-5 bg-green-900 rounded-t-lg border-green-800"></div>
      <div className="absolute -top-2 right-1/4 w-6 h-4 bg-green-900 rounded-full border border-green-800"></div>

      {/* Legs */}
      <div className="absolute -bottom-3 left-8 w-4 h-6 bg-slate-900 rounded-b-md"></div>
      <div className="absolute -bottom-3 right-8 w-4 h-6 bg-slate-900 rounded-b-md"></div>

      {/* Ruler */}
      <div className="absolute -right-8 inset-y-0 flex flex-col justify-between text-[8px] text-slate-600 font-black py-4">
        <span>100</span>
        <span>75</span>
        <span>50</span>
        <span>25</span>
        <span>0</span>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string, value: string, subValue: string, icon: React.ReactNode, color: 'purple' | 'orange' }> = ({ label, value, subValue, icon, color }) => {
  return (
    <div className={`glass-panel p-3.5 rounded-2xl flex flex-col justify-between ${color === 'purple' ? 'border-violet-500/20' : 'border-orange-500/20'}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${color === 'purple' ? 'bg-violet-500/10 text-violet-400' : 'bg-orange-500/10 text-orange-400'}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{label}</p>
        <p className={`text-xl font-black mt-0.5 leading-tight ${color === 'purple' ? 'text-violet-400' : 'text-orange-400'}`}>{value}</p>
        <p className="text-[9px] text-slate-500 mt-1 truncate">{subValue}</p>
      </div>
    </div>
  );
};

const HistoryItem: React.FC<{ entry: OilEntry, onDelete: (id: string) => void }> = ({ entry, onDelete }) => {
  const isReading = entry.type === EntryType.READING;
  
  return (
    <div className="p-4 bg-slate-900/40 border border-slate-800/50 rounded-2xl group active:scale-[0.98] transition-all">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isReading ? 'bg-violet-500/10' : 'bg-orange-500/10'}`}>
            {isReading ? <Droplets size={14} className="text-violet-400" /> : <Truck size={14} className="text-orange-400" />}
          </div>
          <div>
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">
              {new Date(entry.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </p>
            <p className="font-bold text-slate-200 text-sm">
              {isReading ? `${entry.levelCm}cm` : `${entry.liters}L Delivered`}
            </p>
          </div>
        </div>
        <button 
          onClick={() => onDelete(entry.id)}
          className="p-2 text-slate-700 hover:text-red-500 md:opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 size={14} />
        </button>
      </div>
      {(entry.cost || entry.note) && (
        <div className="mt-3 pt-3 border-t border-slate-800/50">
          {entry.cost && (
            <div className="flex items-center gap-1.5 text-orange-400 text-xs font-black mb-1">
              <TrendingUp size={12} />
              £{entry.cost.toLocaleString()}
            </div>
          )}
          {entry.note && (
            <p className="text-[11px] text-slate-400 leading-relaxed font-medium italic">
              "{entry.note}"
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
