/* ============================================================
   Krishna Ganga — portfolio interactions
   Everything degrades to a static page when motion is reduced.
   ============================================================ */

const root = document.documentElement;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------- theme ---------- */
const themeToggle = document.getElementById("themeToggle");
if (localStorage.getItem("portfolio-theme") === "dark") root.classList.add("dark");

function syncTheme() {
  const dark = root.classList.contains("dark");
  themeToggle.setAttribute("aria-pressed", String(dark));
  themeToggle.setAttribute("aria-label", `Switch to ${dark ? "light" : "dark"} theme`);
  document.querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? "#121211" : "#f5f2eb");
}
syncTheme();

function flipTheme() {
  root.classList.toggle("dark");
  localStorage.setItem("portfolio-theme", root.classList.contains("dark") ? "dark" : "light");
  syncTheme();
}

// A circular wipe where the browser supports it, a plain swap where it doesn't.
themeToggle.addEventListener("click", (event) => {
  if (!document.startViewTransition || reduceMotion.matches) return flipTheme();

  const x = event.clientX;
  const y = event.clientY;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

  document.startViewTransition(flipTheme).ready.then(() => {
    root.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 620, easing: "cubic-bezier(.2,.8,.2,1)", pseudoElement: "::view-transition-new(root)" }
    );
  });
});

/* ---------- scroll: progress bar + nav auto-hide ---------- */
const nav = document.getElementById("nav");
const progress = document.getElementById("progress");
let lastScroll = 0;
let scrollVelocity = 0;

addEventListener("scroll", () => {
  const y = scrollY;
  const max = document.body.scrollHeight - innerHeight;
  progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

  nav.classList.toggle("is-scrolled", y > 20);
  // Hide going down past the hero, show the moment the user scrolls back up.
  nav.classList.toggle("is-hidden", y > lastScroll && y > 500);

  scrollVelocity = Math.min(Math.abs(y - lastScroll) / 14, 3);
  lastScroll = y;
}, { passive: true });

/* ---------- entrance ---------- */
addEventListener("load", () => document.body.classList.add("is-ready"), { once: true });
// Fallback in case load fires before the listener attaches (cached assets).
setTimeout(() => document.body.classList.add("is-ready"), 400);

/* ---------- scroll reveals ---------- */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("is-in");
    revealObserver.unobserve(entry.target);
  });
}, { threshold: .16, rootMargin: "0px 0px -8% 0px" });

document.querySelectorAll("[data-reveal],[data-reveal-stagger]").forEach((el) => revealObserver.observe(el));

/* ---------- stat count-up ---------- */
function countUp(el) {
  if (el.dataset.counted) return;
  el.dataset.counted = "1";

  const target = Number(el.dataset.count);
  const suffix = el.dataset.suffix || "";
  if (reduceMotion.matches) { el.textContent = target + suffix; return; }

  const duration = 1100;
  const start = performance.now();
  const step = (now) => {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(target * eased) + suffix;
    if (t < 1) requestAnimationFrame(step);
    else el.textContent = target + suffix;
  };
  requestAnimationFrame(step);
}

const countObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    countObserver.unobserve(entry.target);
    countUp(entry.target);
  });
}, { threshold: .6 });

document.querySelectorAll("[data-count]").forEach((el) => countObserver.observe(el));

/* Nothing on this page may stay invisible because an observer never fired.
   Background tabs throttle IntersectionObserver delivery, so anything still
   hidden once the user is actually looking gets revealed outright. */
function rescueHidden() {
  // A hidden or not-yet-laid-out tab can report a zero-height viewport, which
  // would make every element look off screen forever. When the measurement is
  // not trustworthy, reveal everything rather than hide everything.
  const viewport = Math.max(innerHeight, document.documentElement.clientHeight, 0);
  const seen = (el) => viewport === 0 || el.getBoundingClientRect().top < viewport;

  document.querySelectorAll("[data-reveal],[data-reveal-stagger]").forEach((el) => {
    if (seen(el)) el.classList.add("is-in");
  });
  document.querySelectorAll("[data-count]").forEach((el) => {
    if (seen(el)) countUp(el);
  });
}

setInterval(rescueHidden, 1200);
document.addEventListener("visibilitychange", () => { if (!document.hidden) rescueHidden(); });

/* ---------- text scramble ---------- */
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/·#*";

document.querySelectorAll("[data-scramble]").forEach((el) => {
  const final = el.textContent;
  if (reduceMotion.matches) return;

  // Driven by elapsed time, not frame count, so a throttled tab can never
  // strand the element mid-scramble showing garbage.
  const duration = 620;
  let start = 0;

  const run = (now) => {
    if (!start) start = now;
    const t = Math.min((now - start) / duration, 1);

    el.textContent = final
      .split("")
      .map((char, index) => {
        if (char === " ") return " ";
        const settled = index < t * final.length;
        return settled ? char : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      })
      .join("");

    if (t < 1) requestAnimationFrame(run);
    else el.textContent = final;
  };

  setTimeout(() => requestAnimationFrame(run), 300);
  // Hard guarantee: whatever happens to the animation, the real text lands.
  setTimeout(() => { el.textContent = final; }, 300 + duration + 400);
});

/* ---------- clock ---------- */
const clock = document.getElementById("clock");
if (clock) {
  const tick = () => {
    clock.textContent = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
    }).format(new Date());
  };
  tick();
  setInterval(tick, 1000);
}

/* ---------- marquee: seamless loop, speed follows scroll ---------- */
const marqueeTrack = document.getElementById("marqueeTrack");
if (marqueeTrack) {
  marqueeTrack.parentElement.append(marqueeTrack.cloneNode(true));
  if (!reduceMotion.matches) {
    const pulse = () => {
      const rate = 1 + scrollVelocity;
      marqueeTrack.parentElement.querySelectorAll(".marquee__track")
        .forEach((track) => { track.style.animationDuration = `${34 / rate}s`; });
      requestAnimationFrame(pulse);
    };
    requestAnimationFrame(pulse);
  }
}

/* ---------- magnetic buttons ---------- */
if (finePointer.matches && !reduceMotion.matches) {
  document.querySelectorAll("[data-magnetic]").forEach((el) => {
    el.addEventListener("pointermove", (event) => {
      const box = el.getBoundingClientRect();
      const x = (event.clientX - box.left - box.width / 2) * .28;
      const y = (event.clientY - box.top - box.height / 2) * .34;
      el.style.transform = `translate(${x}px, ${y}px)`;
      el.style.transition = "transform .1s linear";
    });
    el.addEventListener("pointerleave", () => {
      el.style.transition = "transform .55s cubic-bezier(.2,.8,.2,1)";
      el.style.transform = "";
    });
  });
}

/* ---------- project cards: tilt + image parallax ---------- */
if (finePointer.matches && !reduceMotion.matches) {
  document.querySelectorAll(".project").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const box = card.getBoundingClientRect();
      const nx = (event.clientX - box.left) / box.width - .5;
      const ny = (event.clientY - box.top) / box.height - .5;
      card.style.transform = `perspective(900px) rotateX(${-ny * 5}deg) rotateY(${nx * 5}deg) translateY(-6px)`;
      card.style.setProperty("--px", `${-nx * 22}px`);
      card.style.setProperty("--py", `${-ny * 22}px`);
    });
    card.addEventListener("pointerleave", () => {
      card.style.transition = "transform .6s cubic-bezier(.2,.8,.2,1), color .4s, border-color .4s";
      card.style.transform = "";
      card.style.setProperty("--px", "0px");
      card.style.setProperty("--py", "0px");
      setTimeout(() => { card.style.transition = ""; }, 620);
    });
  });
}

/* ---------- custom cursor ---------- */
const cursor = document.getElementById("cursor");
const cursorRing = document.getElementById("cursorRing");

if (finePointer.matches && !reduceMotion.matches) {
  let mouseX = innerWidth / 2, mouseY = innerHeight / 2;
  let ringX = mouseX, ringY = mouseY;

  addEventListener("pointermove", (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
    cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
  }, { passive: true });

  const followRing = () => {
    ringX = lerp(ringX, mouseX, .16);
    ringY = lerp(ringY, mouseY, .16);
    cursorRing.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
    requestAnimationFrame(followRing);
  };
  requestAnimationFrame(followRing);

  const INTERACTIVE = "a, button, [data-magnetic], .project";
  addEventListener("pointerover", (event) => {
    cursorRing.classList.toggle("is-active", Boolean(event.target.closest(INTERACTIVE)));
  }, { passive: true });
} else {
  cursor?.remove();
  cursorRing?.remove();
}

/* ---------- reveal modal ---------- */
const reveal = document.getElementById("reveal");
const closeButton = document.getElementById("revealClose");
const revealTitle = document.getElementById("revealTitle");
const revealEyebrow = document.getElementById("revealEy");
const revealDescription = document.getElementById("revealDescription");
const revealMeta = document.getElementById("revealMeta");
const revealApp = document.getElementById("revealApp");
const revealAppFrame = document.getElementById("revealAppFrame");
const revealDuo = document.getElementById("revealDuo");
const revealPlaceholder = document.getElementById("revealPlaceholder");
let opener = null;

function trapFocus(event) {
  if (event.key !== "Tab") return;
  const focusable = reveal.querySelectorAll("button, a[href], iframe");
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

function openReveal(project) {
  opener = project;
  const appSrc = project.dataset.app;
  const webSrc = project.dataset.web;
  const isHtml = /\.html?($|\?|#)/i.test(appSrc);

  revealTitle.innerHTML = `<em>${project.dataset.title}</em>`;
  revealEyebrow.textContent = project.dataset.type;
  revealDescription.textContent = project.dataset.description;

  revealMeta.innerHTML = (project.dataset.meta || "")
    .split(",")
    .filter(Boolean)
    .map((tag) => `<span>${tag.trim()}</span>`)
    .join("");
  if (webSrc) {
    revealMeta.insertAdjacentHTML("beforeend",
      `<a class="round-link" style="margin-top:14px" href="${webSrc}" target="_blank" rel="noopener">Visit site <span aria-hidden="true">↗</span></a>`);
  }

  const hasVisual = Boolean(appSrc);
  revealDuo.hidden = !hasVisual;
  revealPlaceholder.hidden = hasVisual;

  if (hasVisual) {
    revealDuo.classList.toggle("html-mockup", isHtml);
    revealApp.hidden = isHtml;
    revealAppFrame.hidden = !isHtml;
    if (isHtml) revealAppFrame.src = appSrc;
    else revealApp.src = appSrc;
  }

  document.body.classList.add("reveal-open");
  reveal.classList.add("is-open");
  reveal.setAttribute("aria-hidden", "false");
  document.querySelector("main").setAttribute("inert", "");
  document.addEventListener("keydown", trapFocus);
  closeButton.focus();
}

function closeReveal() {
  reveal.classList.remove("is-open");
  reveal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("reveal-open");
  document.querySelector("main").removeAttribute("inert");
  document.removeEventListener("keydown", trapFocus);
  // Wait out the fade before tearing down sources, so nothing flickers.
  setTimeout(() => { revealApp.src = ""; revealAppFrame.src = ""; }, 400);
  opener?.focus();
}

document.querySelectorAll(".project").forEach((project) => {
  project.addEventListener("click", () => openReveal(project));
});

closeButton.addEventListener("click", closeReveal);
reveal.addEventListener("click", (event) => { if (event.target === reveal) closeReveal(); });
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && reveal.classList.contains("is-open")) closeReveal();
});

/* ---------- hero signal field ---------- */
const signalCanvas = document.getElementById("signalCanvas");

if (signalCanvas && !reduceMotion.matches) {
  const context = signalCanvas.getContext("2d");
  const COUNT = 46;
  const LINK_DISTANCE = 150;
  const points = Array.from({ length: COUNT }, (_, index) => ({
    x: Math.random(), y: Math.random(),
    vx: (Math.random() - .5) * .0002, vy: (Math.random() - .5) * .0002,
    size: index % 7 === 0 ? 2.6 : 1
  }));

  const pointer = { x: -1, y: -1, active: false };

  signalCanvas.parentElement.parentElement.addEventListener("pointermove", (event) => {
    const box = signalCanvas.getBoundingClientRect();
    pointer.x = (event.clientX - box.left) / box.width;
    pointer.y = (event.clientY - box.top) / box.height;
    pointer.active = true;
  }, { passive: true });

  signalCanvas.parentElement.parentElement.addEventListener("pointerleave", () => { pointer.active = false; });

  const resize = () => {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    signalCanvas.width = signalCanvas.offsetWidth * ratio;
    signalCanvas.height = signalCanvas.offsetHeight * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  let running = true;

  const draw = () => {
    if (!running) return;

    const width = signalCanvas.offsetWidth;
    const height = signalCanvas.offsetHeight;
    const dark = root.classList.contains("dark");
    const ink = dark ? "244,240,232" : "23,23,20";

    context.clearRect(0, 0, width, height);

    points.forEach((point) => {
      point.x += point.vx;
      point.y += point.vy;

      // Push away from the pointer, then drift back on its own.
      if (pointer.active) {
        const dx = (point.x - pointer.x) * width;
        const dy = (point.y - pointer.y) * height;
        const distance = Math.hypot(dx, dy);
        if (distance < 130 && distance > 0) {
          const push = (1 - distance / 130) * .0022;
          point.x += (dx / distance) * push;
          point.y += (dy / distance) * push;
        }
      }

      if (point.x < .02 || point.x > .98) point.vx *= -1;
      if (point.y < .04 || point.y > .96) point.vy *= -1;
      point.x = Math.min(Math.max(point.x, .02), .98);
      point.y = Math.min(Math.max(point.y, .04), .96);
    });

    for (let i = 0; i < points.length; i++) {
      const point = points[i];

      for (let j = i + 1; j < points.length; j++) {
        const peer = points[j];
        const dx = (point.x - peer.x) * width;
        const dy = (point.y - peer.y) * height;
        const distance = Math.hypot(dx, dy);
        if (distance >= LINK_DISTANCE) continue;

        context.beginPath();
        context.strokeStyle = `rgba(${ink}, ${.13 * (1 - distance / LINK_DISTANCE)})`;
        context.lineWidth = .7;
        context.moveTo(point.x * width, point.y * height);
        context.lineTo(peer.x * width, peer.y * height);
        context.stroke();
      }

      // Thread a brighter line from the pointer to whatever is near it.
      if (pointer.active) {
        const dx = (point.x - pointer.x) * width;
        const dy = (point.y - pointer.y) * height;
        const distance = Math.hypot(dx, dy);
        if (distance < LINK_DISTANCE) {
          context.beginPath();
          context.strokeStyle = `rgba(217,93,63, ${.4 * (1 - distance / LINK_DISTANCE)})`;
          context.lineWidth = .9;
          context.moveTo(pointer.x * width, pointer.y * height);
          context.lineTo(point.x * width, point.y * height);
          context.stroke();
        }
      }

      context.beginPath();
      context.fillStyle = point.size > 1 ? "#e47f4f" : `rgba(${ink},.45)`;
      context.arc(point.x * width, point.y * height, point.size, 0, Math.PI * 2);
      context.fill();
    }

    requestAnimationFrame(draw);
  };

  resize();
  addEventListener("resize", resize, { passive: true });
  requestAnimationFrame(draw);

  // Stop burning frames once the hero is off screen or the tab is hidden.
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !running) { running = true; requestAnimationFrame(draw); }
    else if (!entry.isIntersecting) running = false;
  }).observe(signalCanvas);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) running = false;
    else if (!running) { running = true; requestAnimationFrame(draw); }
  });
}
