
import React from 'react';
import { FilterState, DispositionType } from '../types';
import { Filter, Calendar, List, Phone, X, Search, Hash } from 'lucide-react';

interface FiltersProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  onApply: () => void;
  isLoading: boolean;
  pageSize: number;
  setPageSize: React.Dispatch<React.SetStateAction<number>>;
}

const Filters: React.FC<FiltersProps> = ({ filters, setFilters, onApply, isLoading, pageSize, setPageSize }) => {
  const handleChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 })); // Reset to page 1 on filter change
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-6 text-slate-800 border-b border-slate-100 pb-4">
        <Filter className="w-5 h-5 text-primary-600" />
        <h2 className="font-semibold text-lg">Filtros de Busca</h2>
      </div>

      <div className="space-y-5 flex-1 overflow-y-auto">
        
        {/* Date Range */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" /> Período
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
                <label className="text-xs text-slate-500 mb-1 block">Início</label>
                <input
                    type="date"
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                    value={filters.start_date}
                    onChange={(e) => handleChange('start_date', e.target.value)}
                />
            </div>
            <div>
                <label className="text-xs text-slate-500 mb-1 block">Fim</label>
                <input
                    type="date"
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                    value={filters.end_date}
                    onChange={(e) => handleChange('end_date', e.target.value)}
                />
            </div>
          </div>
        </div>

        {/* Sem Lista Checkbox - Important as it changes other inputs */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
           <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 border-gray-300"
              checked={filters.sem_lista}
              onChange={(e) => handleChange('sem_lista', e.target.checked)}
            />
            <span className="text-sm font-medium text-slate-700">Apenas Sem Lista</span>
          </label>
          <p className="text-xs text-slate-500 mt-1 pl-7">
            Exibe registros onde lista_nome é nulo ou vazio.
          </p>
        </div>

        {/* List Name - Disabled if Sem Lista is checked */}
        <div className={`space-y-2 transition-opacity ${filters.sem_lista ? 'opacity-50 pointer-events-none' : ''}`}>
          <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <List className="w-4 h-4 text-slate-400" /> Nome da Lista / Base
          </label>
          <input
            type="text"
            placeholder="Ex: Mailing_SP_..."
            className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            value={filters.lista_nome}
            onChange={(e) => handleChange('lista_nome', e.target.value)}
            disabled={filters.sem_lista}
          />
        </div>

        {/* Disposition */}
        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <Phone className="w-4 h-4 text-slate-400" /> Status da Chamada
        </label>
        <select
            className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
            value={filters.disposition}
            onChange={(e) => handleChange('disposition', e.target.value)}
        >
            <option value={DispositionType.ALL}>Todos os Status</option>
            <option value={DispositionType.ANSWERED}>Atendidas (ANSWERED)</option>
            <option value={DispositionType.NO_ANSWER}>Não Atendidas (NO ANSWER)</option>
            <option value={DispositionType.BUSY}>Ocupado (BUSY)</option>
            <option value={DispositionType.FAILED}>Falha (FAILED)</option>
        </select>
        </div>

        {/* Page Size */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <Hash className="w-4 h-4 text-slate-400" /> Itens por página
          </label>
          <select
            className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            <option value={15}>15 itens</option>
            <option value={50}>50 itens</option>
            <option value={100}>100 itens</option>
            <option value={500}>500 itens</option>
            <option value={1000}>1000 itens</option>
          </select>
        </div>
      </div>

      <div className="pt-4 mt-auto border-t border-slate-100 flex flex-col gap-2">
        <button
          onClick={onApply}
          disabled={isLoading}
          className="w-full flex justify-center items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors focus:ring-4 focus:ring-primary-100 disabled:opacity-70 disabled:cursor-not-allowed"
        >
            {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            ) : (
                <Search className="w-4 h-4" />
            )}
            Filtrar Resultados
        </button>
        
        <button
            onClick={() => {
                setFilters({
                    start_date: '',
                    end_date: '',
                    lista_nome: '',
                    disposition: '',
                    sem_lista: false,
                    page: 1,
                    limit: 15
                });
            }}
            className="w-full flex justify-center items-center gap-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
        >
            <X className="w-4 h-4" />
            Limpar Filtros
        </button>
      </div>
    </div>
  );
};

export default Filters;
