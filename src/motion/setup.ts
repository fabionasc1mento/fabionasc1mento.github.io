// Liga o runtime de motion (landing-motion) ao projeto.
// O runtime é um script que lê window.gsap, window.ScrollTrigger e
// window.Lenis quando init() roda; aqui expomos as bibliotecas uma vez.
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "./motion.js";
import "./motion.css";

type Motion = {
  destroy: () => void;
  refresh: () => void;
  ready: Promise<void>;
  lenis: Lenis | null;
};

type LandingMotionApi = {
  init: (options?: { root?: Element; smooth?: boolean; smoothDuration?: number }) => Motion;
  tokens: {
    dur: Record<string, number>;
    dist: Record<string, number>;
    ease: Record<string, string>;
  };
  blurSwap: (el: Element, content: string, options?: { blur?: number }) => void;
};

declare global {
  interface Window {
    gsap: typeof gsap;
    ScrollTrigger: typeof ScrollTrigger;
    Lenis: typeof Lenis;
    LandingMotion: LandingMotionApi;
  }
}

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
  window.gsap = gsap;
  window.ScrollTrigger = ScrollTrigger;
  window.Lenis = Lenis;
}

export function getLandingMotion(): LandingMotionApi | null {
  return typeof window !== "undefined" ? window.LandingMotion : null;
}
