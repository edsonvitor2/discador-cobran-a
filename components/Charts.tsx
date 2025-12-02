
import React from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Recording, ListStatData } from '../types';

interface ChartsProps {
  data: Recording[];
  listsData?: ListStatData[];
}

const Charts: React.FC<ChartsProps> = ({ data, listsData = [] }) => {
    // Process Data for Charts
    
    // 1. Disposition Counts
    const dispositionCounts = data.reduce((acc, curr) => {
        acc[curr.disposition] = (acc[curr.disposition] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const dispositionTranslation: Record<string, string> = {
        'ANSWERED': 'Atendida',
        'NO ANSWER': 'Não Atendida',
        'BUSY': 'Ocupado',
        'FAILED': 'Falha'
    };

    // Cores específicas solicitadas
    const STATUS_COLORS: Record<string, string> = {
        'Atendida': '#22c55e',     // Green 500
        'Não Atendida': '#ef4444', // Red 500
        'Ocupado': '#f97316',      // Orange 500
        'Falha': '#94a3b8',        // Slate 400
    };
    
    // Fallback de cores para outros status
    const DEFAULT_COLORS = ['#0ea5e9', '#8b5cf6', '#ec4899', '#eab308'];

    const pieData = Object.keys(dispositionCounts).map(key => ({
        name: dispositionTranslation[key] || key,
        value: dispositionCounts[key]
    }));

    // 2. Calls by Date (Simple aggregation by date string)
    const callsByDate = data.reduce((acc, curr) => {
        const date = new Date(curr.calldate).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' });
        acc[date] = (acc[date] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Convert to array and take last 10 distinct days
    const barData = Object.keys(callsByDate).map(key => ({
        date: key,
        chamadas: callsByDate[key]
    })).slice(0, 10); 

    // 3. Process Lists Data for the new chart
    const listsChartData = listsData.map(item => ({
        name: item.lista_nome,
        Quantidade: item.lista_quantidade,
        Discado: item.total_discado
    }));

  return (
    <div className="space-y-6 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Disposition Distribution */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Distribuição de Status</h3>
            <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                >
                    {pieData.map((entry, index) => (
                        <Cell 
                            key={`cell-${index}`} 
                            fill={STATUS_COLORS[entry.name] || DEFAULT_COLORS[index % DEFAULT_COLORS.length]} 
                        />
                    ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
            </ResponsiveContainer>
            </div>
        </div>

        {/* Volume by Date */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Volume Recente</h3>
            <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                data={barData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                <Tooltip 
                    cursor={{fill: '#f1f5f9'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="chamadas" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
            </ResponsiveContainer>
            </div>
        </div>
        </div>

        {/* New Chart: Lists Stats */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Performance por Lista (Quantidade vs Discado)</h3>
            {listsChartData.length > 0 ? (
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={listsChartData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis 
                                dataKey="name" 
                                stroke="#64748b" 
                                fontSize={12} 
                                tickLine={false}
                                tickFormatter={(val) => val.length > 20 ? `${val.substring(0, 20)}...` : val} 
                            />
                            <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                            <Tooltip 
                                cursor={{fill: '#f1f5f9'}}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend verticalAlign="top" height={36} />
                            <Bar dataKey="Quantidade" fill="#6366f1" radius={[4, 4, 0, 0]} name="Total na Lista" />
                            <Bar dataKey="Discado" fill="#ec4899" radius={[4, 4, 0, 0]} name="Total Discado" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="h-80 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-lg">
                    <p className="font-medium">Sem dados de listas para o período selecionado</p>
                    <p className="text-sm mt-1">Tente ajustar os filtros de data</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default Charts;
