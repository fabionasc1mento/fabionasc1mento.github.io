// Todo o texto do site fica aqui, nos dois idiomas.
// Para mudar um texto, edite só este arquivo: os componentes leem daqui.

export type Lang = "pt" | "en";

type Link = { label: string; href: string };

type Job = {
  company: string;
  period: string;
  role: string;
  description: string;
  stack: string[];
};

type SmallProject = {
  name: string;
  description: string;
  stack: string[];
  image: string;
  imageAlt: string;
  note?: string;
  links: Link[];
};

export type Dictionary = {
  stackLabel: string;
  meta: { title: string; description: string };
  nav: {
    aria: string;
    experience: string;
    projects: string;
    education: string;
    resume: string;
    contact: string;
  };
  langSwitch: { label: string; aria: string };
  themeSwitch: { toLight: string; toDark: string };
  sound: { question: string; hint: string; withSound: string; withoutSound: string; turnOn: string; turnOff: string };
  hero: {
    name: string;
    title: string;
    lead: string;
    ctaProjects: string;
    ctaContact: string;
    demoCaption: string;
    demoReplay: string;
    demoColumns: [string, string];
  };
  sections: {
    indexLabel: string;
    experience: string;
    projects: string;
    education: string;
    resume: string;
    contact: string;
  };
  manifesto: { label: string; highlight: string[] };
  floating: { text: string; whatsapp: string; resume: string };
  experience: { title: string; jobs: Job[]; scrollHint: string; now: string };
  projects: {
    title: string;
    featured: {
      name: string;
      kind: string;
      steps: { label: string; text: string }[];
      stack: string[];
      note: string;
    };
    alpium: { name: string; text: string; points: string[]; note: string };
    small: SmallProject[];
  };
  education: {
    title: string;
    degrees: { name: string; school: string; period: string }[];
    coursesTitle: string;
    courses: string[];
    languagesTitle: string;
    languages: { name: string; level: string }[];
  };
  resume: {
    title: string;
    text: string;
    download: string;
    open: string;
    fileInfo: string;
    note: string;
    previewAlt: string;
  };
  contact: { title: string; text: string; links: Link[] };
  footer: string;
};

const contactLinks = (whatsText: string): Link[] => [
  {
    label: "WhatsApp",
    href: `https://wa.me/5565984770675?text=${encodeURIComponent(whatsText)}`,
  },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/fabio-tcn" },
  { label: "GitHub", href: "https://github.com/fabionasc1mento" },
  { label: "Instagram", href: "https://www.instagram.com/fabtarcio/" },
];

export const dictionaries: Record<Lang, Dictionary> = {
  pt: {
    stackLabel: "Tecnologias",
    meta: {
      title: "Fábio Tarcio | Desenvolvedor Full Stack",
      description:
        "Fábio Tarcio, desenvolvedor full stack (C#/.NET, ASP.NET MVC, SQL Server, React, Next.js). Sistemas web de ponta a ponta: dados, regras de negócio, integrações e interface. Cuiabá, Brasil, aberto a vagas remotas.",
    },
    nav: {
      aria: "Navegação principal",
      experience: "Experiência",
      projects: "Projetos",
      education: "Formação",
      resume: "Currículo",
      contact: "Contato",
    },
    langSwitch: { label: "EN", aria: "Switch to English" },
    themeSwitch: { toLight: "Mudar para o tema claro", toDark: "Mudar para o tema escuro" },
    sound: {
      question: "Entrar com som?",
      hint: "Dá para mudar depois no cabeçalho.",
      withSound: "Com som",
      withoutSound: "Sem som",
      turnOn: "Ligar o som",
      turnOff: "Desligar o som",
    },
    sections: {
      indexLabel: "Seções",
      experience: "2022 – hoje",
      projects: "Estudos de caso",
      education: "Engenharia de Software",
      resume: "PDF · 1 página",
      contact: "Vagas e freelance",
    },
    hero: {
      name: "Fábio Tarcio",
      title: "Transformo processo manual em sistema.",
      lead: "Sou o Fábio, desenvolvedor full stack. Há 3 anos construo sistemas web de ponta a ponta: modelagem de dados, regras de negócio, integrações e a interface que as pessoas usam no dia a dia. Hoje desenvolvo sistemas corporativos na ALPIUM e estou concluindo Engenharia de Software.",
      ctaProjects: "Ver projetos",
      ctaContact: "Falar comigo",
      demoCaption:
        "Extrator de lotes, um dos meus projetos: lê o catálogo em PDF e devolve a tabela pronta.",
      demoReplay: "Rodar de novo",
      demoColumns: ["Lote", "Peso (g)"],
    },
    manifesto: {
      label: "Sobre mim",
      highlight: ["full stack", "de ponta a ponta", "ALPIUM", "Engenharia de Software"],
    },
    floating: { text: "Aberto a vagas e freelas", whatsapp: "WhatsApp", resume: "Currículo" },
    experience: {
      title: "Experiência",
      scrollHint: "Role para seguir a trilha",
      now: "hoje",
      jobs: [
        {
          company: "ALPIUM",
          period: "2025 – hoje",
          role: "Desenvolvedor Full Stack",
          description:
            "Desenvolvo sistemas web sob medida para clientes da empresa em ASP.NET MVC: telas em Razor, formulários dinâmicos com listas e partial views, regras de negócio no back-end e integração com SQL Server via Entity Framework.",
          stack: ["C#", "ASP.NET MVC", "Razor", "Entity Framework", "SQL Server", "JavaScript"],
        },
        {
          company: "Autotax",
          period: "2024 – 2025",
          role: "Desenvolvedor Web",
          description:
            "Construí interfaces web com React e Laravel, do layout no Figma à integração com APIs, pensando primeiro na experiência no celular.",
          stack: ["React", "Laravel", "Tailwind", "Figma", "APIs REST"],
        },
        {
          company: "Freelancer",
          period: "2024",
          role: "Desenvolvedor Front-end",
          description:
            "Criei sites para clientes, do primeiro contato à entrega, com HTML, CSS, JavaScript e React.",
          stack: ["HTML", "CSS", "JavaScript", "React"],
        },
        {
          company: "CREA-MT",
          period: "2022 – 2023",
          role: "Estagiário de TI",
          description:
            "Suporte técnico e atendimento a usuários: diagnóstico de problemas, manutenção de computadores e comunicação com quem não é da área.",
          stack: ["Suporte técnico", "Hardware", "Atendimento"],
        },
      ],
    },
    projects: {
      title: "Projetos",
      featured: {
        name: "Extrator de lotes",
        kind: "Ferramenta interna",
        steps: [
          {
            label: "O problema",
            text: "Catálogos de leilão chegam em PDFs com centenas de lotes. Copiar o número e o peso de cada um para uma planilha levava dias.",
          },
          {
            label: "O que construí",
            text: "Uma API em Python com FastAPI que lê o PDF, limpa o texto quebrado entre páginas e extrai cada lote com o seu peso. No front-end, a tabela já sai com valor estimado, busca e exportação em CSV e PDF.",
          },
          {
            label: "O resultado",
            text: "O que levava dias passou a levar algumas horas, já contando a conferência.",
          },
        ],
        stack: ["Python", "FastAPI", "PyPDF2", "JavaScript", "jsPDF"],
        note: "Código privado: ferramenta de uso interno.",
      },
      alpium: {
        name: "Sistemas sob medida na ALPIUM",
        text: "Sistemas web completos para clientes da empresa, do banco de dados à tela.",
        points: [
          "Formulários dinâmicos com listas que crescem conforme o usuário preenche",
          "Partial views reaproveitadas entre telas para manter tudo consistente",
          "Consultas e gravação no SQL Server com Entity Framework",
        ],
        note: "Os sistemas são de clientes, por isso mostro só a descrição.",
      },
      small: [
        {
          name: "Bikcraft",
          description:
            "Site de uma marca de bicicletas sob medida, com layout responsivo e interações em JavaScript puro.",
          stack: ["HTML", "CSS", "JavaScript"],
          image: "/img/bikcraft.webp",
          imageAlt: "Página inicial do Bikcraft com uma bicicleta preta",
          note: "Projeto do curso da Origamid",
          links: [
            { label: "Ver site", href: "https://fabionasc1mento.github.io/bikcraft-origamid/" },
            { label: "Ver código", href: "https://github.com/fabionasc1mento/bikcraft-origamid" },
          ],
        },
        {
          name: "Buscador de CEP",
          description:
            "Digite um CEP e veja o endereço completo, consultado em tempo real numa API pública.",
          stack: ["React", "CSS", "API"],
          image: "/img/buscador-cep.webp",
          imageAlt: "Tela do Buscador de CEP com o campo de busca",
          links: [
            { label: "Ver site", href: "https://buscador-de-cep-omega-green.vercel.app/" },
            { label: "Ver código", href: "https://github.com/fabionasc1mento/buscadordecep" },
          ],
        },
      ],
    },
    education: {
      title: "Formação",
      degrees: [
        { name: "Engenharia de Software", school: "Universidade de Cuiabá (UNIC)", period: "2023 – em andamento" },
        { name: "Técnico em Design Gráfico", school: "SENAI-MT", period: "2017" },
        { name: "Técnico em Montagem e Reparo de Computadores", school: "SENAI-MT", period: "2017" },
      ],
      coursesTitle: "Cursos",
      courses: [
        "Next.js do zero ao avançado (Udemy)",
        "React (Origamid)",
        "Python 3 do básico ao avançado",
        "100 Days of Code: The Complete Python Pro Bootcamp",
      ],
      languagesTitle: "Idiomas",
      languages: [
        { name: "Português", level: "nativo" },
        { name: "Inglês", level: "avançado" },
        { name: "Espanhol", level: "básico" },
      ],
    },
    resume: {
      title: "Currículo",
      text: "Minha trajetória em uma página: experiência, competências técnicas, projetos e formação. Pronto para anexar em um processo seletivo.",
      download: "Baixar PDF",
      open: "Abrir no navegador",
      fileInfo: "1 página · PDF · 99 KB",
      note: "Versão em português.",
      previewAlt: "Prévia da página do currículo de Fábio Tarcio",
    },
    contact: {
      title: "Vamos conversar",
      text: "Estou aberto a vagas, inclusive remotas, e a projetos freelance. O jeito mais rápido de falar comigo é pelo WhatsApp ou pelo LinkedIn.",
      links: contactLinks("Olá, Fábio! Vi seu portfólio e gostaria de conversar."),
    },
    footer: "Feito com Next.js",
  },

  en: {
    stackLabel: "Technologies",
    meta: {
      title: "Fábio Tarcio | Full Stack Developer",
      description:
        "Fábio Tarcio, full stack developer (C#/.NET, ASP.NET MVC, SQL Server, React, Next.js). End-to-end web systems: data, business logic, integrations and UI. Based in Cuiabá, Brazil, open to remote roles.",
    },
    nav: {
      aria: "Main navigation",
      experience: "Experience",
      projects: "Projects",
      education: "Education",
      resume: "Résumé",
      contact: "Contact",
    },
    langSwitch: { label: "PT", aria: "Mudar para português" },
    themeSwitch: { toLight: "Switch to light theme", toDark: "Switch to dark theme" },
    sound: {
      question: "Enter with sound?",
      hint: "You can change it later in the header.",
      withSound: "With sound",
      withoutSound: "No sound",
      turnOn: "Turn sound on",
      turnOff: "Turn sound off",
    },
    sections: {
      indexLabel: "Sections",
      experience: "2022 – present",
      projects: "Case studies",
      education: "Software Engineering",
      resume: "PDF · 1 page",
      contact: "Jobs and freelance",
    },
    hero: {
      name: "Fábio Tarcio",
      title: "I turn manual processes into software.",
      lead: "I'm Fábio, a full stack developer. For 3 years I've been building web systems end to end: data modeling, business logic, integrations and the interfaces people use every day. I currently build enterprise systems at ALPIUM and I'm finishing my degree in Software Engineering.",
      ctaProjects: "See projects",
      ctaContact: "Get in touch",
      demoCaption:
        "Lot extractor, one of my projects: it reads a PDF catalog and returns a clean table.",
      demoReplay: "Play again",
      demoColumns: ["Lot", "Weight (g)"],
    },
    manifesto: {
      label: "About me",
      highlight: ["full stack", "end to end", "ALPIUM", "Software Engineering"],
    },
    floating: { text: "Open to jobs and freelance", whatsapp: "WhatsApp", resume: "Résumé" },
    experience: {
      title: "Experience",
      scrollHint: "Scroll to follow the trace",
      now: "now",
      jobs: [
        {
          company: "ALPIUM",
          period: "2025 – present",
          role: "Full Stack Developer",
          description:
            "I build custom web systems for the company's clients with ASP.NET MVC: Razor views, dynamic forms with lists and partial views, back-end business rules and SQL Server integration through Entity Framework.",
          stack: ["C#", "ASP.NET MVC", "Razor", "Entity Framework", "SQL Server", "JavaScript"],
        },
        {
          company: "Autotax",
          period: "2024 – 2025",
          role: "Web Developer",
          description:
            "Built web interfaces with React and Laravel, from the Figma layout to API integration, designing for mobile first.",
          stack: ["React", "Laravel", "Tailwind", "Figma", "REST APIs"],
        },
        {
          company: "Freelance",
          period: "2024",
          role: "Front-end Developer",
          description:
            "Built websites for clients, from the first conversation to delivery, with HTML, CSS, JavaScript and React.",
          stack: ["HTML", "CSS", "JavaScript", "React"],
        },
        {
          company: "CREA-MT",
          period: "2022 – 2023",
          role: "IT Intern",
          description:
            "Technical support and user service: troubleshooting, computer maintenance and explaining technical issues to non-technical people.",
          stack: ["Technical support", "Hardware", "User service"],
        },
      ],
    },
    projects: {
      title: "Projects",
      featured: {
        name: "Lot extractor",
        kind: "Internal tool",
        steps: [
          {
            label: "The problem",
            text: "Auction catalogs arrive as PDFs with hundreds of lots. Copying each lot's number and weight into a spreadsheet took days.",
          },
          {
            label: "What I built",
            text: "A Python API with FastAPI that reads the PDF, cleans up text broken across pages and extracts every lot with its weight. On the front end, the table comes with an estimated value, search and CSV and PDF export.",
          },
          {
            label: "The result",
            text: "Work that took days now takes a few hours, including the final review.",
          },
        ],
        stack: ["Python", "FastAPI", "PyPDF2", "JavaScript", "jsPDF"],
        note: "Private code: internal tool.",
      },
      alpium: {
        name: "Custom systems at ALPIUM",
        text: "Complete web systems for the company's clients, from the database to the screen.",
        points: [
          "Dynamic forms with lists that grow as the user fills them in",
          "Partial views reused across screens to keep everything consistent",
          "Queries and persistence in SQL Server with Entity Framework",
        ],
        note: "These systems belong to clients, so I can only describe them.",
      },
      small: [
        {
          name: "Bikcraft",
          description:
            "Website for a custom bicycle brand, with a responsive layout and interactions in plain JavaScript.",
          stack: ["HTML", "CSS", "JavaScript"],
          image: "/img/bikcraft.webp",
          imageAlt: "Bikcraft home page showing a black bicycle",
          note: "Built during the Origamid course",
          links: [
            { label: "Live site", href: "https://fabionasc1mento.github.io/bikcraft-origamid/" },
            { label: "Source code", href: "https://github.com/fabionasc1mento/bikcraft-origamid" },
          ],
        },
        {
          name: "Brazilian ZIP code finder",
          description:
            "Type a Brazilian ZIP code (CEP) and get the full address, fetched in real time from a public API.",
          stack: ["React", "CSS", "API"],
          image: "/img/buscador-cep.webp",
          imageAlt: "ZIP code finder screen with the search field",
          links: [
            { label: "Live site", href: "https://buscador-de-cep-omega-green.vercel.app/" },
            { label: "Source code", href: "https://github.com/fabionasc1mento/buscadordecep" },
          ],
        },
      ],
    },
    education: {
      title: "Education",
      degrees: [
        { name: "B.Sc. in Software Engineering", school: "University of Cuiabá (UNIC)", period: "2023 – in progress" },
        { name: "Graphic Design Technician", school: "SENAI-MT", period: "2017" },
        { name: "Computer Assembly and Repair Technician", school: "SENAI-MT", period: "2017" },
      ],
      coursesTitle: "Courses",
      courses: [
        "Next.js from zero to advanced (Udemy)",
        "React (Origamid)",
        "Python 3 from basic to advanced",
        "100 Days of Code: The Complete Python Pro Bootcamp",
      ],
      languagesTitle: "Languages",
      languages: [
        { name: "Portuguese", level: "native" },
        { name: "English", level: "advanced" },
        { name: "Spanish", level: "basic" },
      ],
    },
    resume: {
      title: "Résumé",
      text: "My background on a single page: experience, technical skills, projects and education. Ready to attach to an application.",
      download: "Download PDF",
      open: "Open in browser",
      fileInfo: "1 page · PDF · 99 KB",
      note: "Currently available in Portuguese only.",
      previewAlt: "Preview of Fábio Tarcio's résumé page",
    },
    contact: {
      title: "Let's talk",
      text: "I'm open to job opportunities, including remote roles, and to freelance projects. The fastest way to reach me is WhatsApp or LinkedIn.",
      links: contactLinks("Hi Fábio! I saw your portfolio and would like to talk."),
    },
    footer: "Built with Next.js",
  },
};
