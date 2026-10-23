import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { StackBand } from "@/components/StackBand";
import { Experience } from "@/components/Experience";
import { Projects } from "@/components/Projects";
import { Education } from "@/components/Education";
import { Resume } from "@/components/Resume";
import { Contact } from "@/components/Contact";
import { AmbientBackground } from "@/components/motion/AmbientBackground";
import { RevealObserver } from "@/components/motion/RevealObserver";
import { Preloader } from "@/components/motion/Preloader";
import { MotionRoot } from "@/components/motion/MotionRoot";
import { Manifesto } from "@/components/Manifesto";
import { FloatingBar } from "@/components/FloatingBar";
import { SectionNav } from "@/components/motion/SectionNav";
import { SoundRoot } from "@/components/sound/SoundRoot";

export default function Home() {
  return (
    <>
      <Preloader />
      <RevealObserver />
      <AmbientBackground />
      <Header />
      <main id="conteudo">
        <Hero />
        <StackBand />
        <Manifesto />
        <Experience />
        <Projects />
        <Education />
        <Resume />
      </main>
      <Contact />
      {/* Camadas de animação, por cima da página */}
      <SectionNav />
      <FloatingBar />
      <MotionRoot />
      <SoundRoot />
    </>
  );
}
