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
let wakeMarquee = () => {};

addEventListener("scroll", () => {
  const y = scrollY;
  const max = document.body.scrollHeight - innerHeight;
  progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

  nav.classList.toggle("is-scrolled", y > 20);
  // Hide going down past the hero, show the moment the user scrolls back up.
  nav.classList.toggle("is-hidden", y > lastScroll && y > 500);

  scrollVelocity = Math.min(Math.abs(y - lastScroll) / 14, 3);
  lastScroll = y;
  wakeMarquee();
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

// No perpetual timer: the observers above are the normal path, and these
// cover the one case they miss — a tab that was backgrounded while loading,
// where observer callbacks are not delivered.
setTimeout(rescueHidden, 1500);
setTimeout(rescueHidden, 4000);
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

    if (t < 1 && !document.hidden) requestAnimationFrame(run);
    else el.textContent = final;
  };

  // The effect destroys the real text before restoring it, so it only ever
  // runs while the page is genuinely visible. A backgrounded tab freezes rAF
  // and clamps timers, which would otherwise leave garbage on screen.
  const finish = () => { el.textContent = final; };

  const begin = () => {
    if (document.hidden) return;
    start = 0;
    requestAnimationFrame(run);
    setTimeout(finish, duration + 400);
  };

  document.addEventListener("visibilitychange", () => { if (document.hidden) finish(); });
  setTimeout(begin, 300);
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
    const tracks = [...marqueeTrack.parentElement.querySelectorAll(".marquee__track")];
    let applied = null;

    // Writing animationDuration restarts the animation and forces a style
    // recalc, so only write when the rounded value actually changes rather
    // than on every frame.
    let pulsing = false;

    const pulse = () => {
      scrollVelocity *= .92;
      const seconds = Math.round((34 / (1 + scrollVelocity)) * 4) / 4;
      if (seconds !== applied) {
        applied = seconds;
        tracks.forEach((track) => { track.style.animationDuration = `${seconds}s`; });
      }
      // Park the loop once the marquee is back at rest; scrolling wakes it.
      if (scrollVelocity > .01) requestAnimationFrame(pulse);
      else pulsing = false;
    };

    wakeMarquee = () => {
      if (pulsing) return;
      pulsing = true;
      requestAnimationFrame(pulse);
    };
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
    let queued = false;
    let nx = 0, ny = 0;

    const apply = () => {
      queued = false;
      card.style.transform = `perspective(900px) rotateX(${-ny * 5}deg) rotateY(${nx * 5}deg) translateY(-6px)`;
      card.style.setProperty("--px", `${-nx * 22}px`);
      card.style.setProperty("--py", `${-ny * 22}px`);
    };

    // Pointer events fire faster than the display refreshes; coalesce them.
    card.addEventListener("pointermove", (event) => {
      const box = card.getBoundingClientRect();
      nx = (event.clientX - box.left) / box.width - .5;
      ny = (event.clientY - box.top) / box.height - .5;
      if (!queued) { queued = true; requestAnimationFrame(apply); }
    }, { passive: true });
    card.addEventListener("pointerleave", () => {
      card.style.transition = "transform .6s cubic-bezier(.2,.8,.2,1), color .4s, border-color .4s";
      card.style.transform = "";
      card.style.setProperty("--px", "0px");
      card.style.setProperty("--py", "0px");
      setTimeout(() => { card.style.transition = ""; }, 620);
    });
  });
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

/* ---------- hero index: pointer peek + jump to project ---------- */
let startPeekFollow = null;
const peek = document.getElementById("peek");
const heroIndex = document.getElementById("heroIndex");

if (heroIndex) {
  const cardFor = (key) => document.querySelector(`.project--${key}`);

  heroIndex.querySelectorAll("button").forEach((row) => {
    // Reuse the existing modal rather than duplicating the project content.
    row.addEventListener("click", () => cardFor(row.dataset.jump)?.click());

    if (!peek || !finePointer.matches || reduceMotion.matches) return;

    row.addEventListener("pointerenter", (event) => {
      peek.style.backgroundImage = `url('${row.dataset.peek}')`;
      peek.classList.add("is-visible");
      startPeekFollow?.(event.clientX, event.clientY);
    });
    row.addEventListener("pointerleave", () => peek.classList.remove("is-visible"));
  });

  if (peek && finePointer.matches && !reduceMotion.matches) {
    let peekX = 0, peekY = 0, targetX = 0, targetY = 0;

    let following = false;

    const follow = () => {
      peekX = lerp(peekX, targetX, .12);
      peekY = lerp(peekY, targetY, .12);
      peek.style.translate = `${peekX}px ${peekY}px`;
      // Only worth a frame while the thumbnail is actually on screen.
      if (peek.classList.contains("is-visible")) requestAnimationFrame(follow);
      else following = false;
    };

    heroIndex.addEventListener("pointermove", (event) => {
      targetX = event.clientX;
      targetY = event.clientY;
      if (!following && peek.classList.contains("is-visible")) {
        following = true;
        requestAnimationFrame(follow);
      }
    }, { passive: true });

    startPeekFollow = (x, y) => {
      // Seed the position so the thumbnail appears under the pointer
      // instead of sliding in from wherever it was last left.
      peekX = targetX = x;
      peekY = targetY = y;
      peek.style.translate = `${x}px ${y}px`;
      if (following) return;
      following = true;
      requestAnimationFrame(follow);
    };
  }
}

/* ---------- hero flow field ----------
   Particles ride a smooth vector field built from summed sines — cheap,
   dependency-free, and it drifts like ink on paper rather than reading as
   the usual connected-dots network. The pointer adds a local swirl. */
const signalCanvas = document.getElementById("signalCanvas");

if (signalCanvas && !reduceMotion.matches) {
  const context = signalCanvas.getContext("2d", { alpha: true });
  const COUNT = 340;
  const SPEED = 1.6;

  let width = 0;
  let height = 0;
  let paper = "#f5f2eb";
  let inkStroke = "rgba(23,23,20,.34)";
  let accentStroke = "rgba(217,93,63,.5)";

  const readPalette = () => {
    const styles = getComputedStyle(document.documentElement);
    paper = styles.getPropertyValue("--paper").trim() || "#f5f2eb";
    const dark = root.classList.contains("dark");
    inkStroke = dark ? "rgba(244,240,232,.20)" : "rgba(23,23,20,.17)";
    accentStroke = dark ? "rgba(255,154,118,.5)" : "rgba(217,93,63,.42)";
  };

  const particles = Array.from({ length: COUNT }, () => ({
    x: Math.random(),
    y: Math.random(),
    life: Math.random() * 220,
    accent: Math.random() < .07
  }));

  const pointer = { x: 0, y: 0, active: false };

  const resize = () => {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    width = signalCanvas.offsetWidth;
    height = signalCanvas.offsetHeight;
    signalCanvas.width = width * ratio;
    signalCanvas.height = height * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = paper;
    context.fillRect(0, 0, width, height);
  };

  // Smooth, seamless-enough angle field. Not true Perlin noise, but the
  // three-sine sum has no visible tiling at this scale and costs almost nothing.
  // Low frequencies on purpose: neighbouring particles must agree on a
  // direction, otherwise the field scatters into dust instead of streamlines.
  const fieldAngle = (x, y, t) =>
    (Math.sin(x * 1.6 + t) + Math.sin(y * 1.3 - t * .7) + Math.sin((x + y) * 1.05 + t * .4)) * 1.7;

  const hero = signalCanvas.closest(".hero");

  hero?.addEventListener("pointermove", (event) => {
    const box = signalCanvas.getBoundingClientRect();
    pointer.x = (event.clientX - box.left) / box.width;
    pointer.y = (event.clientY - box.top) / box.height;
    pointer.active = true;
  }, { passive: true });

  hero?.addEventListener("pointerleave", () => { pointer.active = false; });

  let running = true;
  let time = 0;

  const draw = () => {
    if (!running) return;

    time += .0016;

    // Fade the previous frame toward the paper colour to leave soft trails.
    context.globalAlpha = .013;
    context.fillStyle = paper;
    context.fillRect(0, 0, width, height);
    context.globalAlpha = 1;

    context.lineWidth = .75;
    context.beginPath();
    context.strokeStyle = inkStroke;

    let accentPath = null;

    particles.forEach((particle) => {
      let angle = fieldAngle(particle.x, particle.y, time);

      // Swirl the field around the pointer instead of simply repelling.
      if (pointer.active) {
        const dx = particle.x - pointer.x;
        const dy = particle.y - pointer.y;
        const distance = Math.hypot(dx, dy);
        if (distance < .18) {
          const strength = (1 - distance / .18) * 2.6;
          angle += Math.atan2(dy, dx) * strength;
        }
      }

      const nx = particle.x + (Math.cos(angle) * SPEED) / width;
      const ny = particle.y + (Math.sin(angle) * SPEED) / height;

      if (particle.accent) {
        if (!accentPath) accentPath = new Path2D();
        accentPath.moveTo(particle.x * width, particle.y * height);
        accentPath.lineTo(nx * width, ny * height);
      } else {
        context.moveTo(particle.x * width, particle.y * height);
        context.lineTo(nx * width, ny * height);
      }

      particle.x = nx;
      particle.y = ny;

      // Respawn when a particle leaves the canvas or outlives its lifetime,
      // which keeps the field from collapsing into a few attractor lines.
      if (particle.life-- < 0 || particle.x < 0 || particle.x > 1 || particle.y < 0 || particle.y > 1) {
        particle.x = Math.random();
        particle.y = Math.random();
        particle.life = 120 + Math.random() * 220;
      }
    });

    context.stroke();

    if (accentPath) {
      context.strokeStyle = accentStroke;
      context.lineWidth = 1.1;
      context.stroke(accentPath);
    }

    requestAnimationFrame(draw);
  };

  readPalette();
  resize();
  addEventListener("resize", resize, { passive: true });
  requestAnimationFrame(draw);

  // The trail colour is baked into the canvas, so a theme flip needs a repaint.
  new MutationObserver(() => { readPalette(); resize(); })
    .observe(root, { attributes: true, attributeFilter: ["class"] });

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
