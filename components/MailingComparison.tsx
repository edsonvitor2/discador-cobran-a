
import React, { useState, useEffect } from 'react';
import { fetchMailingsList, fetchCompatibleData } from '../services/api';
import { Search, Calendar, Database, Loader2, CheckSquare, Square, FileSpreadsheet, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { CompatibleData } from '../types';

const MailingComparison: React.FC = () => {
    const [mailings, setMailings] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedMailings, setSelectedMailings] = useState<Set<string>>(new Set());
    
    // Estados para exportação
    const [isExporting, setIsExporting] = useState(false);
    const [exportStatus, setExportStatus] = useState<string>("");
    
    // Filtros locais da tela de comparação
    const [filterName, setFilterName] = useState('');
    const [filterDate, setFilterDate] = useState('');

    const loadMailings = async () => {
        setLoading(true);
        try {
            const response = await fetchMailingsList(filterName, filterDate);
            if (response.success && Array.isArray(response.mailings)) {
                setMailings(response.mailings);
            } else {
                setMailings([]);
            }
        } catch (error) {
            console.error(error);
            setMailings([]);
        } finally {
            setLoading(false);
        }
    };

    // Carregar ao montar e ao mudar filtros (com debounce simples ou botão)
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            loadMailings();
        }, 500); // Debounce de 500ms
        return () => clearTimeout(timeoutId);
    }, [filterName, filterDate]);

    const toggleSelection = (name: string) => {
        const newSet = new Set(selectedMailings);
        if (newSet.has(name)) {
            newSet.delete(name);
        } else {
            newSet.add(name);
        }
        setSelectedMailings(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedMailings.size === mailings.length && mailings.length > 0) {
            setSelectedMailings(new Set());
        } else {
            setSelectedMailings(new Set(mailings));
        }
    };

    const handleCompareAndExport = async () => {
        if (selectedMailings.size === 0) return;

        setIsExporting(true);
        setExportStatus("Iniciando busca...");
        
        let allData: CompatibleData[] = [];
        let currentPage = 1;
        let totalPages = 1;
        const limit = 5000; // Máximo permitido pelo backend

        try {
            // Loop para buscar TODAS as páginas
            do {
                setExportStatus(`Baixando página ${currentPage}...`);
                
                const response = await fetchCompatibleData(
                    Array.from(selectedMailings),
                    currentPage,
                    limit
                );

                if (response.dados && response.dados.length > 0) {
                    allData = [...allData, ...response.dados];
                    totalPages = response.totalPages;
                    currentPage++;
                } else {
                    break; // Sem mais dados
                }

                // Pausa rápida para não sobrecarregar
                await new Promise(r => setTimeout(r, 100));

            } while (currentPage <= totalPages);

            if (allData.length === 0) {
                alert("Nenhum dado compatível encontrado para os mailings selecionados.");
                setExportStatus("");
                setIsExporting(false);
                return;
            }

            setExportStatus(`Formatando ${allData.length} registros...`);

            // --- MAPEAMENTO DE COLUNAS PERSONALIZADO ---
            const excelData = allData.map(row => ({
                "TELEFONE": row.telefone1 || "",
                "NOME": row.nome || "",
                "DATA_NASCIMENTO": "", // Campo vazio conforme solicitado
                "COD_CLI": "",        // Campo vazio conforme solicitado
                "CPF": row.cpf || "",
                "EXTRA_1": "",
                "EXTRA_2": "",
                "EXTRA_3": row.nome_malling || "", // Nome do Mailing aqui
                "EXTRA_DATA": "",
                "CEP": row.cep || "",
                "BAIRRO": row.bairro || "",
                "LOGRADOUR": row.endereco || "",
                "COMPLEMENTO": row.numero || "", // Colocando número no complemento
                "CIDADE": row.cidade || "",
                "UF": row.uf || ""
            }));

            setExportStatus(`Gerando Excel...`);
            
            // Gerar Excel
            const ws = XLSX.utils.json_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Compatíveis");
            
            const fileName = `Relatorio_Compativel_CEPs_${new Date().toISOString().slice(0,10)}.xlsx`;
            XLSX.writeFile(wb, fileName);

            setExportStatus("Concluído!");
            setTimeout(() => setExportStatus(""), 3000);

        } catch (error: any) {
            console.error("Erro na exportação:", error);
            alert(`Erro ao exportar: ${error.message}`);
            setExportStatus("Erro na exportação");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="animate-in fade-in duration-500 pb-20">
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="bg-purple-100 p-2 rounded-lg">
                            <Database className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Seleção de Bases</h2>
                            <p className="text-slate-500 text-sm">Selecione os mailings para verificar compatibilidade de CEP.</p>
                        </div>
                    </div>
                    
                    {/* Contador de Selecionados */}
                    <div className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 flex items-center gap-2">
                        <span className="text-sm text-slate-500">Selecionados:</span>
                        <span className="text-lg font-bold text-primary-600">{selectedMailings.size}</span>
                    </div>
                </div>

                {/* Barra de Filtros */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nome..."
                            className="pl-9 w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                            value={filterName}
                            onChange={(e) => setFilterName(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                            type="date"
                            className="pl-9 w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Lista de Mailings */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-20">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-700">Bases Disponíveis</h3>
                    <button 
                        onClick={toggleSelectAll}
                        className="text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 px-3 py-1 rounded transition-colors"
                    >
                        {selectedMailings.size === mailings.length && mailings.length > 0 ? 'Desmarcar Todos' : 'Selecionar Todos'}
                    </button>
                </div>

                {loading ? (
                    <div className="p-12 flex justify-center items-center">
                        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                    </div>
                ) : mailings.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        Nenhum mailing encontrado com os filtros atuais.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                        {mailings.map((name) => {
                            const isSelected = selectedMailings.has(name);
                            return (
                                <div 
                                    key={name}
                                    onClick={() => toggleSelection(name)}
                                    className={`px-6 py-4 flex items-center gap-4 cursor-pointer hover:bg-slate-50 transition-colors ${isSelected ? 'bg-primary-50/30' : ''}`}
                                >
                                    <div className={`transition-colors ${isSelected ? 'text-primary-600' : 'text-slate-300'}`}>
                                        {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                    </div>
                                    <span className={`text-sm font-medium ${isSelected ? 'text-primary-900' : 'text-slate-700'}`}>
                                        {name}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            
            {/* Botão de Ação Flutuante */}
            {selectedMailings.size > 0 && (
                 <div className="fixed bottom-6 right-6 z-30 animate-in slide-in-from-bottom-4 flex flex-col items-end gap-2">
                    {exportStatus && (
                        <div className="bg-slate-800 text-white text-sm px-4 py-2 rounded-lg shadow-lg mb-2 flex items-center gap-2">
                             <Loader2 className="w-4 h-4 animate-spin" />
                             {exportStatus}
                        </div>
                    )}
                    
                    <button 
                        onClick={handleCompareAndExport}
                        disabled={isExporting}
                        className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-bold py-3 px-6 rounded-full shadow-lg flex items-center gap-2 transition-transform hover:scale-105"
                    >
                        {isExporting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <FileSpreadsheet className="w-5 h-5" />
                        )}
                        {isExporting ? 'Processando...' : `Comparar e Baixar Excel (${selectedMailings.size})`}
                    </button>
                 </div>
            )}
        </div>
    );
};

export default MailingComparison;
