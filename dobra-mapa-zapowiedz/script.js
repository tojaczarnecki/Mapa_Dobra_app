const progress = document.querySelector(".loader-progress");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (progress && !reducedMotion) {
  let value = 0;
  window.setInterval(() => {
    value = (value + 1) % 100;
    progress.textContent = `${value}%`;
  }, 90);
}
