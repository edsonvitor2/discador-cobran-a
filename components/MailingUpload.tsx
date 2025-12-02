
import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Play, Trash2, X } from 'lucide-react';
import { MailingItem, MailingResponse } from '../types';
import { uploadMailingBatch } from '../services/api';
import { UPLOAD_BATCH_SIZE } from '../constants';

interface QueueItem {
    id: string;
    file: File;
    mailingName: string; // Nome editável, inicia com o nome do arquivo
    status: 'PENDING' | 'READING' | 'UPLOADING' | 'COMPLETED' | 'ERROR';
    progress: number;
    totalRows: number;
    processedRows: number;
    stats: {
        novos: number;
        duplicados: number;
    };
    errorMessage?: string;
}

const MailingUpload: React.FC = () => {
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Função para gerar ID único
    const generateId = () => Math.random().toString(36).substr(2, 9);

    // Manipula a seleção de arquivos (Múltiplos)
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const newItems: QueueItem[] = Array.from(files).map((item) => {
            const file = item as File;
            // Remove a extensão do arquivo para criar o nome do mailing automaticamente
            const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
            
            return {
                id: generateId(),
                file,
                mailingName: nameWithoutExt, // NOME AUTOMÁTICO AQUI
                status: 'PENDING',
                progress: 0,
                totalRows: 0,
                processedRows: 0,
                stats: { novos: 0, duplicados: 0 }
            };
        });

        setQueue(prev => [...prev, ...newItems]);
        
        // Limpa o input para permitir selecionar o mesmo arquivo novamente se quiser
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Remove um item da fila
    const removeItem = (id: string) => {
        if (isProcessing) return; // Bloqueia remoção durante processamento para evitar erros
        setQueue(prev => prev.filter(item => item.id !== id));
    };

    // Atualiza o nome do mailing na fila
    const updateMailingName = (id: string, newName: string) => {
        setQueue(prev => prev.map(item => 
            item.id === id && item.status === 'PENDING' 
                ? { ...item, mailingName: newName } 
                : item
        ));
    };

    // Atualiza o estado de um item específico na fila
    const updateItemState = (id: string, updates: Partial<QueueItem>) => {
        setQueue(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    };

    // Lógica principal de processamento da fila (Sequencial)
    const processQueue = async () => {
        setIsProcessing(true);
        
        // Encontra todos os itens pendentes
        // Nota: Não podemos usar filter dentro do loop pois o state não atualiza imediatamente.
        // Vamos iterar pelos indices.
        
        const itemsToProcess = queue.filter(q => q.status === 'PENDING');
        
        if (itemsToProcess.length === 0) {
            setIsProcessing(false);
            return;
        }

        // Loop manual para garantir sequencialidade (1 por 1)
        for (const item of itemsToProcess) {
            // Verifica se o item ainda existe na fila (caso tenha sido removido, improvável com UI travada)
            // e recupera o estado mais atual (importante para pegar o nome editado)
            
            await processSingleItem(item.id);
        }

        setIsProcessing(false);
    };

    const processSingleItem = async (itemId: string) => {
        // Recupera o item atual do state para garantir dados frescos
        let currentItem: QueueItem | undefined;
        
        // Hack para pegar o valor atual do state dentro da função async
        setQueue(prev => {
            currentItem = prev.find(i => i.id === itemId);
            return prev;
        });

        // Pequeno delay para garantir que currentItem foi setado (React batching)
        await new Promise(resolve => setTimeout(resolve, 50));

        if (!currentItem || currentItem.status !== 'PENDING') return;

        try {
            updateItemState(itemId, { status: 'READING', progress: 5 });

            // 1. Ler o Arquivo
            const data = await readFileAsync(currentItem.file);
            const totalRows = data.length;

            updateItemState(itemId, { 
                status: 'UPLOADING', 
                totalRows, 
                progress: 10 
            });

            // 2. Preparar e Enviar em Lotes
            let processedCount = 0;
            let totalNovos = 0;
            let totalDuplicados = 0;

            for (let i = 0; i < totalRows; i += UPLOAD_BATCH_SIZE) {
                const chunk = data.slice(i, i + UPLOAD_BATCH_SIZE).map(row => ({
                    ...row,
                    malling_name: currentItem!.mailingName // Usa o nome definido pelo usuário/automático
                }));

                // Envia para API
                const response: MailingResponse = await uploadMailingBatch(chunk);

                processedCount += chunk.length;
                totalNovos += response.totalNovosMalling;
                totalDuplicados += response.totalDuplicadosLogs;

                // Atualiza progresso
                const percentComplete = 10 + Math.round((processedCount / totalRows) * 90);
                
                updateItemState(itemId, {
                    processedRows: processedCount,
                    progress: percentComplete,
                    stats: { novos: totalNovos, duplicados: totalDuplicados }
                });
            }

            // 3. Finalizar
            updateItemState(itemId, { status: 'COMPLETED', progress: 100 });

        } catch (error: any) {
            console.error(error);
            updateItemState(itemId, { 
                status: 'ERROR', 
                errorMessage: error.message || 'Erro desconhecido',
                progress: 0
            });
        }
    };

    const readFileAsync = (file: File): Promise<any[]> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const bstr = evt.target?.result;
                    const wb = XLSX.read(bstr, { type: 'binary' });
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(ws);
                    resolve(jsonData as any[]);
                } catch (e) {
                    reject(e);
                }
            };
            reader.onerror = (err) => reject(err);
            reader.readAsBinaryString(file);
        });
    };

    // Cálculos de resumo
    const queueSummary = {
        total: queue.length,
        pending: queue.filter(i => i.status === 'PENDING').length,
        completed: queue.filter(i => i.status === 'COMPLETED').length,
        errors: queue.filter(i => i.status === 'ERROR').length
    };

    return (
        <div className="max-w-5xl mx-auto pb-20">
            {/* Header da Página */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-green-100 p-2 rounded-lg">
                            <Upload className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Importação em Lote</h2>
                            <p className="text-slate-500 text-sm">Selecione múltiplas planilhas para processamento automático.</p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isProcessing}
                            className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium transition-colors disabled:opacity-50"
                        >
                            <FileSpreadsheet className="w-4 h-4" />
                            + Adicionar Arquivos
                        </button>
                        <input 
                            type="file" 
                            accept=".xlsx, .xls, .csv" 
                            multiple 
                            className="hidden" 
                            ref={fileInputRef}
                            onChange={handleFileChange}
                        />

                        {queue.some(i => i.status === 'PENDING') && (
                            <button 
                                onClick={processQueue}
                                disabled={isProcessing}
                                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                {isProcessing ? 'Processando Fila...' : 'Iniciar Processamento'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Lista da Fila (Queue) */}
            <div className="space-y-4">
                {queue.length === 0 ? (
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-300 rounded-xl p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:border-green-400 hover:bg-green-50/30 transition-all"
                    >
                        <Upload className="w-12 h-12 text-slate-300 mb-4" />
                        <h3 className="text-lg font-medium text-slate-700">A fila está vazia</h3>
                        <p className="text-slate-500 max-w-md mt-1">
                            Arraste arquivos ou clique para selecionar. <br/>
                            Você pode selecionar <span className="font-semibold text-slate-700">múltiplos arquivos</span> de uma vez.
                        </p>
                    </div>
                ) : (
                    queue.map((item) => (
                        <div 
                            key={item.id} 
                            className={`bg-white rounded-xl border p-4 transition-all ${
                                item.status === 'UPLOADING' ? 'border-green-500 shadow-md ring-1 ring-green-100' : 
                                item.status === 'ERROR' ? 'border-red-200 bg-red-50/30' : 
                                item.status === 'COMPLETED' ? 'border-slate-200 bg-slate-50/50' :
                                'border-slate-200'
                            }`}
                        >
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                                {/* Ícone de Status */}
                                <div className="flex-shrink-0">
                                    {item.status === 'PENDING' && <div className="p-3 bg-slate-100 rounded-lg"><Upload className="w-5 h-5 text-slate-500" /></div>}
                                    {item.status === 'READING' && <div className="p-3 bg-blue-100 rounded-lg"><Loader2 className="w-5 h-5 text-blue-600 animate-spin" /></div>}
                                    {item.status === 'UPLOADING' && <div className="p-3 bg-green-100 rounded-lg"><Loader2 className="w-5 h-5 text-green-600 animate-spin" /></div>}
                                    {item.status === 'COMPLETED' && <div className="p-3 bg-green-100 rounded-lg"><CheckCircle className="w-5 h-5 text-green-600" /></div>}
                                    {item.status === 'ERROR' && <div className="p-3 bg-red-100 rounded-lg"><AlertCircle className="w-5 h-5 text-red-600" /></div>}
                                </div>

                                {/* Informações Principais */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-col md:flex-row md:items-center gap-2 mb-1">
                                        <h4 className="font-semibold text-slate-800 truncate" title={item.file.name}>
                                            {item.file.name}
                                        </h4>
                                        <span className="hidden md:inline text-slate-300">|</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-500 uppercase font-medium">Nome do Mailing:</span>
                                            {item.status === 'PENDING' ? (
                                                <input 
                                                    type="text" 
                                                    value={item.mailingName}
                                                    onChange={(e) => updateMailingName(item.id, e.target.value)}
                                                    className="text-sm border border-slate-300 rounded px-2 py-0.5 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none w-48"
                                                    placeholder="Nome da base..."
                                                />
                                            ) : (
                                                <span className="text-sm font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                                    {item.mailingName}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                        <span>{(item.file.size / 1024 / 1024).toFixed(2)} MB</span>
                                        {item.totalRows > 0 && (
                                            <>
                                                <span>•</span>
                                                <span>{item.processedRows} / {item.totalRows} linhas</span>
                                            </>
                                        )}
                                        {item.status === 'ERROR' && (
                                            <span className="text-red-600 font-medium">Erro: {item.errorMessage}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Estatísticas do Item */}
                                {item.status !== 'PENDING' && item.status !== 'READING' && (
                                    <div className="flex items-center gap-4 text-xs border-l pl-4 border-slate-100">
                                        <div className="text-center">
                                            <div className="font-bold text-green-600 text-lg">{item.stats.novos}</div>
                                            <div className="text-slate-400">Novos</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="font-bold text-yellow-600 text-lg">{item.stats.duplicados}</div>
                                            <div className="text-slate-400">Duplicados</div>
                                        </div>
                                    </div>
                                )}

                                {/* Ações */}
                                <div className="flex items-center pl-2">
                                    {item.status === 'PENDING' && !isProcessing && (
                                        <button 
                                            onClick={() => removeItem(item.id)}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Remover da fila"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Barra de Progresso */}
                            {(item.status === 'UPLOADING' || item.status === 'READING') && (
                                <div className="mt-4 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                    <div 
                                        className="bg-green-500 h-1.5 rounded-full transition-all duration-300" 
                                        style={{ width: `${item.progress}%` }}
                                    ></div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Resumo Fixo Rodapé (Opcional se a lista for muito longa) */}
            {queue.length > 0 && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-6 text-sm z-50">
                    <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                        Total: {queueSummary.total}
                    </span>
                    <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                        Pendentes: {queueSummary.pending}
                    </span>
                    <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        Concluídos: {queueSummary.completed}
                    </span>
                </div>
            )}
        </div>
    );
};

export default MailingUpload;
