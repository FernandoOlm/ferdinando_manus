# Plano de Refatoração - Ferdinando IA

Este documento descreve as melhorias planejadas para o repositório `ferdinando_manus`.

## 1. Reorganização da Estrutura (Modularização)
O arquivo `src/core/index.js` está sobrecarregado. Ele será dividido em:
- `src/core/connection.js`: Gerenciamento da conexão com o WhatsApp (Baileys).
- `src/core/eventHandler.js`: Centralização do tratamento de eventos (`messages.upsert`, `group-participants.update`, etc.).
- `src/core/commandHandler.js`: Lógica de identificação e execução de comandos.
- `src/core/scheduler.js`: Gerenciamento de tarefas agendadas e lembretes.

## 2. Centralização de Configurações
- Criar `src/config/index.js` para gerenciar variáveis de ambiente (`ROOT_ID`, `GROQ_API_KEY`, etc.) e caminhos de arquivos.
- Substituir `path.resolve("src/data/...")` por constantes centralizadas.

## 3. Melhoria na Integração com IA (`aiClient.js`)
- Adicionar suporte a retentativas (retry logic).
- Tornar o `systemPrompt` configurável.
- Adicionar tratamento de erros mais robusto.

## 4. Padronização e Limpeza de Código
- Remover códigos comentados e logs desnecessários.
- Padronizar a nomenclatura de funções (remover sufixos como `_Unique01` a menos que sejam estritamente necessários).
- Adicionar JSDoc para documentação das funções principais.

## 5. Injeção de Dependências
- Eliminar o uso de `globalThis.sock`.
- Passar a instância do `sock` explicitamente para os handlers e comandos.

## 6. Otimização do Scheduler
- Melhorar a eficiência da leitura de arquivos no loop de agendamento.
- Considerar o uso de uma biblioteca de agendamento se a complexidade aumentar.

## 7. Melhoria no Sistema de Permissões
- Unificar a lógica de verificação de admin e usuários autorizados.
