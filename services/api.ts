
import { ApiResponse, FilterState, Recording, ListStatData, MailingResponse, MailingsListResponse, CompatibleDataResponse } from '../types';
import { API_BASE_URL, API_ENDPOINT_GRAVACOES, API_ENDPOINT_LISTAS, USE_MOCK_DATA } from '../constants';
import { generateMockData } from './mockService';

export const fetchRecordings = async (filters: FilterState): Promise<ApiResponse<Recording>> => {
  if (USE_MOCK_DATA) {
    // Adapter for mock data to match new response structure if needed
    // For now we skip mock implementation details updates as we focus on real API
    console.log('⚠️ Mock Data not fully adapted for new structure.');
    const mock = await generateMockData(filters);
    return {
        success: true,
        data: mock.dados,
        pagination: {
            page: mock.paginacao!.paginaAtual,
            limit: mock.paginacao!.porPagina,
            total: mock.totalRegistros,
            totalPages: mock.paginacao!.totalPages,
            hasNextPage: mock.paginacao!.temProximaPagina,
            hasPrevPage: mock.paginacao!.temPaginaAnterior
        }
    };
  }

  const queryParams = new URLSearchParams();

  // Envia datas com horário completo para garantir filtro correto no backend
  if (filters.start_date) queryParams.append('data_inicio', `${filters.start_date} 00:00:01`);
  if (filters.end_date) queryParams.append('data_fim', `${filters.end_date} 23:59:59`);
  
  // Se "sem_lista" estiver marcado, envia a flag e ignora o nome da lista
  if (filters.sem_lista) {
      queryParams.append('sem_lista', 'true');
  } else if (filters.lista_nome) {
      queryParams.append('lista_nome', filters.lista_nome);
  }

  if (filters.disposition) queryParams.append('disposition', filters.disposition);
  
  queryParams.append('page', String(filters.page));
  queryParams.append('limit', String(filters.limit));

  const url = `${API_BASE_URL}${API_ENDPOINT_GRAVACOES}?${queryParams.toString()}`;

  console.log(`📡 Chamando API Gravações: ${url}`); 

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    const data: ApiResponse<Recording> = await response.json();
    return data;
  } catch (error) {
    console.error('Falha ao buscar gravações:', error);
    throw error;
  }
};

export const fetchListsStats = async (filters: FilterState): Promise<ApiResponse<ListStatData>> => {
    if (USE_MOCK_DATA) {
         return {
            success: true,
            data: [],
            pagination: { page: 1, limit: 50, total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false }
        };
    }

    const queryParams = new URLSearchParams();
    
    // Mapeamento para os parametros do backend (/listas) com horários completos
    if (filters.start_date) queryParams.append('data_inicio', `${filters.start_date} 00:00:01`);
    if (filters.end_date) queryParams.append('data_fim', `${filters.end_date} 23:59:59`);
    
    if (filters.lista_nome) queryParams.append('lista_nome', filters.lista_nome);
    
    queryParams.append('page', '1');
    queryParams.append('limit', '50'); // Pegar top 50 listas para o gráfico

    const url = `${API_BASE_URL}${API_ENDPOINT_LISTAS}?${queryParams.toString()}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Falha ao buscar estatísticas de listas:', error);
        throw error;
    }
};

export const uploadMailingBatch = async (data: any[]): Promise<MailingResponse> => {
    if (USE_MOCK_DATA) {
        return new Promise(resolve => setTimeout(() => resolve({
            success: true,
            totalNovosMalling: Math.floor(data.length * 0.8),
            totalDuplicadosLogs: Math.floor(data.length * 0.2)
        }), 500));
    }
    
    const url = `${API_BASE_URL}/mailing/import`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`Upload Error: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        console.error('Upload mailing error:', error);
        throw error;
    }
};

export const fetchMailingsList = async (name?: string, date?: string): Promise<MailingsListResponse> => {
    if (USE_MOCK_DATA) {
        return new Promise(resolve => setTimeout(() => resolve({
             success: true, 
             mailings: ['Mailing_A', 'Mailing_B', 'Base_SP', 'Mailing_RJ'] 
        }), 300));
    }
    const params = new URLSearchParams();
    if (name) params.append('name', name);
    if (date) params.append('date', date);
    
    const url = `${API_BASE_URL}/mailing/list?${params.toString()}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Fetch List Error: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        console.error('Fetch mailings error:', error);
        throw error;
    }
}

export const fetchCompatibleData = async (mailings: string[], page: number, limit: number): Promise<CompatibleDataResponse> => {
    if (USE_MOCK_DATA) {
        return new Promise(resolve => setTimeout(() => resolve({ 
            success: true, 
            dados: [], 
            page, 
            totalPages: 1, 
            total: 0 
        }), 300));
    }
    try {
        const response = await fetch(`${API_BASE_URL}/mailing/compatible`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mailings, page, limit })
        });
        if (!response.ok) throw new Error(`Fetch Compatible Error: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        console.error('Fetch compatible data error:', error);
        throw error;
    }
}
