# Compositor Lenormand Bíblico

Aplicação local-first para organizar e compor cartas Petit Lenormand com Canvas 2D. Ilustrações e moldura são fornecidas pelo usuário; o aplicativo não gera arte e não envia imagens pela rede.

## Requisitos

- Node.js 20 ou superior
- Navegador moderno com Canvas 2D e IndexedDB

## Executar localmente

```bash
npm install
npm run dev
```

O Vite informa o endereço local no terminal. O projeto também pode ser compilado e servido com:

```bash
npm run build
npm run preview
```

Os dados e arquivos ficam no IndexedDB do navegador atual. Limpar os dados do site remove a cópia local; use **Exportar projeto** para criar um arquivo de segurança ZIP. O ZIP contém `manifest.json`, a moldura, ilustrações, metadados, transformações e a versão do template. A importação verifica o manifesto e os arquivos antes de gravar o novo projeto.

## Fluxo

1. Carregue uma moldura PNG transparente no painel **Moldura do baralho**. A mesma moldura é aplicada ao canvas completo em todas as cartas.
2. Selecione uma carta na lista horizontal/lateral e carregue sua ilustração.
3. Reposicione arrastando a imagem na prévia ou use zoom e setas. O recorte é limitado à região de ilustração.
4. Edite título e referência; as referências começam com status **Pendente** para evitar dados bíblicos não verificados.
5. Exporte a carta como PNG ou o conjunto do projeto em ZIP.

Cartas marcadas como **Aprovada** não aceitam substituição de ilustração até que o status seja alterado para **Rascunho**. O catálogo e as propostas agora vêm de `src/data/cartas.json`, incluindo representação visual, referência, observações e status por carta. Os estados **Proposta** e **A definir** são preservados e não são tratados como aprovação. Referências e direções podem ser editadas no editor; textos locais existentes são preservados na migração. A carta 08 aparece como **Sepultura (Caixão)** e a 16 como **Estrelas**, de acordo com o arquivo.

## Template

`src/template.ts` contém a resolução de trabalho (750 × 1125 px, proporção 2:3), a região da imagem, as coordenadas de texto, fontes, cores e limites de largura. Esses pixels são valores provisórios para desenvolvimento e **não representam dimensões físicas de impressão nem aprovação visual**. `public/template/moldura-provisoria.png` é apenas uma guia geométrica simples. Ajuste o template com a moldura definitiva e aprovação visual antes de produzir cartas finais.

## Testes

```bash
npm test
npm run build
```

Os testes cobrem cálculo de recorte, validação de arquivos e coordenadas, composição/exportação PNG, validação e round-trip do ZIP e persistência IndexedDB.
