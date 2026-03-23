# Ferdinando IA 🌿

O **Ferdinando IA** é um bot de WhatsApp brasileiro, desenvolvido com uma personalidade "chapada", amigável e prestativa. Ele utiliza a biblioteca [Baileys](https://github.com/WhiskeySockets/Baileys) para conexão e o [Groq SDK](https://groq.com/) para inteligência artificial.

## 🚀 Funcionalidades

- **Inteligência Artificial**: Conversas naturais com personalidade única via Groq (Llama 3.1).
- **Gestão de Grupos**: Comandos de banimento, boas-vindas configuráveis e marcação de todos os membros.
- **Segurança**: Sistema de banimento global e verificação automática de novos participantes.
- **Agendamento**: Lembretes e ações agendadas (abrir/fechar grupos automaticamente).
- **Logs e Memória**: Registro detalhado de interações e memória persistente por usuário/grupo.

## 🛠️ Estrutura do Projeto

O projeto foi recentemente refatorado para uma arquitetura modular e escalável:

- `src/config/`: Centralização de configurações e variáveis de ambiente.
- `src/core/`: Núcleo do bot (conexão, eventos, IA, agendador).
- `src/commands/`: Implementação de comandos (ban, auth, lembretes, etc.).
- `src/actions/`: Ações automáticas disparadas por palavras-chave.
- `src/utils/`: Utilitários de log, formatação e gestão de grupos.
- `src/data/`: Armazenamento persistente em arquivos JSON.

## ⚙️ Configuração

1. Clone o repositório:
   ```bash
   git clone https://github.com/FernandoOlm/ferdinando_manus.git
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Configure o arquivo `.env` na raiz do projeto:
   ```env
   ROOT_ID=seu_numero_whatsapp
   GROQ_API_KEY=sua_chave_groq
   ```

4. Inicie o bot:
   ```bash
   npm start
   ```

## 📜 Licença

Este projeto é para fins educacionais e de entretenimento.
