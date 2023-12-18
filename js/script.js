if (window.SimpleAnime) {
  new SimpleAnime();
}


const linksInternos = document.querySelectorAll('.js-menu a[href^="#"]');

function scrollToSection(event) {
  event.preventDefault();
  const href = event.currentTarget.getAttribute('href');
  const section = document.querySelector(href)

  section.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });

  // // forma alternativa de scroll suave
  // const topo = section.offsetTop;
  // window.scrollTo({
  //   top: topo,
  //   behavior: 'smooth',
  // })
}

linksInternos.forEach((link) => {
  link.addEventListener('click', scrollToSection);
})

const section = document.querySelectorAll('.js-scroll');
  if (section.length) {
    const windowApresentation = window.innerHeight * 0.7;

    function animaScroll() {
      section.forEach((section) => {
        const sectionTop = section.getBoundingClientRect().top - windowApresentation;
        if (sectionTop < 0) {
          section.classList.add('ativo')
        }
      })
    }
  }
  animaScroll()
  window.addEventListener('scroll', animaScroll)