# F1 Race Intelligence — Product specification

Requisitos originais do Guia. O estado de entrega e as validações estão em PROGRESS.md.

Atue como um engenheiro de software full-stack sênior, especialista em UI/UX, Creative Development, experiências 3D, animações cinematográficas e integração de APIs.

Desenvolva uma aplicação web completa de Fórmula 1, chamada provisoriamente **F1 Race Intelligence**, utilizando dados reais da API OpenF1.

O projeto será publicado no GitHub e divulgado no LinkedIn como projeto de portfólio profissional. Portanto, deve apresentar excelência visual, arquitetura sólida, código limpo e uma experiência de navegação diferenciada.

## 1. Referência visual

Utilize como principal referência de design e experiência de navegação o site oficial de Lando Norris:

https://landonorris.com/

Antes de iniciar o desenvolvimento, analise a referência visual, suas animações, transições, tipografia, composição, hierarquia de informações e interações.

Não quero uma cópia do site, mas uma aplicação original que apresente o mesmo nível de qualidade visual, abrangendo todos os pilotos e equipes da Fórmula 1.

O site não deve parecer um dashboard administrativo convencional ou um template genérico gerado por inteligência artificial. Quero uma experiência digital premium, imersiva, esportiva e cinematográfica.

## 2. Stack tecnológica obrigatória

### Front-end

- React;
- TypeScript;
- Vite;
- Three.js;
- React Three Fiber;
- React Three Drei;
- GSAP;
- GSAP ScrollTrigger;
- Motion (Framer Motion);
- Lenis Smooth Scroll;
- Tailwind CSS;
- Recharts;
- Lucide Icons.

### Back-end

- C#;
- ASP.NET Core Web API com .NET 10;
- Entity Framework Core;
- MySQL;
- SignalR;
- Swagger/OpenAPI;
- Serilog;
- HttpClientFactory;
- Injeção de dependências;
- Background Services.

Utilize versões estáveis e compatíveis das bibliotecas. Distribua as responsabilidades entre as ferramentas de animação para evitar redundância e problemas de performance.

## 3. Identidade visual

Desenvolva uma identidade visual baseada nos seguintes conceitos:

- Motorsport de alto desempenho;
- Futurismo;
- Tecnologia;
- Velocidade;
- Minimalismo premium;
- Estética cinematográfica;
- Telemetria automotiva;
- Design editorial esportivo.

Utilize:

- Fundo predominantemente preto e grafite;
- Tipografia esportiva, moderna e impactante;
- Números grandes;
- Elementos metálicos;
- Contrastes fortes;
- Cores dinâmicas de acordo com a equipe ou piloto selecionado;
- Efeitos de iluminação;
- Texturas sutis;
- Microinterações;
- Animações baseadas na velocidade dos carros;
- Composições assimétricas;
- Uso estratégico de espaços negativos.

Evite excesso de glassmorphism, gradientes genéricos, cards repetitivos, elementos arredondados desnecessários e aparência de dashboard corporativo.

Cada página deve possuir personalidade visual própria, mantendo a consistência da identidade do projeto.

## 4. Página inicial — experiência cinematográfica

Crie uma Hero Section de tela inteira extremamente impactante.

Inclua:

- Carro de Fórmula 1 renderizado em 3D;
- Iluminação cinematográfica;
- Movimento do modelo conforme o usuário movimenta o mouse;
- Efeitos de partículas sutis;
- Animações de entrada utilizando GSAP;
- Movimento de câmera;
- Tipografia em grande escala;
- Transições fluidas;
- Efeitos de profundidade e parallax;
- Animação de carregamento inspirada em sistemas de telemetria.

Utilize uma headline como:

**BEYOND THE FINISH LINE.**

Subtítulo:

*Every driver. Every lap. Every millisecond.*

Conforme o usuário realiza o scroll, utilize GSAP ScrollTrigger para movimentar o carro, alterar o enquadramento da câmera e apresentar as principais funcionalidades.

Inclua uma seção com informações do próximo Grande Prêmio, calendário, circuito, sessão e horário, quando disponíveis em fontes reais.

## 5. Página de pilotos

Crie uma experiência interativa contendo todos os pilotos da temporada selecionada.

Os pilotos devem ser carregados dinamicamente pela API, sem depender de uma lista fixa no código.

Cada piloto deve apresentar:

- Nome completo;
- Número;
- Fotografia, quando disponível;
- Equipe;
- Nacionalidade, quando disponível;
- Cor da equipe;
- Melhor volta na sessão selecionada;
- Posição;
- Velocidade máxima registrada;
- Informações de desempenho;
- Estatísticas disponíveis na API.

A página deve possuir um carrossel horizontal cinematográfico, com fotografias em destaque, números gigantes ao fundo e transições suaves.

Ao selecionar um piloto, altere dinamicamente as cores, elementos visuais e informações apresentadas.

Crie uma página individual para cada piloto com uma identidade visual inspirada em seu respectivo site esportivo e nas cores da equipe.

Utilize somente imagens e modelos 3D com licença adequada ou autorização de uso. Caso não estejam disponíveis, desenvolva alternativas visuais originais.

## 6. Race Control — acompanhamento de corrida

Desenvolva uma central de acompanhamento inspirada nos sistemas profissionais de monitoramento utilizados no automobilismo.

Inclua:

- Classificação dos pilotos;
- Posição atual;
- Diferença para o líder;
- Diferença para o piloto à frente;
- Número de voltas;
- Tempos de volta;
- Melhor volta;
- Tempos por setor;
- Pit stops;
- Compostos de pneus;
- Idade dos pneus, quando disponível;
- Bandeiras;
- Incidentes;
- Mensagens da direção de prova;
- Condições climáticas;
- Temperatura da pista;
- Temperatura ambiente;
- Velocidade do vento;
- Umidade.

As informações devem ser atualizadas dinamicamente conforme os dados recebidos.

Utilize animações para destacar mudanças de posição, melhores voltas, ultrapassagens inferidas e eventos relevantes, identificando claramente informações calculadas.

## 7. Circuito interativo em 3D

Utilize Three.js e React Three Fiber para criar uma visualização interativa dos circuitos.

O circuito deverá apresentar:

- Representação tridimensional da pista;
- Posição dos pilotos;
- Marcadores identificados pelo número do carro;
- Cores das respectivas equipes;
- Movimentação baseada nas coordenadas reais disponibilizadas pela API;
- Zoom;
- Rotação de câmera;
- Seleção individual de pilotos;
- Modo de acompanhamento automático;
- Alternância entre visualização 2D e 3D;
- Identificação dos setores, quando houver dados confiáveis.

Quando não houver um modelo oficial do circuito disponível, reconstrua seu traçado utilizando os dados históricos de localização fornecidos pela API.

Implemente interpolação entre coordenadas para garantir movimentações suaves.

Não apresente reconstruções aproximadas como modelos geográficos oficiais.

## 8. Telemetria avançada

Crie uma página de telemetria individual para cada piloto.

Exiba:

- Velocidade em km/h;
- RPM;
- Marcha atual;
- Acelerador;
- Freio;
- Status do DRS;
- Tempo de volta;
- Distância percorrida estimada;
- Posição no circuito.

Desenvolva componentes personalizados:

- Velocímetro digital animado;
- Indicador de marcha;
- Tacômetro;
- Indicadores luminosos de RPM;
- Barras de aceleração e frenagem;
- Gráficos temporais;
- Indicador visual do DRS.

A interface deve remeter ao volante de um carro de Fórmula 1 e aos sistemas profissionais de engenharia de corrida.

Não utilize valores aleatórios para preencher dados ausentes.

## 9. Comparação entre pilotos

Crie uma funcionalidade que permita selecionar dois pilotos e comparar seus desempenhos.

Apresente:

- Velocidade;
- RPM;
- Marchas;
- Aceleração;
- Frenagem;
- Tempos de volta;
- Tempos por setor;
- Velocidade máxima;
- Pontos de frenagem;
- Diferenças de desempenho ao longo do circuito.

Utilize gráficos sobrepostos e as cores das respectivas equipes.

Quando possível, sincronize a comparação por distância percorrida na volta, em vez de comparar apenas timestamps absolutos.

Permita selecionar temporada, Grande Prêmio, sessão e volta.

## 10. Replay de corridas históricas

A API OpenF1 disponibiliza dados históricos gratuitamente, enquanto o acesso aos dados ao vivo exige assinatura.

Documentação oficial:

https://openf1.org/docs/

Implemente um sistema de replay capaz de reproduzir sessões históricas como se estivessem acontecendo naquele momento.

O sistema deverá utilizar os timestamps originais da API e sincronizar todos os componentes da aplicação.

Inclua:

- Play;
- Pause;
- Reiniciar;
- Barra de progresso;
- Seleção de momento da corrida;
- Velocidades de reprodução de 0,5x, 1x, 2x, 5x e 10x;
- Seleção de temporada;
- Seleção de Grande Prêmio;
- Seleção de sessão.

Sincronize:

- Movimentação dos pilotos;
- Classificação;
- Telemetria;
- Gráficos;
- Mensagens da direção de prova;
- Pit stops;
- Condições climáticas;
- Eventos de corrida.

Identifique explicitamente a interface com o indicador **HISTORICAL REPLAY**, evitando que dados históricos sejam confundidos com transmissões realmente ao vivo.

Prepare também a arquitetura para suportar dados ao vivo futuramente, mediante configuração de credenciais válidas, sem exigir alterações significativas no código.

O projeto deve funcionar sem nenhuma assinatura paga.

## 11. Integração com a API OpenF1

URL base:

https://api.openf1.org/v1/

Explore os endpoints disponíveis, incluindo:

- `/meetings`
- `/sessions`
- `/drivers`
- `/car_data`
- `/location`
- `/position`
- `/intervals`
- `/laps`
- `/pit`
- `/stints`
- `/weather`
- `/race_control`
- `/team_radio`
- `/starting_grid`
- `/session_result`
- `/overtakes`

Antes de implementar, consulte a documentação atualizada e confirme quais endpoints, campos, filtros, limites e modalidades de acesso estão disponíveis.

Explore todos os dados relevantes oferecidos pela API.

Não invente endpoints, propriedades ou informações que não estejam disponíveis.

Caso informações como classificação do campeonato, nacionalidades ou calendário futuro não estejam disponíveis na OpenF1, avalie a integração com a Jolpica F1 API ou outra fonte pública confiável e documente sua origem.

Centralize as integrações externas no back-end.

Implemente:

- Cache;
- Rate limiting;
- Retry com backoff exponencial;
- Tratamento de erros;
- Controle de requisições;
- Deduplicação de registros;
- Persistência de sessões históricas;
- Cancelamento de requisições;
- Gerenciamento de grandes volumes de telemetria.

Nunca exponha chaves de API no front-end.

## 12. Rádio das equipes

Crie uma seção dedicada às comunicações de rádio disponibilizadas pela API.

Inclua:

- Identificação do piloto;
- Fotografia;
- Equipe;
- Horário da mensagem;
- Player de áudio personalizado;
- Indicadores visuais de reprodução;
- Timeline sincronizada com o replay.

Caso o áudio não esteja disponível ou sua reprodução seja restringida, apresente uma mensagem adequada.

Não reproduza automaticamente os áudios.

## 13. Arquitetura do back-end

Organize o back-end seguindo princípios de Clean Architecture, SOLID e separação de responsabilidades, evitando complexidade desnecessária.

Estruture a solução em projetos como:

- `F1RaceIntelligence.API`
- `F1RaceIntelligence.Application`
- `F1RaceIntelligence.Domain`
- `F1RaceIntelligence.Infrastructure`
- `F1RaceIntelligence.Tests`

Utilize:

- DTOs;
- Interfaces;
- Services;
- Repositories, quando justificáveis;
- Entity Framework Core Migrations;
- Injeção de dependências;
- Middleware global de exceções;
- Logging estruturado;
- Health Checks;
- Testes unitários;
- Testes de integração.

O SignalR deverá transmitir atualizações sincronizadas de telemetria, classificação e eventos para o front-end.

Utilize um relógio de reprodução centralizado para garantir que todos os componentes sejam atualizados com base no mesmo instante da sessão.

Permita que usuários diferentes reproduzam sessões independentemente, sem interferir na reprodução uns dos outros.

## 14. Performance

O projeto deverá manter excelente desempenho, apesar do uso intensivo de animações e elementos 3D.

Implemente:

- Lazy loading;
- Code splitting;
- Carregamento progressivo;
- Compressão de assets;
- Modelos 3D otimizados;
- Otimização de texturas;
- Virtualização de listas extensas;
- Limitação de atualizações dos gráficos;
- Gerenciamento adequado de memória;
- Descarte de recursos Three.js;
- Limpeza de animações GSAP;
- Reconexão automática do SignalR;
- Cache de dados históricos;
- Redução da quantidade de requisições externas.

Adapte a qualidade gráfica à capacidade do dispositivo.

Busque atingir 60 FPS em dispositivos compatíveis e forneça uma experiência alternativa quando WebGL estiver indisponível.

Respeite a preferência `prefers-reduced-motion`.

## 15. Responsividade e experiência do usuário

Garanta funcionamento em:

- Desktop;
- Notebook;
- Tablet;
- Smartphone.

Priorize uma experiência cinematográfica em desktop, mas desenvolva uma versão mobile igualmente refinada.

Inclua:

- Navegação acessível;
- Estados de carregamento personalizados;
- Skeletons;
- Estados vazios;
- Tratamento de indisponibilidade da API;
- Transições entre páginas;
- Feedback visual nas interações;
- Navegação por teclado;
- Contraste adequado.

Não permita que as animações prejudiquem a usabilidade.

Utilize inglês como idioma principal da interface, considerando que o projeto será divulgado internacionalmente.

## 16. Funcionalidades adicionais

Caso sejam tecnicamente viáveis e existam dados confiáveis, implemente:

- Calendário de Grandes Prêmios;
- Histórico de temporadas;
- Página de equipes;
- Classificação do campeonato;
- Contagem regressiva para a próxima sessão;
- Histórico de resultados;
- Estatísticas agregadas;
- Mapa de intensidade de frenagem;
- Comparação de estratégias de pneus;
- Análise de desempenho por setor;
- Modo fullscreen para Race Control.

Priorize funcionalidades realmente operacionais em vez de elementos exclusivamente decorativos.

## 17. GitHub e portfólio profissional

Crie um README.md completo em inglês, contendo:

- Apresentação do projeto;
- Objetivos;
- Funcionalidades;
- Stack tecnológica;
- Diagrama de arquitetura;
- Fluxo de integração com a API;
- Explicação do sistema de replay;
- Instruções de instalação;
- Configuração do MySQL;
- Variáveis de ambiente;
- Instruções de execução;
- Limitações conhecidas;
- Créditos das fontes de dados e assets;
- Espaço para screenshots e demonstração em vídeo.

Configure também:

- `.gitignore`;
- `.env.example`;
- GitHub Actions para CI;
- Build automatizado;
- Execução de testes;
- Documentação dos endpoints internos.

Inclua um aviso informando que o projeto é independente, educacional e não possui associação oficial com a Fórmula 1, FIA, pilotos ou equipes.

## 18. Diretrizes de execução

Antes de desenvolver:

1. Analise o site https://landonorris.com/.
2. Consulte a documentação atualizada da OpenF1.
3. Analise o repositório e o ambiente de desenvolvimento existentes.
4. Defina a arquitetura da aplicação.
5. Defina a identidade visual e o design system.
6. Planeje os componentes reutilizáveis.
7. Defina a estratégia de integração, armazenamento e reprodução dos dados.
8. Implemente a aplicação completa.
9. Execute o front-end e o back-end.
10. Teste as funcionalidades com dados reais.
11. Utilize o navegador para inspecionar visualmente as páginas.
12. Corrija problemas de layout, responsividade, performance e integração.
13. Valide os builds e testes antes de finalizar.

Não se limite a criar um planejamento, wireframe, protótipo estático ou exemplos isolados de código. Desenvolva a aplicação funcional.

Não utilize dados mockados como fonte definitiva. Dados simulados poderão ser utilizados exclusivamente em testes, com identificação explícita.

Caso o escopo seja muito amplo, priorize uma implementação funcional de alta qualidade da página inicial, seleção de pilotos, Race Control, circuito interativo, telemetria e replay histórico antes de avançar para funcionalidades secundárias.

Tome decisões técnicas de maneira autônoma sempre que possível. Documente as limitações e não declare funcionalidades como concluídas sem validá-las.

## Resultado esperado

Quero uma aplicação que combine:

- A qualidade visual do site de Lando Norris;
- A experiência cinematográfica de sites premiados no Awwwards;
- A interatividade de aplicações Three.js;
- A fluidez das animações GSAP;
- A riqueza de dados dos sistemas profissionais de telemetria da Fórmula 1;
- A robustez de uma arquitetura back-end em C# e .NET.

O resultado deve impressionar desenvolvedores, recrutadores, designers e fãs de automobilismo.

Quero que alguém, ao assistir a uma demonstração do projeto no LinkedIn, tenha dificuldade em acreditar que se trata de um projeto pessoal, e não de uma plataforma profissional de automobilismo.

Priorize qualidade visual, autenticidade dos dados, experiência do usuário, engenharia de software e atenção aos detalhes.


Execute este projeto de ponta a ponta, com autonomia.

Utilize o diretório atual como raiz do projeto.

Crie um arquivo SPEC.md contendo os requisitos completos e um arquivo AGENTS.md contendo as diretrizes permanentes de desenvolvimento.

Organize o desenvolvimento em milestones e acompanhe o progresso através de um arquivo PROGRESS.md.

Não encerre a tarefa após apresentar o planejamento. Prossiga com a implementação, instalação das dependências, execução, testes, inspeção visual e correção de problemas.

Utilize Playwright para testar a aplicação no navegador e capturar screenshots. Avalie criticamente a qualidade visual e refine o design antes de considerar o trabalho concluído.

O objetivo final é publicar uma aplicação funcional na internet e disponibilizar seu código-fonte em um repositório público no GitHub.

Prepare toda a infraestrutura necessária para o deploy. Solicite minha intervenção apenas quando forem necessárias autenticações, autorizações, decisões de custo ou informações indispensáveis.

Não contrate serviços pagos sem minha autorização.

Ao finalizar, entregue a URL pública da aplicação, a URL do GitHub, os resultados dos testes e as limitações conhecidas.
Seja criativo, ambicioso e criterioso. Não entregue um site genérico.
