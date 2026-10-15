# fabionasc1mento.github.io

Meu portfólio: [fabionasc1mento.github.io](https://fabionasc1mento.github.io)

Feito com Next.js (export estático), TypeScript e CSS Modules, em português e inglês.

Visual cybercore editorial: grid de linhas pretas sobre cinza, vermelho como sinal,
Unbounded nos títulos e Space Mono nos rótulos.

Motion (em `src/components/motion/`): tela de boot em terminal, linhas que se desenham,
títulos que decodificam, glitch, flash vermelho na troca de seção, timecode, caixa de
pixels, faixa rolante de tecnologias, foto em pontilhado 1-bit, nome que se monta no
cabeçalho, índice de seções, fundo vivo e rolagem suave com Lenis. Tudo desliga para
quem ativou "reduzir movimento" no sistema.

## Rodando localmente

```bash
npm install
npm run dev      # http://localhost:3000
```

## Estrutura

```
src/
├── app/            # layout, página e estilos globais (tokens de cor e tipografia)
├── components/     # uma seção por componente, cada um com o seu .module.css
└── i18n/
    ├── dictionary.ts        # TODO o texto do site, em PT e EN
    └── LanguageProvider.tsx # idioma atual + botão de troca
```

Para mudar um texto, edite só o `src/i18n/dictionary.ts`.

## Deploy

Cada push na `main` dispara `.github/workflows/deploy.yml`, que faz o build e publica no GitHub Pages.
