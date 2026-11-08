# Manifesto da moldura

Cada moldura PNG pode ter um arquivo JSON com o mesmo nome-base e no mesmo diretório. Por exemplo:

```text
molduras/
  moldura_classica.png
  moldura_classica.json
```

Ao carregar a moldura, selecione os dois arquivos juntos ou use **Ler pasta**. A aplicação associa o PNG ao JSON pelo nome-base e pelo diretório relativo. Se a pasta tiver vários PNGs, escolha qual moldura carregar. Navegadores não permitem que uma página leia arquivos irmãos no dispositivo sem que o usuário selecione os arquivos ou a pasta.

## Schema versão 1

```json
{
  "schemaVersion": 1,
  "metadata": {
    "frameId": "moldura_classica",
    "version": "1.0.0"
  },
  "textRegions": {
    "number": {
      "x": 0.35,
      "y": 0.015,
      "width": 0.3,
      "height": 0.085,
      "style": {
        "fontFamily": "Georgia, serif",
        "fontSize": 0.075,
        "fontWeight": "400",
        "fontStyle": "normal",
        "color": "#38200F",
        "textAlign": "center",
        "verticalAlign": "middle",
        "lineHeight": 1.2,
        "letterSpacing": "0.02em"
      }
    },
    "title": {
      "x": 0.1,
      "y": 0.825,
      "width": 0.8,
      "height": 0.065,
      "style": {
        "fontFamily": "Georgia, serif",
        "fontSize": 0.058,
        "fontWeight": "400",
        "fontStyle": "normal",
        "color": "#38200F",
        "textAlign": "center",
        "verticalAlign": "middle"
      }
    },
    "reference": {
      "x": 0.15,
      "y": 0.895,
      "width": 0.7,
      "height": 0.045,
      "style": {
        "fontFamily": "Georgia, serif",
        "fontSize": 0.038,
        "fontWeight": "400",
        "fontStyle": "italic",
        "color": "#38200F",
        "textAlign": "center",
        "verticalAlign": "middle"
      }
    }
  }
}
```

`number`, `title` e `reference` são obrigatórios. Cada região define `x`, `y`, `width` e `height` como frações entre 0 e 1 da largura/altura final da carta. A região deve caber dentro dos limites da carta.

`fontSize` é uma fração da **largura da carta**: `0.075` em uma carta de 750 px de largura resulta em fonte de 56.25 px. Assim, a prévia e a exportação usam a mesma escala em qualquer resolução.

`fontFamily`, `fontWeight`, `fontStyle`, `color` e `textAlign` seguem valores CSS. `verticalAlign` é uma opção própria do layout Canvas e aceita `top`, `middle` ou `bottom`. `lineHeight` é um multiplicador sem unidade do tamanho da fonte (padrão `1.2`). `letterSpacing` aceita `normal` ou uma medida CSS `px`, `em` ou `rem` (padrão `0px`).

Campos adicionais de metadados e chaves futuras fora de `textRegions` são aceitos. A versão atual renderiza as três regiões conhecidas.

## Validação e fallback

O manifesto é validado antes de ser associado à moldura. Regiões fora do cartão, fontes, pesos, cores ou alinhamentos inválidos produzem diagnóstico e a aplicação mantém a moldura, usando a tipografia legada do template. Manifestos válidos são armazenados junto da moldura no IndexedDB e seguem com ela na exportação/importação do projeto em ZIP.

`public/template/moldura-provisoria.png` tem o sidecar `public/template/moldura-provisoria.json`. Ele mantém aproximadamente o posicionamento tipográfico provisório atual.
