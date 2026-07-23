# Writeup técnico — Omnibioma

## Problema e proposta

Uma fotografia ambiental raramente conta a história inteira. Em campo, uma pessoa pode reconhecer fumaça, água alterada ou resíduos, mas ainda não saber quais detalhes importam, como registrar com segurança ou se já existem sinais parecidos próximos. O Omnibioma transforma essa primeira observação em um registro estruturado e cauteloso.

O fluxo foi reduzido a quatro verbos: registrar, entender, agir e salvar. A tela inicial apresenta os casos centrais e, separadamente, casos de incerteza. Essa separação é intencional: a demonstração não mede apenas acertos óbvios; ela mostra que neblina, sedimento depois de chuva e imagem degradada devem reduzir a confiança.

## Divisão de responsabilidade

O Gemma 4 recebe uma foto já otimizada e um relato. Uma única inferência identifica categoria, qualidade da imagem, sinais observados, lacunas e um resumo factual. A saída tenta usar o mesmo JSON Schema no provedor e é sempre validada por Zod no servidor. Como o endpoint atual rejeita `response_format` e function calling para este Gemma, o adaptador inclui o schema no prompt somente após essas rejeições específicas. Códigos de sinais e lacunas são enumerações, não texto inventado; saída fora do contrato falha de forma segura.

Decisões operacionais ficam fora do modelo. Cada lacuna se transforma em uma pergunta local com respostas fechadas. Uma função determinística combina categoria, confiança, qualidade, sinais e respostas para produzir quatro graus: mais informações, acompanhar, atenção e atenção rápida. Cuidados e tipos genéricos de serviço vêm de JSON versionado. Isso torna a orientação revisável, testável e explicável.

Chamas, exposição à fumaça, peixes mortos, uso de água suspeita e material perigoso elevam a atenção. Imagem ruim, baixa confiança, incerteza ou conteúdo fora do escopo pedem mais evidência. Nenhum contato real é fabricado.

## Privacidade e resiliência

Imagens são desenhadas em canvas, respeitando orientação, com lado máximo de 1600 px, compressão progressiva abaixo de 2 MB e nova codificação JPEG. A nova codificação elimina EXIF. Coordenadas opcionais são arredondadas a três casas e permanecem no IndexedDB. A API recebe apenas imagem e relato; logs registram identificador técnico, duração, resultado e tipo de falha, nunca conteúdo.

A Interactions API usa imagem inline, `store:false`, solicita thinking `minimal`, temperatura baixa e saída curta. O endpoint ao vivo de julho de 2026 contradiz a documentação: rejeita `minimal` e também rejeita `low` como budget incompatível; o adaptador omite a configuração somente após essas respostas específicas. Há timeout de 60 segundos e uma repetição somente para erro transitório ou JSON inválido. Baixa confiança não consome outra inferência. Origem, MIME, schema e tamanho são validados, com limite básico por IP.

Serwist pré-armazena shell e cenários. A rota de análise é explicitamente `NetworkOnly`. Assim, histórico, rascunhos, cenários e snapshots continuam disponíveis offline, mas o produto nunca finge fazer uma análise nova sem internet. Registros offline entram em fila e são retomados com o aplicativo aberto ao recuperar conexão.

## Recorrência sem “mapa mágico”

Uma recorrência existe quando há dois registros anteriores da mesma categoria em raio de 2 km e janela de 14 dias. A distância usa Haversine. A interface informa contagem, menor distância, período e sinais repetidos. O SVG de proximidade não usa tiles nem serviços externos e é rotulado como visão de proximidade, não mapa de navegação. Recorrência descreve o histórico; não prevê desastre nem determina causalidade.

## Dados, transparência e eficiência

Seis cenários canônicos preservam imagem, hash, licença, atribuição, relato fictício e snapshot. Seis metadados alternativos herdados não tinham imagens locais e continham pontos a verificar; foram migrados como candidatos inativos e não aparecem na experiência. Doze ocorrências fictícias, com datas relativas, coordenadas simuladas e andamentos variados, tornam o padrão visível sem sugerir eventos reais.

O desenho também aplica Green AI: uma inferência curta por ocorrência, imagem reduzida, saída limitada e toda a lógica posterior executada localmente. Snapshots reais identificados dão previsibilidade à demonstração e evitam repetir chamadas. O app esclarece que serviço hospedado não equivale a modelo local e que a API não informa a memória ou os dados exatos de treinamento do modelo.

## Limitações e próximos passos

O rate limit em memória não coordena múltiplas instâncias; produção exige armazenamento compartilhado e proteção contra abuso. IndexedDB não é backup e pode ser apagado pelo sistema. A categoria preliminar não substitui amostragem, investigação técnica ou canal de emergência. A geolocalização arredondada ainda é sensível e deve permanecer opt-in.

Uma evolução responsável incluiria revisão das regras por especialistas locais, internacionalização de linguagem comunitária, sincronização consentida, trilha de auditoria, avaliação contínua por subgrupos e integração somente com serviços verificados. Nada disso deve preceder testes de campo e governança de dados.
