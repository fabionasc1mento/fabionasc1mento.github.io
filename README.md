# fabionasc1mento.github.io

Meu portfólio: [fabionasc1mento.github.io](https://fabionasc1mento.github.io)

Feito com Next.js (export estático), TypeScript e CSS Modules, em português e inglês.

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
