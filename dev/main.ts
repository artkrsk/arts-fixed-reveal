import ArtsFixedReveal from "../src/ts/index";
import "./styles/main.sass";

// Simulate Elementor CSS output
const root = document.documentElement.style;
root.setProperty("--arts-fixed-reveal-gap", "40px");
root.setProperty("--arts-fixed-reveal-opacity-from", "0");
root.setProperty("--arts-fixed-reveal-translate-y-from", "-20vh");

const reveal = new ArtsFixedReveal();
reveal.init();

window.artsFixedReveal = reveal;
