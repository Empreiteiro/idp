# IDP - Intelligent Document Processing

Plataforma completa para processamento inteligente de documentos com OCR e IA.

## Features

- **Template Management**: Crie templates de extração com sugestão automática de campos via IA
- **Document Upload**: Upload de PDFs e imagens com extração automática de dados
- **Auto-Classification**: Classificação automática de documentos em templates existentes
- **Multi-Provider AI**: Suporte a OpenAI, Claude (Anthropic) e Gemini (Google)
- **Extraction Review**: Interface de revisão com edição inline e badges de confiança
- **Data Tables**: Visualização tabular dos dados extraídos por template
- **CSV Export**: Exportação dos dados extraídos para CSV
- **Activity Log**: Histórico de todas as operações da plataforma
- **Batch Upload**: Upload de múltiplos documentos de uma vez
- **Connection Testing**: Teste de conexão com AI e OCR direto na interface
- **Dashboard**: Estatísticas e visão geral do processamento
- **Template Assignment**: Atribuição manual de templates para documentos não classificados

## Tech Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend | FastAPI + SQLAlchemy + SQLite |
| OCR | pdfplumber (primário) + Tesseract + pdf2image (fallback) |
| IA | OpenAI / Claude / Gemini (configurável) |
| Frontend | Next.js + TypeScript + Tailwind CSS + shadcn/ui |
| State | TanStack Query (React Query) |

## Pre-requisites

### Python 3.10+
Backend requires Python 3.10 or newer.

### Node.js 18+
Frontend requires Node.js 18 or newer.

### Tesseract OCR (opcional para PDFs com texto)
Para PDFs digitais (com texto selecionável), a plataforma usa **pdfplumber** que não precisa de instalação extra.

Para PDFs escaneados (imagens), é necessário:
1. Download Tesseract: https://github.com/UB-Mannheim/tesseract/wiki
2. Instale e adicione ao PATH ou configure na página de Settings

### Poppler (opcional - apenas para PDFs escaneados)
1. Download: https://github.com/oschwartz10612/poppler-windows/releases
2. Extraia e adicione `bin/` ao PATH ou configure na página de Settings

## Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edite .env com sua API key (ou configure na interface)
python run.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Fluxo de Uso

### 1. Configuração Inicial
- Abra http://localhost:3000
- Vá em **Settings** e configure o provedor de IA + chave API
- Use "Test AI Connection" para verificar a conexão

### 2. Criar Template
- Vá em **Templates** > **New Template**
- Dê um nome (ex: "Nota Fiscal", "Contrato", "Recibo")
- Faça upload de um documento de exemplo
- A IA sugere automaticamente os campos extraíveis
- Revise, adicione ou remova campos conforme necessário

### 3. Processar Documentos
- Vá em **Upload** e selecione um ou mais documentos
- Escolha um template ou deixe a IA classificar automaticamente
- O sistema executa: OCR > Classificação > Extração > Armazenamento

### 4. Revisar Dados
- Em **Documents**, clique em um documento processado
- Visualize o documento lado a lado com os dados extraídos
- Edite valores incorretos e aprove a extração

### 5. Visualizar Dados
- Em **Extracted Data**, veja todos os dados em formato tabular
- Filtre por template, busque valores específicos
- Exporte para CSV para uso em planilhas

## API Documentation

Backend Swagger UI: http://localhost:8000/docs

### Principais Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /api/dashboard/stats | Estatísticas gerais |
| POST | /api/templates | Criar template |
| POST | /api/templates/{id}/suggest-fields | Sugerir campos via IA |
| POST | /api/documents/upload | Upload de documento |
| POST | /api/documents/upload-batch | Upload em lote |
| GET | /api/documents/{id} | Detalhes do documento |
| PUT | /api/documents/{id}/assign-template | Atribuir template |
| GET | /api/data/templates/{id}/table | Dados tabulares |
| GET | /api/data/templates/{id}/export | Exportar CSV |
| GET | /api/activity | Log de atividades |
| POST | /api/settings/test-ai | Testar conexão AI |
| POST | /api/settings/test-ocr | Testar OCR |
