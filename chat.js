/* ============================================================
   Otter
   The otter from rice, answering the questions a visitor tends to ask
   and handing over a way to book time. Answers are scripted for now:
   ask() is the one seam, so pointing it at a model later means changing
   that function and nothing else.
   ============================================================ */

// Wrapped: this file shares the global scope with main.js, which has its own
// button, panel and close-button bindings.
(() => {
  // Where "book a call" goes. Cal.com free tier, synced to his calendar.
  const CAL_URL = "https://cal.com/krishnaganga";
  const EMAIL = "krishna091718@gmail.com";
  const PHONE = "+918618409464";
  const LINKEDIN = "https://www.linkedin.com/in/krishnaganga1703/";

  const TOPICS = [
    {
      id: "work",
      chip: "What does he build?",
      lines: [
        "He is an AI engineer: LLM systems that run in production, not demos. Agents, RAG pipelines, and the backend underneath them.",
        "Two products shipped so far. <b>rice</b> logs Indian food from a photo, and <b>Moksh</b> is the Bhagavad Gita reimagined, out on both stores."
      ],
      actions: [{ label: "See the work", jump: "#work" }]
    },
    {
      id: "ey",
      chip: "His work at EY",
      lines: [
        "Technical Consultant at EY, working as a Guidewire PolicyCenter developer with hands-on configuration.",
        "He won an Achiever Extraordinaire Award there for that work."
      ],
      actions: [{ label: "Read the detail", jump: "#guidewire" }]
    },
    {
      id: "stack",
      chip: "What is he good at?",
      lines: [
        "Languages: Python, Java, Gosu, SQL, Swift, JavaScript.",
        "Day to day that means the Claude, Gemini and OpenAI APIs, RAG and evaluation work, Cloudflare Workers, Supabase and Postgres, and SwiftUI on the app side. Published at ICSTE 2024."
      ],
      actions: [{ label: "Full toolkit", jump: "#stack" }]
    },
    {
      id: "hire",
      chip: "Is he open to roles?",
      lines: [
        "Yes, for AI and LLM engineering work. The fastest way to get his attention is a short note about what you are building.",
        "A call is usually quicker than a thread, though."
      ],
      actions: [
        { label: "Book a call", href: CAL_URL, external: true },
        { label: "Email him", href: `mailto:${EMAIL}` }
      ]
    },
    {
      id: "call",
      chip: "Book a call",
      lines: [
        "Pick a slot that suits you and it lands straight in his calendar.",
        "If nothing there works, message him and he will find a time."
      ],
      actions: [
        { label: "Open his calendar", href: CAL_URL, external: true },
        { label: "LinkedIn", href: LINKEDIN, external: true }
      ]
    },
    {
      id: "contact",
      chip: "How do I reach him?",
      lines: [
        `Email <a href="mailto:${EMAIL}">${EMAIL}</a>, or call <a href="tel:${PHONE}">+91 86184 09464</a>.`,
        "He is in Bangalore, so IST is the working day."
      ],
      actions: [{ label: "LinkedIn", href: LINKEDIN, external: true }]
    }
  ];

  const GREETING = [
    "Hello. I am the otter from rice.",
    "Ask me about Krishna, or book time with him."
  ];

  /* ---------- the seam ---------- */
  // Scripted today. To put a model behind it, make this fetch a Worker that
  // holds the key and return its reply; nothing else here changes.
  async function ask(topicId) {
    const topic = TOPICS.find((entry) => entry.id === topicId);
    return topic ? { lines: topic.lines, actions: topic.actions } : null;
  }

  const button = document.getElementById("otterButton");
  const panel = document.getElementById("otterPanel");
  const log = document.getElementById("otterLog");
  const chips = document.getElementById("otterChips");
  const closeButton = document.getElementById("otterClose");
  if (button && panel && log && chips) init();

  function init() {
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
    let open = false;
    let greeted = false;
    let busy = false;

    function setOpen(next) {
      if (next === open) return;
      open = next;
      panel.classList.toggle("is-open", open);
      panel.setAttribute("aria-hidden", String(!open));
      button.setAttribute("aria-expanded", String(open));
      button.classList.toggle("is-open", open);
      document.documentElement.classList.toggle("otter-open", open);

      if (open && !greeted) {
        greeted = true;
        say(GREETING, null, true);
      }
      if (open) setTimeout(() => closeButton.focus({ preventScroll: true }), 0);
      else button.focus({ preventScroll: true });
    }

    function bubble(html, who) {
      const row = document.createElement("div");
      row.className = `otter-msg otter-msg--${who}`;
      row.innerHTML = html;
      log.append(row);
      log.scrollTop = log.scrollHeight;
      return row;
    }

    // A pause before each line, so it reads as a reply rather than a dump.
    // Anyone who has asked for less motion gets it all at once.
    function wait(ms) {
      return new Promise((resolve) => setTimeout(resolve, reduceMotion.matches ? 0 : ms));
    }

    async function say(lines, actions, skipTyping) {
      busy = true;
      chips.setAttribute("inert", "");
      for (const [index, line] of lines.entries()) {
        let dots = null;
        if (!skipTyping || index) {
          dots = bubble('<i class="otter-dots"><b></b><b></b><b></b></i>', "bot");
          await wait(index ? 520 : 360);
          dots.remove();
        }
        bubble(line, "bot");
        await wait(120);
      }
      if (actions && actions.length) {
        const row = document.createElement("div");
        row.className = "otter-actions";
        for (const action of actions) {
          const link = document.createElement("a");
          link.textContent = action.label;
          if (action.jump) {
            link.href = action.jump;
            link.addEventListener("click", () => setOpen(false));
          } else {
            link.href = action.href;
            if (action.external) { link.target = "_blank"; link.rel = "noopener"; }
          }
          row.append(link);
        }
        log.append(row);
        log.scrollTop = log.scrollHeight;
      }
      chips.removeAttribute("inert");
      busy = false;
    }

    for (const topic of TOPICS) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.textContent = topic.chip;
      chip.addEventListener("click", async () => {
        if (busy) return;
        bubble(topic.chip, "you");
        const reply = await ask(topic.id);
        if (reply) say(reply.lines, reply.actions);
      });
      chips.append(chip);
    }

    button.addEventListener("click", () => setOpen(!open));
    closeButton.addEventListener("click", () => setOpen(false));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && open) setOpen(false);
    });
  }

})();
