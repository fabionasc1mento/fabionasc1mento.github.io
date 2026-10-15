import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { StackBand } from "@/components/StackBand";
import { Experience } from "@/components/Experience";
import { Projects } from "@/components/Projects";
import { Education } from "@/components/Education";
import { Contact } from "@/components/Contact";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { AmbientBackground } from "@/components/motion/AmbientBackground";
import { RevealObserver } from "@/components/motion/RevealObserver";
import { BootScreen } from "@/components/motion/BootScreen";
import { NameFlight } from "@/components/motion/NameFlight";
import { SectionNav } from "@/components/motion/SectionNav";

export default function Home() {
  return (
    <>
      <SmoothScroll />
      <RevealObserver />
      <AmbientBackground />
      <Header />
      <main id="conteudo">
        <Hero />
        <StackBand />
        <Experience />
        <Projects />
        <Education />
      </main>
      <Contact />
      {/* Camadas de animação, por cima da página */}
      <NameFlight />
      <SectionNav />
      <BootScreen />
    </>
  );
}
