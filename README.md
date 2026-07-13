# W3Labs-TV - Manual do Usuário

Bem-vindo ao **W3Labs-TV**, sua plataforma moderna de streaming multitelas! Este aplicativo foi desenvolvido com React Native e Expo, oferecendo uma experiência premium e fluida com suporte para Web, Mobile (Android/iOS) e Smart TVs.

## 🚀 Como Iniciar o Projeto

1. Certifique-se de ter o [Node.js](https://nodejs.org/) instalado em seu computador.
2. Na raiz do projeto, instale as dependências:
   ```bash
   npm install
   ```
3. Inicie a aplicação no ambiente desejado:
   - **Geral (Menu do Expo):** `npm start`
   - **Web:** `npm run web`
   - **Android:** `npm run android`
   - **iOS:** `npm run ios`

> **Nota:** Todos os comandos de inicialização acima configuram automaticamente a API local do guia de programação (EPG) em paralelo com o aplicativo.

---

## 📺 Principais Funcionalidades

### 1. Tela Inicial e Navegação
- **Hero Banner:** Destaque visual na parte superior com o canal principal da plataforma, descrição e atalhos rápidos ("Assistir Agora").
- **Seletor de Hubs:** Filtre canais de forma ágil através de abas de categorias (Ex: Todos, Esportes, Filmes, Notícias).
- **Prateleiras Dinâmicas:** Os canais são organizados horizontalmente por categoria, incluindo fileiras automáticas de **Assistidos Recentemente** e **Meus Favoritos**.

### 2. Player Imersivo e Guia de Programação (EPG)
- **Cinematic Player:** Um reprodutor de vídeo de alta performance otimizado para a melhor experiência visual (HD e áudio limpo). O layout se adapta perfeitamente seja no celular, no navegador ou na TV.
- **Painel Lateral do EPG:** Ao selecionar um canal, um painel interativo exibirá a programação ao vivo atual e as próximas atrações, mantendo você sempre informado.

### 3. Favoritos e Busca
- **Meus Favoritos:** Adicione ou remova canais dos seus favoritos tocando no ícone circular (com um sinal de `+` ou `check`). Eles ganham uma seção dedicada para fácil acesso.
- **Pesquisa Inteligente:** Encontre rapidamente o canal ou conteúdo desejado acessando a aba "Buscar" localizada no menu de navegação.

### 4. Integração com Chromecast
- Transmita o conteúdo ao vivo direto para a sua TV. O recurso de Cast está integrado diretamente na interface do reprodutor (disponível quando há dispositivos compatíveis na rede).

---

## 📱 Controles e Interação (Multiplataforma)

- **Mobile (Smartphones e Tablets):**
  - **Toque:** Navegue intuitivamente deslizando as prateleiras. Toque em qualquer cartão de canal para iniciar o streaming.
  - **Player em Tela Cheia:** A interface de reprodução oculta distrações, mas permite acesso rápido às informações do canal e guia de programação com um simples toque.

- **Web (Desktop):**
  - O layout do W3Labs-TV é responsivo e se expande horizontalmente, adotando uma barra de navegação no topo e exibindo mais canais e informações simultaneamente para aproveitar o espaço da tela grande.

- **Modo TV:**
  - Interface preparada para navegação com controle remoto usando setas direcionais e botão de seleção (OK).
