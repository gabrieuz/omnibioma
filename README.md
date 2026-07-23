# Omnibioma

PWA mobile-first para registrar evidências ambientais, entender lacunas com o Gemma e receber orientação baseada em regras auditáveis. O produto foi desenhado para ser compreendido em poucos segundos no campo: **fotografar → entender → agir → salvar**.

> Classificação preliminar. O Omnibioma não substitui avaliação técnica nem serviço de emergência.

## O que funciona

- câmera traseira ou galeria, relato, data/hora, descrição do local e geolocalização opcional;
- imagem corrigida pelo navegador, redimensionada a 1600 px, recomprimida abaixo de 2 MB e regravada sem EXIF;
- análise multimodal com `gemma-4-26b-a4b-it` pela Gemini Interactions API;
- até três perguntas controladas e grau de atenção calculado no aparelho;
- IndexedDB para imagens, rascunhos, estados, histórico e fila offline;
- retomada automática ao reconectar e botão de tentativa manual;
- recorrência de mesma categoria com dois registros anteriores em 2 km/14 dias;
- exportação JSON sem incorporar fotos;
- seis cenários e doze ocorrências fictícias para demonstração.

Áudio, autenticação, Gemma local, envio a autoridades, contatos institucionais reais e mapa de navegação não fazem parte do MVP.

## Arquitetura e limites de confiança

```text
PWA / IndexedDB ── imagem + relato ──> POST /api/analyze
       │                                  │
       │                            Gemma hospedado
       │                      categoria, sinais, lacunas,
       │                               resumo
       └── regras locais <──────── resposta validada
           perguntas · atenção · cuidados · recorrência
```

O servidor envia **somente imagem e relato**. Localização, andamento e histórico nunca entram no prompt. O Gemma classifica evidências; não escolhe grau de atenção, cuidados ou serviços. A rota tenta impor o mesmo JSON Schema no provedor e sempre valida com Zod. Usa `store:false`, temperatura `0.15`, solicita thinking `minimal`, resposta curta, timeout de 60 s e uma única repetição para falha transitória ou JSON inválido. Em julho de 2026, o endpoint hospedado passou a rejeitar `minimal` e depois `low` para este modelo apesar da documentação; o adaptador tenta o valor documentado e omite a configuração somente diante dessas duas rejeições específicas. A tabela atual de structured outputs também não lista Gemma: o adaptador tenta `response_format`, depois function calling com o schema e, se o endpoint rejeitar ambos, inclui o schema no prompt e mantém a validação Zod obrigatória. A documentação oficial confirma o modelo Gemma 4, imagem e function calling, além do modo stateless: [Gemma no Gemini API](https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api), [Interactions API](https://ai.google.dev/gemini-api/docs/interactions-overview) e [structured outputs](https://ai.google.dev/gemini-api/docs/structured-output).

O limitador em memória permite 10 análises por IP a cada 10 minutos. É suficiente para demonstração, não para produção distribuída.

## Executar localmente

Requisitos: Node.js 20+ e uma chave habilitada no Google AI Studio. As dependências
nativas são opcionais e resolvidas pelo npm para Windows, Linux ou macOS.

Linux/macOS:

```bash
npm install
cp .env.example .env
# preencha GEMINI_API_KEY apenas no .env
npm run dev
```

Prompt de Comando do Windows (`cmd.exe`):

```bat
npm install
copy .env.example .env
REM preencha GEMINI_API_KEY apenas no .env
npm run dev
```

Se o mesmo diretório já tiver um `node_modules` criado em outro sistema operacional,
remova apenas essa pasta e execute `npm install` novamente no sistema que será usado.
Não copie `.env.example` sobre um `.env` que já contenha sua chave.

Abra `http://localhost:3000`. A chave existe somente no servidor. `.env` e `.env.*` estão ignorados; `.env.example` é a única exceção e não contém segredo.

## Offline e privacidade

O shell, os cenários e os snapshots são pré-armazenados pelo service worker Serwist. `/api/analyze` usa `NetworkOnly` e jamais é cacheado. Sem conexão, a pessoa pode abrir/recarregar o app, consultar histórico, criar rascunho e colocar uma análise na fila. Uma análise nova sempre exige internet.

Fotos e coordenadas ficam no IndexedDB do dispositivo. Coordenadas são arredondadas para três casas decimais antes de persistir. A exportação informa `localPhotoPresent`, mas omite a imagem. A Gemini API hospedada não informa a memória do modelo; não interprete este MVP como execução local ou como garantia sobre os dados de treinamento do modelo. `store:false` evita criar uma Interaction recuperável, conforme a [documentação de retenção](https://ai.google.dev/gemini-api/docs/interactions-overview#data-storage-and-retention).

## Dados e snapshots

`data/scenarios` é o conjunto canônico. Cada cenário mantém a imagem, atribuição/licença, relato fictício, fonte alternativa isolada e `expected_output.json`. Fontes herdadas sem imagem são `candidate_only` e `unverified`; não aparecem no app. Veja [data/README.md](data/README.md).

Na preview sem segredo, apenas os cenários canônicos podem cair para um snapshot explicitamente rotulado. Um upload próprio **nunca** recebe resultado simulado. Depois de configurar a chave, renove os snapshots reais com `npm run snapshots`.

## Qualidade e testes

```bash
npm run lint
npm run typecheck
npm test
npm run validate:data
npm run build
npx playwright install chromium webkit
npm run test:e2e
```

Os testes cobrem schemas, regras, perguntas, Haversine e limites, IndexedDB, exportação, segurança/retry/timeout/rate limit da API, fluxo mobile, status, recorrência, exportação e fila offline. O layout tem contraste AA, foco visível, semântica, alvos de 44 px e breakpoint para 360 px.

## Green AI

O projeto faz uma inferência por ocorrência, usa thinking mínimo, reduz a imagem antes do envio, limita a saída e executa perguntas/regras/recorrência localmente. Isso reduz bytes, tokens e latência. Snapshots evitam chamadas repetidas durante a apresentação, mas são sempre identificados.

## Deploy na Vercel

A preview pode funcionar com snapshots sem receber `.env`. Após reivindicar o projeto, configure `GEMINI_API_KEY` nas variáveis do projeto e faça um novo deploy. Depois do evento, rotacione ou desative a chave. O projeto local não pressupõe repositório Git nem publica automaticamente no GitHub.

## Licença

Código sob Apache-2.0. Imagens mantêm as licenças e atribuições descritas em cada cenário.
