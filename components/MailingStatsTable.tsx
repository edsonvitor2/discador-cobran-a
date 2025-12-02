
import React from 'react';
import { ListStatData } from '../types';
import { Database, Calendar, Phone, CheckCircle, Download, User } from 'lucide-react';
import * as XLSX from 'xlsx';

interface MailingStatsTableProps {
  data: ListStatData[];
}

const MailingStatsTable: React.FC<MailingStatsTableProps> = ({ data }) => {
  
  const handleExport = () => {
    if (data.length === 0) return;

    const exportData = data.map(item => ({
        "ID": item.lista_id,
        "Nome da Lista": item.lista_nome,
        "Data Criação": new Date(item.lista_data).toLocaleDateString('pt-BR'),
        "Quantidade Total": item.lista_quantidade,
        "Total Discado": item.total_discado,
        "Total Atendido": item.total_atendido,
        "Criador": item.usr_nome,
        "Empresa": item.emp_nome
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, "Performance Listas");
    XLSX.writeFile(wb, `Performance_Listas_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  if (data.length === 0) {
    // Se não tiver dados, não renderiza nada ou renderiza aviso discreto. 
    // Como já tem aviso no gráfico, aqui pode ser opcional, mas manteremos consistência.
    return null;
  }

  return (
    <div className="space-y-4 mb-8">
        <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-slate-800">
                <Database className="w-5 h-5 text-primary-600" />
                <h3 className="font-semibold text-lg">Detalhes de Performance por Lista</h3>
            </div>
            <button
                onClick={handleExport}
                className="flex items-center gap-2 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-lg transition-colors"
            >
                <Download className="w-4 h-4" />
                Exportar Excel
            </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
                <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nome da Lista</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Data</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Qtd. Total</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Total Discado</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Total Atendido</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Criador</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
                {data.map((row, index) => (
                <tr key={row.id || index} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900" title={row.lista_nome}>
                            {row.lista_nome.length > 40 ? row.lista_nome.substring(0, 40) + '...' : row.lista_nome}
                        </div>
                        <div className="text-xs text-slate-500">{row.emp_nome}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-slate-500">
                        <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                        {new Date(row.lista_data).toLocaleDateString()}
                    </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900">{row.lista_quantidade.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-blue-600 font-medium">
                        <Phone className="w-4 h-4 mr-1.5" />
                        {row.total_discado.toLocaleString()}
                    </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-green-600 font-medium">
                        <CheckCircle className="w-4 h-4 mr-1.5" />
                        {row.total_atendido.toLocaleString()}
                    </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-slate-600">
                            <User className="w-4 h-4 mr-1.5 text-slate-400" />
                            {row.usr_nome}
                        </div>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
        </div>
    </div>
  );
};

export default MailingStatsTable;
