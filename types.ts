
export interface Recording {
  id: number;
  calldate: string;
  src: string;
  dst: string;
  duration: string; // "00:01:08" or "HH:MM:SS"
  billsec: string;  
  disposition: string; // 'ANSWERED', 'NO ANSWER', 'BUSY', 'FAILED'
  gravacao: string | null;
  destino: string;
  cml_nome: string;
  lista_nome: string | null;
  cml_id: number;
  tipomailing: string;
  usr_nome: string;
  data_importacao?: string;
  data_atualizacao?: string;
  data_insercao?: string;
}

export interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Used for UI components that expect Portuguese pagination keys
export interface PaginationMeta {
  paginaAtual: number;
  porPagina: number;
  totalPages: number;
  temProximaPagina: boolean;
  temPaginaAnterior: boolean;
}

// Nova estrutura de resposta baseada no backend fornecido
export interface ApiResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationData;
  message?: string;
  error?: string;
}

export interface FilterState {
  start_date: string;
  end_date: string;
  lista_nome: string;
  disposition: string;
  sem_lista: boolean;
  page: number;
  limit: number;
}

export enum DispositionType {
  ALL = '',
  ANSWERED = 'ANSWERED',
  NO_ANSWER = 'NO ANSWER',
  BUSY = 'BUSY',
  FAILED = 'FAILED'
}

// Tipos para Estatísticas de Listas (Dash de Ligações)
export interface ListStatData {
    id: number;
    lista_id: string;
    lista_nome: string;
    lista_data: string;
    lista_quantidade: number;
    total_discado: number;
    total_atendido: number;
    total_digito: number;
    emp_nome: string;
    usr_nome: string;
}

// Tipos para Upload de Mailing
export interface MailingItem {
    [key: string]: any;
}

export interface MailingResponse {
    success: boolean;
    totalNovosMalling: number;
    totalDuplicadosLogs: number;
    message?: string;
}

export interface MailingStat {
    nome_malling: string;
    data_primeira_insercao: string;
    total_geral: number;
    total_telefones_unicos: number;
    total_duplicados: number;
    taxa_duplicacao: number;
}

export interface MailingsListResponse {
    success: boolean;
    mailings: string[];
}

export interface CompatibleData {
    telefone1?: string;
    nome?: string;
    cpf?: string;
    nome_malling?: string;
    cep?: string;
    bairro?: string;
    endereco?: string;
    numero?: string;
    cidade?: string;
    uf?: string;
    [key: string]: any;
}

export interface CompatibleDataResponse {
    success: boolean;
    dados: CompatibleData[];
    totalPages: number;
    total: number;
    page: number;
}
