import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import ArtsFixedReveal from "../src/ts/index";
import "./styles/main.sass";

gsap.registerPlugin(ScrollTrigger);
window.gsap = gsap;
window.ScrollTrigger = ScrollTrigger;

// Simulate Elementor CSS output
const root = document.documentElement.style;
root.setProperty("--arts-fixed-reveal-gap", "40px");
root.setProperty("--arts-fixed-reveal-opacity-from", "0");
root.setProperty("--arts-fixed-reveal-translate-y-from", "-20vh");

const reveal = new ArtsFixedReveal({ translateYMode: "custom" });
reveal.init();

window.artsFixedReveal = reveal;
