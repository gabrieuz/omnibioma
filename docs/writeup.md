# Omnibioma

## Registrar, Agir e Prevenir com I.A: Inteligência Ambiental

### Problema e proposta

O trabalho ambiental em campo costuma começar com informações dispersas: uma fotografia, um relato, uma coordenada e anotações de vistoria. Para agentes ambientais, brigadistas, pesquisadores e organizações, o desafio é não apenas reconhecer que algo está errado, mas registrar o caso de forma consistente, encaminhá-lo e relacioná-lo ao histórico do território.

O Omnibioma foi criado para apoiar esse fluxo. Ele transforma fotos e relatos em registros organizados, orientações práticas e sinais de recorrência. Seu público principal são profissionais e equipes que trabalham com meio ambiente, sobretudo em regiões com conectividade limitada.

A população também participa desse ciclo. Moradores e comunidades podem enviar observações simplificadas, que depois podem ser revisadas e complementadas por profissionais. Isso permite incorporar ao sistema conhecimentos e ocorrências que muitas vezes não chegam aos canais institucionais.

Imagine uma técnica de campo que encontre espuma e peixes mortos em um igarapé. Ela fotografa o local e relata que algumas famílias usam aquela água. O Omnibioma identifica os sinais presentes, aponta o que ainda precisa ser verificado, organiza a ocorrência e sugere cuidados. Em seguida, ajuda a encaminhar o caso para a equipe ou instituição adequada. Se registros semelhantes já existirem na região, o sistema destaca a possível recorrência.

### Registrar: transformar observações em memória ambiental

Registrar não significa apenas guardar uma foto. Significa transformar uma observação de campo em informação que possa ser revisada, comparada e reutilizada.

O modelo Gemma recebe uma imagem e um relato curto. Em uma única inferência, relaciona as duas fontes e retorna uma possível categoria ambiental, a qualidade da imagem, os sinais encontrados, as informações ausentes, as incertezas e um resumo factual.

Se faltarem dados importantes, o sistema apresenta perguntas objetivas. No caso do igarapé, pode perguntar se há odor incomum, se a água é consumida, se existe algum despejo próximo ou se o problema continua ativo. As respostas completam a ocorrência sem exigir que o usuário saiba previamente quais detalhes são relevantes.

Essa padronização cria um ativo que cresce com o uso. Um registro isolado ajuda a documentar uma situação. Muitos registros, quando coletados com qualidade, consentimento e revisão, podem apoiar estatísticas, pesquisas, mapas, avaliação de tendências e futuros modelos de inteligência artificial ajustados à realidade local.

A base precisa incorporar a linguagem, os problemas e as prioridades de quem vive e trabalha no território. Profissionais ambientais têm papel central na revisão e validação dos registros. Comunidades contribuem com conhecimento local e observações que muitas vezes permaneceriam dispersas ou não documentadas.

Assim, o Omnibioma não cria apenas um arquivo de ocorrências. Ele ajuda a construir uma memória ambiental viva, que se torna mais informativa conforme a participação aumenta e os registros são revisados.

### Agir: conectar quem encontrou o problema a quem pode ajudar

Informação organizada só tem valor quando chega a quem pode utilizá-la.

Depois da análise, o Omnibioma apresenta um grau de atenção em linguagem simples: mais informações necessárias, acompanhar, atenção ou atenção rápida. Essa decisão não fica livremente a cargo do modelo. Uma função determinística combina categoria, confiança, qualidade da imagem, sinais observados e respostas fornecidas.

Chamas ativas, exposição à fumaça, peixes mortos, uso de água suspeita ou presença de material perigoso podem elevar o grau de atenção. Imagem ruim, baixa confiança ou conteúdo fora do escopo levam o sistema a pedir mais informações, em vez de produzir uma conclusão forçada.

O aplicativo também mostra cuidados imediatos e tipos de instituição que podem ajudar. Dependendo do caso, isso pode incluir órgão ambiental, Defesa Civil, vigilância sanitária, serviço de saneamento, prefeitura, laboratório, ONG parceira ou equipe interna da própria organização.

No exemplo do igarapé, a técnica recebe uma ficha com os sinais observados, o que falta confirmar, cuidados imediatos e possíveis responsáveis pelo atendimento. Ela pode compartilhar o caso com outra equipe sem precisar reconstruí-lo por mensagens ou explicar novamente tudo o que foi observado.

Para a população, o fluxo pode ser mais simples: registrar, receber cuidados básicos e encaminhar a ocorrência para revisão. Para profissionais, o sistema oferece mais contexto, histórico, priorização e acompanhamento.

Essa divisão permite que a comunidade participe sem assumir responsabilidades técnicas que não lhe pertencem. Ao mesmo tempo, ajuda profissionais e organizações a receber registros mais completos e úteis.

O Omnibioma funciona, portanto, como uma ponte entre quem observa o problema e quem possui capacidade técnica, operacional ou institucional para responder.

O sistema não substitui fiscalização, diagnóstico, amostragem ou atendimento de emergência. Seu papel é reduzir a distância entre a observação e a ação.

### Prevenir: transformar histórico em sinais úteis

A prevenção nasce dos registros acumulados e das ações tomadas.

O protótipo destaca uma possível recorrência quando encontra pelo menos dois registros anteriores da mesma categoria em um raio de 2 km e dentro de 14 dias. A distância é calculada localmente com Haversine. A interface informa a quantidade de casos, a proximidade, o período e os sinais repetidos.

Se três registros de água escura, espuma e peixes mortos surgirem no mesmo igarapé em duas semanas, o Omnibioma não afirma que existe uma causa comum nem prevê um desastre. Ele mostra que há um padrão que merece atenção e pode justificar vistoria, coleta de amostras ou orientação preventiva aos moradores.

Em versões futuras, esse histórico poderá ser combinado com dados públicos sobre chuvas, focos de calor, níveis dos rios, cobertura vegetal e características da região. Essa combinação poderá apoiar avisos preventivos, planejamento de vistorias, campanhas educativas e definição de áreas prioritárias.

Um exemplo seria alertar equipes, antes do período mais seco, sobre áreas que já concentraram registros de fumaça ou fogo. Outro seria oferecer conteúdos educativos a comunidades próximas de locais com descarte recorrente de resíduos.

A plataforma também poderá aprender com os desfechos registrados. Saber quais casos foram confirmados, quais orientações foram úteis e quais instituições atenderam cada ocorrência ajuda a melhorar as regras, as perguntas e os encaminhamentos futuros.

O objetivo não é prometer previsão infalível. É perceber sinais mais cedo, compartilhar conhecimento e apoiar decisões antes que o problema se agrave.

### Como o Gemma participa

O Gemma é usado onde interpretação multimodal é necessária. Ele relaciona fotografia e relato, identifica sinais, avalia a qualidade das informações, reconhece incertezas, aponta lacunas e produz uma saída estruturada.

A resposta segue um contrato validado por Zod no servidor. Categorias, sinais e lacunas usam enumerações controladas. Respostas fora do contrato falham de forma segura.

Como o endpoint não oferece de forma consistente todos os recursos de saída estruturada, um adaptador inclui o schema no prompt quando necessário e valida o resultado antes da exibição.

Decisões sensíveis ficam fora do modelo. Graus de atenção, cuidados e tipos de serviço vêm de regras e arquivos JSON versionados.

O Gemma interpreta a situação. A aplicação controla as orientações e os critérios operacionais.

### Privacidade, resiliência e eficiência

Antes do envio, as imagens são redimensionadas, comprimidas para menos de 2 MB e recodificadas em JPEG, removendo metadados EXIF. A localização é opcional e arredondada. Os logs não armazenam imagens, relatos ou coordenadas.

O protótipo usa um serviço hospedado para a inferência. Portanto, uma nova análise exige conexão. O aplicativo não finge executar o modelo offline.

Ainda assim, a experiência é offline-first para abrir a interface, consultar cenários, manter rascunhos, visualizar registros e preparar novas ocorrências. Quando a conexão retorna, os casos pendentes podem ser retomados.

O desenho busca eficiência: uma inferência curta por ocorrência, imagem reduzida, resposta limitada, apenas uma nova tentativa em falhas transitórias e lógica posterior executada localmente. Os cenários de demonstração reutilizam resultados previamente processados.

### Dados de demonstração e limitações

O projeto inclui seis cenários: queimada, possível contaminação da água, descarte de resíduos, neblina semelhante a fumaça, água barrenta após chuva e imagem insuficiente.

Os últimos três mostram que o sistema também sabe reduzir a confiança, reconhecer incertezas e pedir mais informações.

Doze ocorrências fictícias alimentam a demonstração de recorrência. Imagens, licenças, atribuições, hashes e relatos simulados são identificados de forma explícita.

O Omnibioma ainda é um protótipo. Sua evolução exige validação com profissionais locais, testes com comunidades, governança de dados, revisão das regras por especialistas e integração apenas com serviços verificados.

## Síntese

O Omnibioma apoia profissionais ambientais e inclui a população no ciclo de cuidado com o território.

**Registrar** transforma observações em memória ambiental.  
**Agir** conecta o caso a quem pode ajudar.  
**Prevenir** usa o histórico para revelar padrões, orientar e educar.

> O Omnibioma transforma fotos e relatos dispersos em informação organizada, ação coordenada e conhecimento para prevenção ambiental.