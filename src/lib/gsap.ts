import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let scrollTriggerRegistered = false;

if (typeof window !== 'undefined' && !scrollTriggerRegistered) {
  gsap.registerPlugin(ScrollTrigger);
  scrollTriggerRegistered = true;
}

export { gsap, ScrollTrigger };
