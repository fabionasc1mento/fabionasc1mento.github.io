import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Experience } from "@/components/Experience";
import { Projects } from "@/components/Projects";
import { Education } from "@/components/Education";
import { Contact } from "@/components/Contact";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { NameFlight } from "@/components/motion/NameFlight";
import { SectionNav } from "@/components/motion/SectionNav";

export default function Home() {
  return (
    <>
      <SmoothScroll />
      <Header />
      <main id="conteudo">
        <Hero />
        <Experience />
        <Projects />
        <Education />
      </main>
      <Contact />
      {/* Camadas de animação, por cima da página */}
      <NameFlight />
      <SectionNav />
    </>
  );
}
