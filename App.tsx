import React, { useState, useEffect, useMemo } from 'react';
import { 
  Droplets, 
  Truck, 
  TrendingUp, 
  History, 
  Plus, 
  X, 
  Trash2, 
  Zap, 
  Calendar, 
  AlertCircle 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { OilEntry, EntryType, UsageStats } from './types';
import { LITERS_PER_CM, STORAGE_KEY } from './constants';
import { getOilInsights } from './geminiService';

const MAX_TANK_HEIGHT_CM = 120; // Default standard tank height

const App: React.FC = () => {
  const [entries, setEntries] = useState<OilEntry[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<EntryType>(EntryType.READING);
  const [insights, setInsights] = useState<string>('');
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [levelCm, setLevelCm] = useState<string>('');
  const [liters, setLiters] = useState<string>('');
  const [cost, setCost] = useState<string>('');
  const [note, setNote] = useState<string>('');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setEntries(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    if (entries.length >= 2) generateInsights();
  }, [entries]);

  const generateInsights = async () => {
    setIsLoadingInsights(true);
    try {
      const text = await getOilInsights(entries);
      setInsights(text);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingInsights(false);
    }
  };

  const handleAddEntry = () => {
    const newEntry: OilEntry = {
      id: crypto.randomUUID(),
      date,
      type: modalType,
      levelCm: modalType === EntryType.READING ? parseFloat(levelCm) : undefined,
      liters: modalType === EntryType.READING ? parseFloat(levelCm) * LITERS_PER_CM : parseFloat(liters),
      cost: modalType === EntryType.DELIVERY ? parseFloat(cost) : undefined,
      note: modalType === EntryType.DELIVERY ? note : undefined,
    };

    const updated = [...entries, newEntry].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setEntries(updated);
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setLevelCm('');
    setLiters('');
    setCost('');
    setNote('');
  };

  const stats = useMemo<UsageStats>(() => {
    const readings = entries.filter(e => e.type === EntryType.READING);
    const deliveries = entries.filter(e => e.type === EntryType.DELIVERY);
    
    const totalSpent = deliveries.reduce((sum, e) => sum + (e.cost || 0), 0);
    const latestReading = [...readings].reverse()[0];
    
    let avgDaily = 0;
    if (readings.length >= 2) {
      const first = readings[0];
      const last = readings[readings.length - 1];
      const days = (new Date(last.date).getTime() - new Date(first.date).getTime()) / (1000 * 3600 * 24);
      
      const deliveriesInWindow = deliveries.filter(d => 
        new Date(d.date) >= new Date(first.date) && new Date(d.date) <= new Date(last.date)
      ).reduce((sum, d) => sum + (d.liters || 0), 0);

      const totalConsumed = (first.liters || 0) + deliveriesInWindow - (last.liters || 0);
      avgDaily = days > 0 ? totalConsumed / days : 0;
    }

    return {
      totalSpent,
      avgDailyUsage: avgDaily,
      currentLevelLiters: latestReading?.liters || 0,
      estimatedDaysRemaining: avgDaily > 0 ? (latestReading?.liters || 0) / avgDaily : 0
    };
  }, [entries]);

  const chartData = useMemo(() => {
    return entries.filter(e => e.type === EntryType.READING).map(e => ({
      date: new Date(e.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
      liters: e.liters,
      cm: e.levelCm
    }));
  }, [entries]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 lg:p-12 selection:bg-purple-500/30">
      {/* Header */}
      <header className="max-w-7xl mx-auto mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-br from-purple-400 via-violet-400 to-orange-400 bg-clip-text text-transparent">
            OilTrack Pro
          </h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.25em]">Heating Management System</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={() => { setModalType(EntryType.READING); setIsModalOpen(true); }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-bold py-3 px-6 rounded-2xl transition-all shadow-lg shadow-violet-900/20 active:scale-95"
          >
            <Droplets size={18} /> Log Reading
          </button>
          <button 
            onClick={() => { setModalType(EntryType.DELIVERY); setIsModalOpen(true); }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 px-6 rounded-2xl transition-all shadow-lg shadow-orange-900/20 active:scale-95"
          >
            <Truck size={18} /> New Delivery
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Stats & Tank */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="In Tank" value={`${stats.currentLevelLiters.toFixed(0)}L`} sub={`${(stats.currentLevelLiters / LITERS_PER_CM).toFixed(1)}cm`} color="purple" icon={<Droplets size={20}/>} />
            <StatCard label="Spend" value={`£${stats.totalSpent.toLocaleString()}`} sub="Total lifetime" color="orange" icon={<TrendingUp size={20}/>} />
            <StatCard label="Daily Avg" value={`${stats.avgDailyUsage.toFixed(1)}L`} sub="Estimated" color="purple" icon={<Zap size={20}/>} />
            <StatCard label="Longevity" value={stats.estimatedDaysRemaining > 0 ? `${Math.round(stats.estimatedDaysRemaining)}d` : 'N/A'} sub="Until empty" color="orange" icon={<Calendar size={20}/>} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Visual Tank */}
            <div className="md:col-span-4 glass rounded-[2.5rem] p-8 flex flex-col items-center justify-center purple-glow">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-8">Capacity State</span>
              <TankVisual levelCm={entries.length > 0 ? (stats.currentLevelLiters / LITERS_PER_CM) : 0} />
              <div className="mt-8 text-center">
                <p className="text-3xl font-black text-white">{entries.length > 0 ? (stats.currentLevelLiters / LITERS_PER_CM).toFixed(1) : '0'}<span className="text-sm font-medium text-slate-500 ml-1">cm</span></p>
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-1">Height Index</p>
              </div>
            </div>

            {/* Consumption Chart */}
            <div className="md:col-span-8 glass rounded-[2.5rem] p-8 purple-glow overflow-hidden">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-violet-400">12-Month Level Trend</h3>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="usageGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', fontSize: '11px' }}
                      itemStyle={{ color: '#8b5cf6', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="liters" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#usageGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* AI Insights Section */}
          <div className="glass rounded-[2.5rem] p-8 orange-glow border-orange-500/10">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-400 mb-4 flex items-center gap-2">
              <Zap size={14} /> AI Analysis Engine
            </h3>
            <div className="text-slate-300 text-sm leading-relaxed font-medium min-h-[40px]">
              {isLoadingInsights ? (
                <div className="flex gap-1 items-center animate-pulse text-slate-500">
                  <div className="w-1 h-1 bg-orange-500 rounded-full animate-bounce"></div>
                  <div className="w-1 h-1 bg-orange-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1 h-1 bg-orange-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  <span className="ml-2 text-[10px] uppercase font-bold tracking-widest">Generating predictions...</span>
                </div>
              ) : (
                insights || "Log at least two readings to unlock usage forecasting and delivery reminders."
              )}
            </div>
          </div>
        </div>

        {/* Right Column: History */}
        <div className="lg:col-span-4 space-y-8">
          <div className="glass rounded-[2.5rem] h-full flex flex-col max-h-[850px]">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                <History size={14} /> Transaction Log
              </h3>
              <span className="text-[10px] bg-slate-800 text-orange-400 px-3 py-1 rounded-full font-bold">{entries.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
              {entries.length === 0 ? (
                <div className="text-center py-20 text-slate-600">
                  <AlertCircle size={32} className="mx-auto mb-4 opacity-20" />
                  <p className="text-xs uppercase tracking-widest font-bold">No data points yet</p>
                </div>
              ) : (
                [...entries].reverse().map(entry => (
                  <HistoryItem 
                    key={entry.id} 
                    entry={entry} 
                    onDelete={(id) => setEntries(prev => prev.filter(e => e.id !== id))} 
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-md bg-slate-900 border-t md:border border-slate-800 rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-500">
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-black flex items-center gap-3">
                  {modalType === EntryType.READING ? <Droplets className="text-violet-500" /> : <Truck className="text-orange-500" />}
                  {modalType === EntryType.READING ? 'Log Gauge Level' : 'Oil Delivery'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white p-2 transition-colors"><X size={24} /></button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Event Date</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white focus:outline-none focus:border-violet-500/50 transition-colors" />
                </div>

                {modalType === EntryType.READING ? (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Dipstick Level (cm)</label>
                    <div className="relative">
                      <input type="number" placeholder="0.0" value={levelCm} onChange={e => setLevelCm(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-6 text-4xl font-black focus:outline-none focus:border-violet-500/50" />
                      <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-700">CM</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Volume (L)</label>
                        <input type="number" placeholder="500" value={liters} onChange={e => setLiters(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 font-black focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Cost (£)</label>
                        <input type="number" placeholder="0.00" value={cost} onChange={e => setCost(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 font-black focus:outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Delivery Notes</label>
                      <textarea placeholder="Vendor name, batch quality, etc..." value={note} onChange={e => setNote(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm h-24 resize-none focus:outline-none" />
                    </div>
                  </>
                )}

                <button 
                  onClick={handleAddEntry}
                  className={`w-full py-5 rounded-[1.5rem] font-black text-lg transition-all active:scale-95 shadow-xl ${modalType === EntryType.READING ? 'bg-violet-600 shadow-violet-900/40' : 'bg-orange-600 shadow-orange-900/40'} text-white`}
                >
                  Save Entry
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
const StatCard = ({ label, value, sub, color, icon }: any) => (
  <div className={`glass p-5 rounded-3xl ${color === 'purple' ? 'border-violet-500/10' : 'border-orange-500/10'}`}>
    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-4 ${color === 'purple' ? 'bg-violet-500/10 text-violet-400' : 'bg-orange-500/10 text-orange-400'}`}>{icon}</div>
    <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{label}</p>
    <p className={`text-2xl font-black mt-1 ${color === 'purple' ? 'text-violet-400' : 'text-orange-400'}`}>{value}</p>
    <p className="text-[9px] font-bold text-slate-600 uppercase mt-1 tracking-widest">{sub}</p>
  </div>
);

const TankVisual = ({ levelCm }: { levelCm: number }) => {
  const fill = Math.min(100, Math.max(0, (levelCm / MAX_TANK_HEIGHT_CM) * 100));
  return (
    <div className="relative w-40 h-64">
      <div className="absolute inset-0 bg-slate-900 border-[8px] border-slate-800 rounded-[3rem] overflow-hidden flex flex-col justify-end shadow-inner">
        <div className="absolute inset-0 pointer-events-none opacity-20 flex flex-col justify-between py-6">
          {[...Array(9)].map((_, i) => <div key={i} className="w-full h-px bg-white/30 mx-auto"></div>)}
        </div>
        <div 
          className="bg-gradient-to-t from-green-600 via-green-500 to-green-400 w-full transition-all duration-1000 ease-in-out relative" 
          style={{ height: `${fill}%` }}
        >
          <div className="absolute top-0 left-0 w-full h-1.5 bg-white/40 blur-[2px]"></div>
        </div>
      </div>
      <div className="absolute -right-8 inset-y-0 flex flex-col justify-between text-[8px] font-black text-slate-700 py-8">
        <span>120</span><span>90</span><span>60</span><span>30</span><span>0</span>
      </div>
    </div>
  );
};

const HistoryItem = ({ entry, onDelete }: { entry: OilEntry, onDelete: (id: string) => void }) => (
  <div className={`p-5 rounded-[1.5rem] bg-slate-900/50 border border-slate-800/50 group transition-all hover:bg-slate-900 border-l-4 ${entry.type === EntryType.READING ? 'border-l-violet-500' : 'border-l-orange-500'}`}>
    <div className="flex justify-between items-start mb-2">
      <div className="flex gap-4 items-center">
        <div className={`p-3 rounded-2xl ${entry.type === EntryType.READING ? 'bg-violet-500/10 text-violet-400' : 'bg-orange-500/10 text-orange-400'}`}>
          {entry.type === EntryType.READING ? <Droplets size={16}/> : <Truck size={16}/>}
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-500 uppercase">{new Date(entry.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
          <p className="text-sm font-black text-slate-200 mt-0.5">
            {entry.type === EntryType.READING ? `${entry.levelCm}cm Level` : `${entry.liters}L Delivered`}
          </p>
        </div>
      </div>
      <button onClick={() => onDelete(entry.id)} className="p-2 text-slate-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
    </div>
    {(entry.cost || entry.note) && (
      <div className="mt-4 pt-4 border-t border-slate-800/50 flex flex-col gap-2">
        {entry.cost && <p className="text-xs font-black text-orange-400">Total Spent: £{entry.cost.toLocaleString()}</p>}
        {entry.note && <p className="text-xs text-slate-500 italic font-medium leading-relaxed">"{entry.note}"</p>}
      </div>
    )}
  </div>
);

export default App;
