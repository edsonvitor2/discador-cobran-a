
import React from 'react';
import { Recording, PaginationMeta } from '../types';
import { Clock, User, BarChart3, Download, Loader2, PhoneOutgoing } from 'lucide-react';

interface RecordingsTableProps {
  data: Recording[];
  pagination?: PaginationMeta;
  onPageChange: (newPage: number) => void;
  isLoading: boolean;
  onExport?: () => void;
  isExporting?: boolean;
}

const getDispositionBadge = (status: string) => {
  switch (status) {
    case 'ANSWERED':
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Atendida</span>;
    case 'NO ANSWER':
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Não Atendida</span>;
    case 'BUSY':
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Ocupado</span>;
    case 'FAILED':
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">Falha</span>;
    default:
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
  }
};

const RecordingsTable: React.FC<RecordingsTableProps> = ({ 
  data, 
  pagination, 
  onPageChange, 
  isLoading,
  onExport,
  isExporting = false
}) => {

  // Conteúdo da tabela (Loading, Empty ou Data)
  const renderContent = () => {
    if (isLoading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center min-h-[400px] flex items-center justify-center">
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mb-4"></div>
                    <p className="text-slate-500">Carregando dados...</p>
                </div>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center min-h-[400px] flex flex-col items-center justify-center">
                 <div className="bg-slate-50 p-4 rounded-full mb-4">
                    <PhoneOutgoing className="h-8 w-8 text-slate-400" />
                 </div>
                 <h3 className="text-lg font-medium text-slate-900">Nenhum registro encontrado</h3>
                 <p className="text-slate-500 mt-1 max-w-sm">Tente ajustar seus filtros de busca para encontrar o que procura.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Data / Hora</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Origem &rarr; Destino</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Lista / Campanha</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Duração</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {data.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">
                        {new Date(row.calldate).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(row.calldate).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm text-slate-900">{row.src}</div>
                        <span className="mx-2 text-slate-400">&rarr;</span>
                        <div className="text-sm font-medium text-slate-900">{row.dst}</div>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center mt-1">
                        <User className="w-3 h-3 mr-1" /> {row.usr_nome || 'Sistema'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        {row.lista_nome ? (
                            <div className="text-sm text-slate-900">{row.lista_nome}</div>
                        ) : (
                            <span className="text-xs italic text-slate-400">Sem lista</span>
                        )}
                         <div className="text-xs text-slate-500">{row.cml_nome}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-slate-600">
                        <Clock className="w-4 h-4 mr-1.5 text-slate-400" />
                        {row.duration}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Falado: {row.billsec}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getDispositionBadge(row.disposition)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Footer */}
          {pagination && (
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm text-slate-700">
                            Página <span className="font-medium">{pagination.paginaAtual}</span> de <span className="font-medium">{pagination.totalPages}</span>
                        </p>
                    </div>
                    <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                            <button
                                onClick={() => onPageChange(pagination.paginaAtual - 1)}
                                disabled={!pagination.temPaginaAnterior}
                                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Anterior
                            </button>
                            <button
                                onClick={() => onPageChange(pagination.paginaAtual + 1)}
                                disabled={!pagination.temProximaPagina}
                                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Próxima
                            </button>
                        </nav>
                    </div>
                </div>
            </div>
          )}
        </div>
    );
  };

  return (
    <div className="space-y-4 mb-4" id="recordings-table">
        <div className="flex items-center justify-between px-1 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-2 text-slate-800">
                <BarChart3 className="w-5 h-5 text-primary-600" />
                <h3 className="font-semibold text-lg">Registros Detalhados</h3>
            </div>
            {onExport && (
                <button
                    onClick={onExport}
                    disabled={isExporting || isLoading}
                    className="flex items-center gap-2 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isExporting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Download className="w-4 h-4" />
                    )}
                    Exportar Tabela
                </button>
            )}
        </div>

        {renderContent()}
    </div>
  );
};

export default RecordingsTable;
