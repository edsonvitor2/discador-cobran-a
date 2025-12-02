
import React, { useState, useEffect, useCallback } from 'react';
import { FilterState, Recording, PaginationMeta, ListStatData } from './types';
import { fetchRecordings, fetchListsStats } from './services/api';
import Filters from './components/Filters';
import RecordingsTable from './components/RecordingsTable';
import MailingStatsTable from './components/MailingStatsTable';
import StatsCard from './components/StatsCard';
import Charts from './components/Charts';
import { Phone, Clock, Percent, Activity, LayoutDashboard, Database, PhoneOutgoing, Download, Loader2 } from 'lucide-react';
import { DEFAULT_PAGE_SIZE } from './constants';
import * as XLSX from 'xlsx';

// Helper para converter "HH:MM:SS" em segundos totais
const timeStringToSeconds = (timeStr: string): number => {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  // Formato HH:MM:SS
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  // Fallback formato MM:SS
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
};

// Helper para formatar segundos de volta para texto (para exibir médias)
const secondsToTime = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
}

function App() {
  // -- ESTADOS DE DADOS --
  // Dados paginados apenas para a tabela
  const [tableData, setTableData] = useState<Recording[]>([]);
  
  // Dados completos para Gráficos, KPIs
  const [dashboardData, setDashboardData] = useState<Recording[]>([]);

  // KPIs
  const [callStats, setCallStats] = useState({ total: 0, avgDuration: '0s', successRate: 0, answeredCount: 0 });
  const [listsData, setListsData] = useState<ListStatData[]>([]);
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPagesState, setTotalPagesState] = useState(1);
  
  // -- ESTADOS COMPARTILHADOS --
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [exportingTable, setExportingTable] = useState<boolean>(false);
  
  const [filters, setFilters] = useState<FilterState>({
    start_date: '',
    end_date: '',
    lista_nome: '',
    disposition: '',
    sem_lista: false,
    page: 1, 
    limit: pageSize
  });

  // --- FUNÇÃO PARA CARREGAR DADOS DE LIGAÇÕES ---
  const loadCallData = useCallback(async () => {
    setLoading(true);
    try {
        // Filtros base
        const baseFilters = { ...filters };
        
        // 1. Configuração da requisição para a TABELA (Paginada)
        const tableFilters = { ...baseFilters, page: currentPage, limit: pageSize };
        
        // 2. Configuração da requisição para o DASHBOARD (Completa - Limite alto para trazer tudo)
        // Usamos um limite alto para garantir que todos os dados do filtro venham para os cálculos
        const dashboardFilters = { ...baseFilters, page: 1, limit: 100000 }; 
        
        // 3. Configuração da requisição para LISTAS (Pega top 100 para garantir gráfico cheio)
        const listFilters = { ...baseFilters, page: 1, limit: 100 };

        // Executa requests em paralelo
        const [tableResponse, dashboardResponse, listsResponse] = await Promise.all([
            fetchRecordings(tableFilters),
            fetchRecordings(dashboardFilters),
            fetchListsStats(listFilters)
        ]);
        
        // A. Processar Dados da Tabela
        if (tableResponse.success) {
            setTableData(tableResponse.data || []);
            setTotalPagesState(tableResponse.pagination.totalPages);
        }

        // B. Processar Dados do Dashboard (KPIs e Gráficos)
        if (dashboardResponse.success) {
            const allRecords = dashboardResponse.data || [];
            setDashboardData(allRecords);
            
            // Cálculos de KPIs baseados nos DADOS COMPLETOS
            const validCalls = allRecords.filter(d => d.disposition === 'ANSWERED').length;
            const totalDurationSeconds = allRecords.reduce((acc, curr) => acc + timeStringToSeconds(curr.duration), 0);
            const avgDurSeconds = allRecords.length > 0 ? Math.floor(totalDurationSeconds / allRecords.length) : 0;
            const rate = allRecords.length > 0 ? Math.floor((validCalls / allRecords.length) * 100) : 0;

            setCallStats({
                total: dashboardResponse.pagination.total, // Total geral do banco
                answeredCount: validCalls,
                avgDuration: secondsToTime(avgDurSeconds), // Média global do filtro
                successRate: rate // Taxa global do filtro
            });
        }

        // C. Processar Listas
        if (listsResponse.success && Array.isArray(listsResponse.data)) {
            setListsData(listsResponse.data);
        } else {
            setListsData([]);
        }

    } catch (error) {
        console.error("Erro ao carregar ligações:", error);
        setTableData([]);
        setDashboardData([]);
        setListsData([]);
        setCallStats({ total: 0, avgDuration: '0s', successRate: 0, answeredCount: 0 });
    } finally {
        setLoading(false);
    }
  }, [filters, currentPage, pageSize]);

  // --- EFEITO PRINCIPAL DE CARREGAMENTO ---
  useEffect(() => {
    loadCallData();
  }, [loadCallData]); 

  const handleApplyFilters = () => {
    setCurrentPage(1); // Resetar para página 1 ao filtrar
    loadCallData();
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    // O useEffect chamará loadCallData quando currentPage mudar
    // setTimeout para garantir scroll após render
    setTimeout(() => {
        document.getElementById('recordings-table')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Meta dados para paginação componente
  const paginationMeta: PaginationMeta = {
      paginaAtual: currentPage,
      porPagina: pageSize,
      totalPages: totalPagesState,
      temProximaPagina: currentPage < totalPagesState,
      temPaginaAnterior: currentPage > 1
  };

  // Calculate Aggregates for Lists
  const totalListasQty = listsData.reduce((acc, item) => acc + item.lista_quantidade, 0);
  const totalDiscadoQty = listsData.reduce((acc, item) => acc + item.total_discado, 0);

  // --- EXPORTAR EXCEL GERAL ---
  const handleExport = async () => {
    try {
        setExporting(true);
        
        // 1. Buscar TODOS os dados frescos da API para garantir integridade
        // Usamos um limite bem alto para "ignorar" a paginação e pegar tudo do filtro atual
        const exportFilters = { ...filters, page: 1, limit: 100000 };
        const response = await fetchRecordings(exportFilters);
        
        const dataToExport = response.success ? response.data : [];

        if (!dataToExport || dataToExport.length === 0) {
            alert("Sem dados para exportar com os filtros atuais.");
            setExporting(false);
            return;
        }

        const wb = XLSX.utils.book_new();

        // Aba 1: Resumo KPIs
        const metricsData = [
            { Indicador: "Total de Registros (Filtro)", Valor: callStats.total },
            { Indicador: "Total Atendidas", Valor: callStats.answeredCount },
            { Indicador: "Taxa de Atendimento", Valor: `${callStats.successRate}%` },
            { Indicador: "Duração Média", Valor: callStats.avgDuration },
            { Indicador: "Total em Listas", Valor: totalListasQty },
            { Indicador: "Total Discado", Valor: totalDiscadoQty },
            { Indicador: "", Valor: "" },
            { Indicador: "Filtro Data Início", Valor: filters.start_date },
            { Indicador: "Filtro Data Fim", Valor: filters.end_date },
        ];
        const wsMetrics = XLSX.utils.json_to_sheet(metricsData);
        XLSX.utils.book_append_sheet(wb, wsMetrics, "Resumo");

        // Aba 2: Tabela Detalhada (TODOS OS DADOS DO FILTRO)
        const recordingsExport = dataToExport.map(r => ({
            "ID": r.id,
            "Data/Hora": new Date(r.calldate).toLocaleString('pt-BR'),
            "Origem": r.src,
            "Destino": r.dst,
            "Duração": r.duration,
            "Tempo Falado": r.billsec,
            "Status": r.disposition,
            "Lista": r.lista_nome || (filters.sem_lista ? 'SEM LISTA' : ''),
            "Campanha": r.cml_nome,
            "Agente": r.usr_nome,
            "Mailing": r.tipomailing
        }));
        const wsRecordings = XLSX.utils.json_to_sheet(recordingsExport);
        XLSX.utils.book_append_sheet(wb, wsRecordings, "Gravações Detalhadas");

        // Aba 3: Listas (Se houver)
        if (listsData.length > 0) {
            const listsExport = listsData.map(l => ({
                "ID Lista": l.lista_id,
                "Nome Lista": l.lista_nome,
                "Data": l.lista_data,
                "Quantidade": l.lista_quantidade,
                "Total Discado": l.total_discado,
                "Total Atendido": l.total_atendido
            }));
            const wsLists = XLSX.utils.json_to_sheet(listsExport);
            XLSX.utils.book_append_sheet(wb, wsLists, "Performance Listas");
        }

        // Download
        const fileName = `Relatorio_CallMetrics_${new Date().toISOString().slice(0,10)}.xlsx`;
        XLSX.writeFile(wb, fileName);

    } catch (error) {
        console.error("Erro ao exportar:", error);
        alert("Ocorreu um erro ao gerar o relatório.");
    } finally {
        setExporting(false);
    }
  };

  // --- EXPORTAR APENAS TABELA DE GRAVAÇÕES ---
  const handleExportRecordings = async () => {
    try {
        setExportingTable(true);
        const exportFilters = { ...filters, page: 1, limit: 100000 };
        const response = await fetchRecordings(exportFilters);
        const dataToExport = response.success ? response.data : [];

        if (!dataToExport || dataToExport.length === 0) {
            alert("Sem dados para exportar.");
            setExportingTable(false);
            return;
        }

        const wb = XLSX.utils.book_new();
        const recordingsExport = dataToExport.map(r => ({
            "ID": r.id,
            "Data/Hora": new Date(r.calldate).toLocaleString('pt-BR'),
            "Origem": r.src,
            "Destino": r.dst,
            "Duração": r.duration,
            "Tempo Falado": r.billsec,
            "Status": r.disposition,
            "Lista": r.lista_nome || (filters.sem_lista ? 'SEM LISTA' : ''),
            "Campanha": r.cml_nome,
            "Agente": r.usr_nome,
            "Mailing": r.tipomailing
        }));
        const ws = XLSX.utils.json_to_sheet(recordingsExport);
        XLSX.utils.book_append_sheet(wb, ws, "Gravações Detalhadas");
        XLSX.writeFile(wb, `Gravações_Detalhadas_${new Date().toISOString().slice(0,10)}.xlsx`);

    } catch (error) {
        console.error("Erro ao exportar gravações:", error);
    } finally {
        setExportingTable(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      
      {/* Sidebar */}
      <aside className="w-80 p-4 fixed h-screen overflow-hidden hidden lg:block z-10 border-r border-slate-200 bg-white">
        <div className="h-full flex flex-col">
        <div className="flex items-center gap-3 px-2 mb-6 text-slate-900">
            <div className="bg-primary-600 text-white p-2 rounded-lg">
                <LayoutDashboard size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">CallMetrics</h1>
        </div>
        
        <Filters 
            filters={filters} 
            setFilters={setFilters} 
            onApply={handleApplyFilters}
            isLoading={loading}
            pageSize={pageSize}
            setPageSize={setPageSize}
        />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-8 transition-all duration-300 lg:ml-80">
        
        {/* HEADER */}
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm sticky top-4 z-20">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
                Dashboard de Ligações
            </h2>
            <p className="text-slate-500 text-sm">
                Analise gravações, tempo falado e status das chamadas em tempo real.
            </p>
          </div>
          <button 
            onClick={handleExport}
            disabled={loading || exporting}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
                <Download size={18} />
            )}
            {exporting ? "Gerando Excel..." : "Exportar Relatório Geral"}
          </button>
        </header>

        {/* --- DASHBOARD DE LIGAÇÕES --- */}
        <div className="animate-in fade-in duration-500 pb-20">
            
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary-600" /> KPIs de Atendimento (Total do Filtro)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                <StatsCard 
                    title="Atendidas" 
                    value={callStats.answeredCount.toLocaleString()} 
                    icon={Activity} 
                    color="blue" 
                />
                <StatsCard 
                    title="Taxa de Atendimento" 
                    value={`${callStats.successRate}%`} 
                    icon={Percent} 
                    color="green" 
                    trend={callStats.successRate > 50 ? "Performance Positiva" : "Atenção Necessária"}
                />
                <StatsCard 
                    title="Duração Média" 
                    value={callStats.avgDuration} 
                    icon={Clock} 
                    color="orange" 
                />
                <StatsCard 
                    title="Total em Listas" 
                    value={totalListasQty.toLocaleString()} 
                    icon={Database} 
                    color="blue" 
                />
                <StatsCard 
                    title="Total Discado" 
                    value={totalDiscadoQty.toLocaleString()} 
                    icon={PhoneOutgoing} 
                    color="green" 
                />
                <StatsCard 
                    title="Recebidas" 
                    value={callStats.total.toLocaleString()} 
                    icon={Phone} 
                    color="red" 
                />
            </div>

            {/* Gráficos usando dashboardData (dados completos) */}
            {!loading && (
                <Charts data={dashboardData} listsData={listsData} />
            )}
            
            {/* Tabela de Listas (usando a antiga MailingStatsTable adaptada) */}
            {!loading && listsData.length > 0 && (
                <MailingStatsTable data={listsData} />
            )}

            {/* Tabela de Gravações usando tableData (dados paginados) */}
            {/* Título e ícone movidos para dentro do componente RecordingsTable */}
            <div className="min-h-[500px]">
                <RecordingsTable 
                    data={tableData} 
                    pagination={paginationMeta} 
                    onPageChange={handlePageChange} 
                    isLoading={loading}
                    onExport={handleExportRecordings}
                    isExporting={exportingTable}
                />
            </div>
        </div>

      </main>
    </div>
  );
}

export default App;
