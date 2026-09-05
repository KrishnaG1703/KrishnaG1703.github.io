/* ---------- loading screen ---------- */
const loader = document.getElementById("loader");

if (loader) {
  const fill = document.getElementById("loaderFill");
  const pct = document.getElementById("loaderPct");
  document.documentElement.classList.add("is-loading");

  let shown = 0;
  let done = false;

  const lift = () => {
    if (done) return;
    done = true;
    shown = 100;
    fill.style.width = "100%";
    pct.textContent = "100";
    setTimeout(() => {
      loader.classList.add("is-done");
      document.documentElement.classList.remove("is-loading");
      document.body.classList.add("is-ready");
    }, 260);
  };

  // Creep toward 90 on a timer, then jump to 100 when the page is actually
  // loaded. Never let a slow asset hold the visitor at a frozen bar.
  const creep = () => {
    if (done) return;
    shown = Math.min(shown + Math.random() * 9, 90);
    fill.style.width = shown + "%";
    pct.textContent = Math.round(shown);
    setTimeout(creep, 90 + Math.random() * 120);
  };
  creep();

  if (document.readyState === "complete") setTimeout(lift, 500);
  else addEventListener("load", () => setTimeout(lift, 350), { once: true });

  // Hard ceiling so the site is never gated behind a stalled request.
  setTimeout(lift, 3200);
}

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

// Reading scrollHeight inside the scroll handler forced a full layout on every
// single scroll event. It only changes when the page does, so it is measured
// once and refreshed on resize.
let scrollMax = 0;
const measureScroll = () => {
  scrollMax = document.documentElement.scrollHeight - innerHeight;
};
measureScroll();
addEventListener("resize", measureScroll, { passive: true });
addEventListener("load", measureScroll, { once: true });

let navScrolled = false;
let navHidden = false;
let scrollQueued = false;

const onScrollFrame = () => {
  scrollQueued = false;
  const y = scrollY;

  progress.style.transform = `scaleX(${scrollMax > 0 ? y / scrollMax : 0})`;

  // Toggle only on an actual state change: writing the same class every frame
  // invalidates style for the nav subtree for nothing.
  const scrolled = y > 20;
  if (scrolled !== navScrolled) {
    navScrolled = scrolled;
    nav.classList.toggle("is-scrolled", scrolled);
  }

  // Hide going down past the hero, show the moment the user scrolls back up.
  const hidden = y > lastScroll && y > 500;
  if (hidden !== navHidden) {
    navHidden = hidden;
    nav.classList.toggle("is-hidden", hidden);
  }

  lastScroll = y;
};

// Scroll events fire faster than the display refreshes; coalesce to one frame.
addEventListener("scroll", () => {
  if (scrollQueued) return;
  scrollQueued = true;
  requestAnimationFrame(onScrollFrame);
}, { passive: true });

/* ---------- entrance ---------- */
// Belt and braces: if the loader is ever absent, the hero must still reveal.
setTimeout(() => document.body.classList.add("is-ready"), 3600);

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

/* The marquee is a pure CSS animation now: see .marquee__track. Driving it
   from script meant it shared the main thread with scrolling, which is what
   made it stutter. Nothing here touches it. */

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

/* The deck cards deliberately have no pointer-tracking tilt. Each card's
   place in the fan is carried by its own transform, and writing an inline
   transform on pointermove replaced that transform, dragging the outer cards
   toward the centre and into Moksh. The cards hold still; the hover state is
   the artwork reveal alone. */

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

/* ---------- shatter ----------
   The card breaks into a grid of shards, each one painted with the slice of
   the card's own artwork that sat at that position, so the pieces genuinely
   look like fragments of the card rather than generic confetti. */
const shatterLayer = document.getElementById("shatter");
const COLS = 6;
const ROWS = 8;

let activeShatter = null;

// Retire a break rather than refusing the next one: a boolean guard would
// dead-end the whole deck if its cleanup timer were ever delayed, which is
// exactly what happens to timers in a backgrounded tab.
function clearShatter() {
  if (!activeShatter) return;
  clearTimeout(activeShatter.timer);
  activeShatter.box.remove();
  activeShatter.card.classList.remove("is-shattering");
  activeShatter = null;
}

function shatter(card, done) {
  clearShatter();
  if (!shatterLayer || reduceMotion.matches) { done(); return; }

  const deckBox = (card.offsetParent || document.body).getBoundingClientRect();
  const width = card.offsetWidth;
  const height = card.offsetHeight;
  const styles = getComputedStyle(card);
  const image = styles.getPropertyValue("--image").trim();
  const tint = styles.backgroundColor;

  // The cards sit at a rotation, so the shards are laid out in the card's own
  // untransformed space inside a wrapper that carries the card's current
  // transform. Using the bounding rect instead would misalign every piece.
  const box = document.createElement("div");
  box.className = "shard-box";
  box.style.cssText = `left:${deckBox.left + card.offsetLeft}px;top:${deckBox.top + card.offsetTop}px;` +
    `width:${width}px;height:${height}px;transform:${styles.transform};` +
    `transform-origin:${styles.transformOrigin};border-radius:${styles.borderRadius};`;

  const tileW = width / COLS;
  const tileH = height / ROWS;
  const shards = [];

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const shard = document.createElement("div");
      shard.className = "shard";
      shard.style.cssText = `left:${col * tileW}px;top:${row * tileH}px;` +
        `width:${tileW + .5}px;height:${tileH + .5}px;background-color:${tint};` +
        `background-image:linear-gradient(180deg, rgba(10,10,10,.22), rgba(10,10,10,.82)), ${image};` +
        `background-size:${width}px ${height}px;` +
        `background-position:${-col * tileW}px ${-row * tileH}px;`;
      box.append(shard);
      shards.push({ node: shard, col, row });
    }
  }

  shatterLayer.append(box);
  card.classList.add("is-shattering");

  shards.forEach(({ node, col, row }) => {
    // Blow outwards from the middle of the card so the break reads as an impact.
    const dx = (col - (COLS - 1) / 2) / COLS;
    const dy = (row - (ROWS - 1) / 2) / ROWS;
    const spread = 260 + Math.random() * 260;

    node.animate([
      { transform: "translate3d(0,0,0) rotate(0deg)", opacity: 1 },
      {
        transform: `translate3d(${dx * spread}px, ${dy * spread + 150}px, 0) ` +
                   `rotate(${(Math.random() - .5) * 100}deg) scale(${.35 + Math.random() * .4})`,
        opacity: 0
      }
    ], {
      duration: 640 + Math.random() * 340,
      delay: Math.abs(dx) * 90 + Math.random() * 60,
      easing: "cubic-bezier(.2,.7,.3,1)",
      fill: "forwards"
    });
  });

  activeShatter = { box, card, timer: setTimeout(clearShatter, 1200) };

  // Open the project just after the break starts, so the two read as one move.
  setTimeout(done, 320);
}

document.querySelectorAll(".project").forEach((project) => {
  project.addEventListener("click", () => shatter(project, () => openReveal(project)));
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
    row.addEventListener("click", () => {
      const card = cardFor(row.dataset.jump);
      if (!card) return;
      // Only worth breaking the card if the visitor can actually see it.
      const box = card.getBoundingClientRect();
      if (box.top < innerHeight && box.bottom > 0) card.click();
      else openReveal(card);
    });

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
   Particles ride a smooth vector field built from summed sines and leave ink
   trails. It paints itself in on load, reaches its settled state, and then
   stops for good.

   It used to animate forever, which meant a canvas repaint competing with the
   page for the main thread on every single frame, including while scrolling.
   The motion is barely perceptible once settled, so there is nothing to gain
   from keeping it running and a smooth scroll to lose. */
const signalCanvas = document.getElementById("signalCanvas");

if (signalCanvas && !reduceMotion.matches) {
  const context = signalCanvas.getContext("2d", { alpha: true });

  const INK_COUNT = 76;
  const CORAL_COUNT = 34;
  const BLUE_COUNT = 30;
  const SPEED = 1.6;
  const SETTLE_FRAMES = 430;

  let width = 0;
  let height = 0;
  let paper = "#f7f0dd";
  let inkStroke = "rgba(23,23,20,.14)";
  let coralStroke = "rgba(217,93,63,.5)";
  let blueStroke = "rgba(63,112,212,.44)";

  const readPalette = () => {
    const styles = getComputedStyle(document.documentElement);
    paper = styles.getPropertyValue("--paper").trim() || "#f7f0dd";
    const dark = root.classList.contains("dark");
    inkStroke = dark ? "rgba(244,240,232,.16)" : "rgba(23,23,20,.14)";
    coralStroke = dark ? "rgba(255,154,118,.58)" : "rgba(217,93,63,.5)";
    blueStroke = dark ? "rgba(142,175,255,.5)" : "rgba(63,112,212,.44)";
  };

  const makeParticles = (n, tone) => Array.from({ length: n }, () => ({
    x: Math.random(),
    y: Math.random(),
    life: Math.random() * 220,
    tone
  }));

  let particles = [];

  const resize = () => {
    // A soft, diffuse texture does not need a full device pixel ratio backing
    // store, and the fill cost scales with every one of those pixels.
    const ratio = Math.min(devicePixelRatio || 1, 1.25);
    width = signalCanvas.offsetWidth;
    height = signalCanvas.offsetHeight;
    signalCanvas.width = width * ratio;
    signalCanvas.height = height * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = paper;
    context.fillRect(0, 0, width, height);
  };

  // Low frequencies on purpose: neighbouring particles must agree on a
  // direction, otherwise the field scatters into dust instead of streamlines.
  const fieldAngle = (x, y, t) =>
    (Math.sin(x * 1.6 + t) + Math.sin(y * 1.3 - t * .7) + Math.sin((x + y) * 1.05 + t * .4)) * 1.7;

  let frames = 0;
  let time = 0;
  let queued = false;

  const step = () => {
    queued = false;
    time += .0016;

    // Fade the previous frame toward the paper colour to leave soft trails.
    context.globalAlpha = .013;
    context.fillStyle = paper;
    context.fillRect(0, 0, width, height);
    context.globalAlpha = 1;

    const inkPath = new Path2D();
    const coralPath = new Path2D();
    const bluePath = new Path2D();

    for (const particle of particles) {
      const angle = fieldAngle(particle.x, particle.y, time);
      const nx = particle.x + (Math.cos(angle) * SPEED) / width;
      const ny = particle.y + (Math.sin(angle) * SPEED) / height;

      const path = particle.tone === "coral" ? coralPath
                 : particle.tone === "blue" ? bluePath
                 : inkPath;
      path.moveTo(particle.x * width, particle.y * height);
      path.lineTo(nx * width, ny * height);

      particle.x = nx;
      particle.y = ny;

      // Respawn when a particle leaves the canvas or outlives its lifetime,
      // which keeps the field from collapsing into a few attractor lines.
      if (particle.life-- < 0 || particle.x < 0 || particle.x > 1 || particle.y < 0 || particle.y > 1) {
        particle.x = Math.random();
        particle.y = Math.random();
        particle.life = 120 + Math.random() * 220;
      }
    }

    context.lineWidth = .95;
    context.strokeStyle = inkStroke;
    context.stroke(inkPath);

    // The coloured strokes sit slightly heavier so a smaller number of them
    // still carries the field.
    context.lineWidth = 1.35;
    context.strokeStyle = coralStroke;
    context.stroke(coralPath);

    context.strokeStyle = blueStroke;
    context.stroke(bluePath);

    if (++frames < SETTLE_FRAMES && !queued) {
      queued = true;
      requestAnimationFrame(step);
    }
  };

  const render = () => {
    readPalette();
    resize();
    particles = [
      ...makeParticles(INK_COUNT, "ink"),
      ...makeParticles(CORAL_COUNT, "coral"),
      ...makeParticles(BLUE_COUNT, "blue")
    ];
    frames = 0;
    time = 0;
    if (!queued) {
      queued = true;
      requestAnimationFrame(step);
    }
  };

  render();

  // Repaint only when the canvas it is painted into actually changes.
  let resizeTimer = 0;
  addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(render, 220);
  }, { passive: true });

  // The trail colour is baked into the pixels, so a theme flip needs a repaint.
  new MutationObserver(render).observe(root, { attributes: true, attributeFilter: ["class"] });
}
