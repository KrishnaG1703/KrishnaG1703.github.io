gsap.registerPlugin(ScrollTrigger);
gsap.ticker.lagSmoothing(0);

// BULB / DARK MODE
(() => {
  const bulb = document.getElementById("bulb");
  if (!bulb) return;
  bulb.addEventListener("click", () => {
    if (bulb.classList.contains("is-broken")) return;
    bulb.classList.add("is-broken");
    document.documentElement.classList.toggle("dark");
  });
})();

// LOADER
const loaderTl = gsap.timeline({ defaults: { ease: "expo.out" } });
loaderTl
  .to(".loader__k, .loader__g", { y: 0, duration: 1.1, stagger: .15 })
  .to(".loader__fill", { width: "100%", duration: 1.2, ease: "power2.inOut" }, "-=.6")
  .to(".loader__mono", { y: -30, opacity: 0, duration: .6, ease: "power2.in" }, "+=.15")
  .to(".loader", { yPercent: -100, duration: 1, ease: "expo.inOut" }, "-=.2")
  .set(".loader", { display: "none" })
  .from(".nav", { y: -30, opacity: 0, duration: .8 }, "-=.6")
  .from(".name__first", { yPercent: 110, duration: 1.2, ease: "expo.out" }, "-=.6")
  .from(".hero__about", { opacity: 0, y: 20, duration: .8 }, "-=.6")
  .from(".hero__hint", { opacity: 0, y: 10, duration: .6 }, "-=.5");

// scroll reveals
const reveal = (targets, opts = {}) => {
  gsap.utils.toArray(targets).forEach((el) => {
    gsap.from(el, {
      scrollTrigger: { trigger: el, start: "top 85%" },
      y: 40, autoAlpha: 0, duration: 1, ease: "expo.out", ...opts
    });
  });
};

reveal(".work-intro__label, .work-intro__title, .work-intro__note", { stagger: .1 });
reveal(".concept__hd > *", { stagger: .08 });
reveal(".foot__title, .foot__mail", { duration: 1.2 });

// C1: STACKED DECK
(() => {
  const cards = gsap.utils.toArray(".c1__card");
  cards.forEach((c, i) => c.style.setProperty("--i", i));

  const hint = document.getElementById("c1Hint");
  const hintTxt = document.getElementById("c1HintTxt");
  let lastLabel = "";
  const showHint = (label) => {
    if (label && label !== lastLabel) { hintTxt.textContent = label; lastLabel = label; }
    hint.classList.add("is-on");
  };
  const hideHint = () => hint.classList.remove("is-on");

  const labelFor = (card) => {
    const t = card.dataset && card.dataset.title;
    if (!t) return null;
    const has = card.dataset.app || card.dataset.web;
    return has ? `Click to open · ${t}` : `${t} · coming soon`;
  };

  const END = cards.length * 900;
  const segments = cards.length - 1;

  // Fly-off timeline (pins .c1__stage)
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: ".c1",
      start: "top top",
      end: "+=" + END,
      pin: ".c1__stage",
      scrub: 1.5,
      snap: {
        snapTo: (v) => {
          // Snap to each rest slot: 0, 1/segments, 2/segments, ..., 1
          const step = 1 / segments;
          return Math.round(v / step) * step;
        },
        duration: { min: .2, max: .6 },
        delay: .15,
        ease: "power2.inOut"
      }
    }
  });
  cards.slice(0, -1).forEach((c) => {
    tl.to(c, { yPercent: -160, rotate: "+=18", opacity: 0, ease: "power2.in", duration: 1 });
    tl.to({}, { duration: .5 });
  });

  // Hint controller — opacity-driven, not progress-driven.
  // Rule: hint is visible only when NO card is mid-transition.
  //       When settled, label = topmost fully-opaque card.
  //       Handles reverse scroll naturally.
  const REST_HI = 0.985;   // >= this = fully settled
  const REST_LO = 0.015;   // <= this = fully gone
  const updateHintByState = () => {
    let transitioning = false;
    let topIdx = -1;
    for (let i = 0; i < cards.length; i++) {
      const op = parseFloat(getComputedStyle(cards[i]).opacity);
      if (op < REST_HI && op > REST_LO) { transitioning = true; break; }
      if (op >= REST_HI && topIdx === -1) topIdx = i;
    }
    if (transitioning || topIdx < 0) { hideHint(); return; }
    const l = labelFor(cards[topIdx]);
    if (l) showHint(l); else hideHint();
  };

  ScrollTrigger.create({
    trigger: ".c1",
    start: "top top",
    end: "+=" + END,
    onUpdate: updateHintByState,
    onEnter: updateHintByState,
    onEnterBack: updateHintByState,
    onLeave: hideHint,
    onLeaveBack: hideHint
  });

  // Also update on scroll idle (in case ticker throttled) via rAF loop guard.
  requestAnimationFrame(updateHintByState);
})();

// CARD REVEAL
(() => {
  const reveal = document.getElementById("reveal");
  const closeBtn = document.getElementById("revealClose");
  const eyebrow = document.getElementById("revealEy");
  const title = document.getElementById("revealTitle");
  const app = document.getElementById("revealApp");
  const appFrame = document.getElementById("revealAppFrame");
  const web = document.getElementById("revealWeb");
  const duo = document.getElementById("revealDuo");
  const ph = document.getElementById("revealPlaceholder");

  document.querySelectorAll("button.c1__card").forEach((btn) => {
    btn.addEventListener("click", () => {
      const t = btn.dataset.title || "Project";
      title.innerHTML = "<em>" + t + "</em>";
      eyebrow.textContent = "Project";
      const hasContent = btn.dataset.app || btn.dataset.web;
      if (hasContent) {
        duo.hidden = false;
        ph.hidden = true;
        const appSrc = btn.dataset.app || "";
        const isHtml = /\.html?($|\?|#)/i.test(appSrc);
        duo.classList.toggle("bare-phone", !isHtml && btn.dataset.appFramed === "true");
        duo.classList.toggle("html-mockup", isHtml);
        if (isHtml) {
          app.hidden = true; app.src = "";
          appFrame.hidden = false; appFrame.src = appSrc;
        } else {
          appFrame.hidden = true; appFrame.src = "";
          app.hidden = false; app.src = appSrc;
        }
        web.src = btn.dataset.web || "about:blank";
      } else {
        duo.hidden = true;
        ph.hidden = false;
      }
      document.body.classList.add("reveal-open");
      reveal.classList.add("is-open");
      reveal.setAttribute("aria-hidden", "false");
    });
  });

  const close = () => {
    reveal.classList.remove("is-open");
    reveal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("reveal-open");
    setTimeout(() => { web.src = "about:blank"; app.src = ""; appFrame.src = ""; }, 500);
  };
  closeBtn.addEventListener("click", close);
  reveal.addEventListener("click", (e) => { if (e.target === reveal) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && reveal.classList.contains("is-open")) close(); });
})();

// C5: HORIZONTAL RAIL
(() => {
  const rail = document.getElementById("c5Rail");
  if (!rail) return;
  const panels = rail.children.length;
  const distance = () => rail.scrollWidth - window.innerWidth;
  gsap.to(rail, {
    x: () => -distance(),
    ease: "none",
    scrollTrigger: {
      trigger: ".c5",
      start: "top top",
      end: () => "+=" + distance(),
      pin: true,
      scrub: 1,
      invalidateOnRefresh: true
    }
  });
})();
