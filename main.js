const root = document.documentElement;
const toggle = document.getElementById("themeToggle");
const storedTheme = localStorage.getItem("portfolio-theme");
if (storedTheme === "dark") root.classList.add("dark");

function syncThemeButton() {
  const dark = root.classList.contains("dark");
  toggle.setAttribute("aria-pressed", String(dark));
  toggle.setAttribute("aria-label", `Switch to ${dark ? "light" : "dark"} theme`);
}
syncThemeButton();
toggle.addEventListener("click", () => {
  root.classList.toggle("dark");
  localStorage.setItem("portfolio-theme", root.classList.contains("dark") ? "dark" : "light");
  syncThemeButton();
});

const nav = document.querySelector(".nav");
addEventListener("scroll", () => nav.classList.toggle("is-scrolled", scrollY > 20), { passive: true });

const reveal = document.getElementById("reveal");
const closeButton = document.getElementById("revealClose");
const title = document.getElementById("revealTitle");
const eyebrow = document.getElementById("revealEy");
const description = document.getElementById("revealDescription");
const app = document.getElementById("revealApp");
const appFrame = document.getElementById("revealAppFrame");
const web = document.getElementById("revealWeb");
const duo = document.getElementById("revealDuo");
const placeholder = document.getElementById("revealPlaceholder");
let opener;

function closeReveal() {
  reveal.classList.remove("is-open");
  reveal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("reveal-open");
  setTimeout(() => { app.src = ""; appFrame.src = ""; web.src = "about:blank"; }, 350);
  opener?.focus();
}

document.querySelectorAll(".project").forEach((project) => {
  project.addEventListener("click", () => {
    opener = project;
    const appSrc = project.dataset.app;
    const isHtml = /\.html?($|\?|#)/i.test(appSrc);
    title.innerHTML = `<em>${project.dataset.title}</em>`;
    eyebrow.textContent = project.dataset.type;
    description.textContent = project.dataset.description;
    const hasContent = appSrc || project.dataset.web;
    duo.hidden = !hasContent;
    placeholder.hidden = hasContent;
    if (hasContent) {
      duo.classList.toggle("html-mockup", isHtml);
      app.hidden = isHtml;
      appFrame.hidden = !isHtml;
      if (isHtml) appFrame.src = appSrc;
      else app.src = appSrc;
      web.src = project.dataset.web || "about:blank";
    }
    document.body.classList.add("reveal-open");
    reveal.classList.add("is-open");
    reveal.setAttribute("aria-hidden", "false");
    closeButton.focus();
  });
});
closeButton.addEventListener("click", closeReveal);
reveal.addEventListener("click", (event) => { if (event.target === reveal) closeReveal(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && reveal.classList.contains("is-open")) closeReveal(); });
const statusTime = document.getElementById("statusTime");
if (statusTime) {
  const updateStatusTime = () => {
    statusTime.textContent = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
    }).format(new Date()) + " IST";
  };
  updateStatusTime();
  setInterval(updateStatusTime, 1000);
}

// Hero signal field — deliberately small, self-contained, and paused for reduced motion.
const signalCanvas = document.getElementById("signalCanvas");
if (signalCanvas && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const context = signalCanvas.getContext("2d");
  const points = Array.from({ length: 34 }, (_, index) => ({
    x: Math.random(), y: Math.random(),
    vx: (Math.random() - .5) * .00018, vy: (Math.random() - .5) * .00018,
    size: index % 7 === 0 ? 2.5 : 1
  }));
  let frame;

  const resizeSignal = () => {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    signalCanvas.width = signalCanvas.offsetWidth * ratio;
    signalCanvas.height = signalCanvas.offsetHeight * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };
  const drawSignal = () => {
    const width = signalCanvas.offsetWidth;
    const height = signalCanvas.offsetHeight;
    const dark = root.classList.contains("dark");
    const ink = dark ? "244,240,232" : "23,23,20";
    context.clearRect(0, 0, width, height);
    points.forEach((point) => {
      point.x += point.vx; point.y += point.vy;
      if (point.x < .44 || point.x > .98) point.vx *= -1;
      if (point.y < .10 || point.y > .9) point.vy *= -1;
    });
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      for (let j = i + 1; j < points.length; j++) {
        const peer = points[j];
        const dx = (point.x - peer.x) * width;
        const dy = (point.y - peer.y) * height;
        const distance = Math.hypot(dx, dy);
        if (distance < 145) {
          context.beginPath();
          context.strokeStyle = `rgba(${ink}, ${.12 * (1 - distance / 145)})`;
          context.lineWidth = .7;
          context.moveTo(point.x * width, point.y * height);
          context.lineTo(peer.x * width, peer.y * height);
          context.stroke();
        }
      }
      context.beginPath();
      context.fillStyle = point.size > 1 ? "#e47f4f" : `rgba(${ink},.48)`;
      context.arc(point.x * width, point.y * height, point.size, 0, Math.PI * 2);
      context.fill();
    }
    frame = requestAnimationFrame(drawSignal);
  };
  resizeSignal();
  addEventListener("resize", resizeSignal, { passive: true });
  frame = requestAnimationFrame(drawSignal);
}
