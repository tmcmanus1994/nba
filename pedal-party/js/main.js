/* ════════════════════════════════════════════════════════════════
   PEDAL PARTY — main.js
   One init function per page section (mirrors index.html order) so
   each block ports cleanly to a Framer section later.
   Motion: GSAP + ScrollTrigger + Lenis (vendored).

   ScrollTrigger ordering law: pinned scenes are created FIRST
   (initHeroPin), all other triggers after — creation order is
   refresh order.
   ════════════════════════════════════════════════════════════════ */

import { fetchRides, resolveRideState, planSteps, INSTAGRAM_URL } from "./rideState.js";

/* ── Swappable config ────────────────────────────────────────── */
// Formspree (or equivalent) endpoint. Placeholder → form simulates success.
const FORM_ENDPOINT = "https://formspree.io/f/YOUR_FORM_ID";

// Gallery photos: swap these nine URLs for real ride photos.
const GALLERY_PHOTOS = [
  "assets/placeholder-01.jpg", "assets/placeholder-02.jpg", "assets/placeholder-03.jpg",
  "assets/placeholder-04.jpg", "assets/placeholder-05.jpg", "assets/placeholder-06.jpg",
  "assets/placeholder-07.jpg", "assets/placeholder-08.jpg", "assets/placeholder-09.jpg"
];

/* ── Boot flags (dev contract) ───────────────────────────────── */
const params = new URLSearchParams(location.search);
const JUMP = params.get("jump");                    // ?jump=<scrollY> → land pre-scrolled, settled
const STATE_OVERRIDE = params.get("state");         // ?state=live|countdown|no_ride|weather_cancel|off_season
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const ANIMATE = !REDUCED && JUMP === null;          // entrance/idle animation allowed
if (JUMP !== null) history.scrollRestoration = "manual";

gsap.registerPlugin(ScrollTrigger);

/* ── Lenis smooth scroll (skipped for reduced motion / ?jump) ── */
let lenis = null;
if (ANIMATE) {
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* Anchor navigation (offset for the sticky header). */
function initAnchors() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener("click", e => {
      const target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      closeNav();
      if (lenis) lenis.scrollTo(target, { offset: -64 });
      else target.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth" });
    });
  });
}

/* ════════ SECTION 1 · SiteHeader + sticker-stack dropdown menu ════════ */
const headerEl = document.querySelector("[data-header]");
const menuWrap = document.querySelector("[data-menu-wrap]");
const menuBtn = document.querySelector("[data-menu-btn]");
const menuDropdown = document.querySelector("[data-menu-dropdown]");

function openNav() {
  menuDropdown.classList.remove("is-closing");
  menuDropdown.classList.add("is-open");
  menuDropdown.setAttribute("aria-hidden", "false");
  menuBtn.setAttribute("aria-expanded", "true");
}
function closeNav() {
  if (!menuDropdown.classList.contains("is-open")) return;
  menuDropdown.classList.remove("is-open");
  menuDropdown.classList.add("is-closing");
  menuDropdown.setAttribute("aria-hidden", "true");
  menuBtn.setAttribute("aria-expanded", "false");
  setTimeout(() => menuDropdown.classList.remove("is-closing"), 380);
}
function initHeader() {
  menuBtn.addEventListener("click", () =>
    menuDropdown.classList.contains("is-open") ? closeNav() : openNav());
  // click-away + Escape close the stack
  addEventListener("click", e => { if (!menuWrap.contains(e.target)) closeNav(); });
  addEventListener("keydown", e => { if (e.key === "Escape") closeNav(); });

  // compact purple bar once scrolled past the hero
  ScrollTrigger.create({
    trigger: ".hero",
    start: "bottom top+=80",
    onEnter: () => {
      headerEl.classList.add("is-stuck");
      if (ANIMATE) gsap.fromTo(headerEl, { yPercent: -100 }, { yPercent: 0, duration: .4, ease: "back.out(1.4)" });
    },
    onLeaveBack: () => headerEl.classList.remove("is-stuck")
  });

  // logo wheel spins gently with scroll velocity
  const wheel = document.querySelector("[data-header-wheel]");
  let rot = 0;
  ScrollTrigger.create({
    onUpdate: self => {
      rot += self.getVelocity() / 260;
      gsap.set(wheel, { rotation: rot % 360, transformOrigin: "50% 50%" });
    }
  });
}

/* ════════ SECTION 2 · Hero ════════ */

/* Pinned "opening shot": brief pin while the copy rides up and away.
   MUST be the first ScrollTrigger created (pin spacer ordering law). */
function initHeroPin() {
  if (!ANIMATE) return;
  gsap.timeline({
    scrollTrigger: { trigger: ".hero", start: "top top", end: "+=45%", scrub: true, pin: true }
  })
    .to(".hero-copy", { yPercent: -28, autoAlpha: 0, ease: "none" }, 0)
    .to(".hero-photo--1", { xPercent: -55, yPercent: -25, rotation: -16, ease: "none" }, 0)
    .to(".hero-photo--2", { xPercent: 55, yPercent: -30, rotation: 14, ease: "none" }, 0)
    .to(".hero-photo--3", { xPercent: 65, yPercent: 20, rotation: -12, ease: "none" }, 0)
    .to(".hero-layer--scene", { scale: 1.05, transformOrigin: "50% 90%", ease: "none" }, 0);
}

/* Char-split sticker-slap entrance for the H1 + staged hero intro. */
function initHeroIntro() {
  const title = document.querySelector("[data-hero-title]");
  const text = title.textContent;
  title.setAttribute("aria-label", text);
  title.textContent = "";
  [...text].forEach(ch => {
    const span = document.createElement("span");
    span.className = "char";
    span.textContent = ch === " " ? " " : ch;
    span.setAttribute("aria-hidden", "true");
    title.appendChild(span);
  });
  if (!ANIMATE) return;

  const tl = gsap.timeline({ defaults: { ease: "back.out(1.7)" } });
  tl.from("[data-hero-sticker]", { scale: 0, rotation: -30, duration: .45 })
    .from(".hero-title .char", {
      yPercent: 130, rotation: () => gsap.utils.random(-14, 14),
      opacity: 0, duration: .55, stagger: .045
    }, "-=.15")
    .from("[data-hero-sub]", { y: 26, opacity: 0, duration: .5, ease: "power3.out" }, "-=.25")
    .from("[data-hero-ctas] .btn", { y: 30, opacity: 0, scale: .8, duration: .45, stagger: .12 }, "-=.2")
    .from("[data-hero-photo]", { y: 60, opacity: 0, rotation: 0, duration: .6, stagger: .14, ease: "power3.out" }, "-=.5");
}

/* The two-layer hero film.
   Layer A [data-layer="scene"]  — environment scenes, crossfaded every ~6s.
     (Final After Effects Lottie drops into this layer: replace the SVGs
      with the Lottie mount and keep the same crossfade contract.)
   Layer B [data-layer="rider"] — persistent looping cyclist.
     Wheels + crank spin; legs are posed per-frame with 2-bone IK. */
function initHeroFilm() {
  const scenes = gsap.utils.toArray(".hero-scene");

  if (ANIMATE && scenes.length > 1) {
    // Scene cycle: crossfade every 6s (Framer note: simple opacity swap)
    let idx = 0;
    setInterval(() => {
      const next = (idx + 1) % scenes.length;
      gsap.to(scenes[idx], { opacity: 0, duration: 1.2, ease: "power2.inOut" });
      gsap.to(scenes[next], { opacity: 1, duration: 1.2, ease: "power2.inOut" });
      idx = next;
    }, 6000);
    // ambient cloud drift
    gsap.utils.toArray(".scene-cloud").forEach((c, i) => {
      gsap.to(c, { x: i % 2 ? -60 : 60, duration: 14 + i * 3, yoyo: true, repeat: -1, ease: "sine.inOut" });
    });
  }

  // ── Layer B: rider ──
  const rider = document.querySelector("[data-rider]");
  const spokes = rider.querySelectorAll("[data-spokes]");
  const crank = rider.querySelector("[data-crank]");
  const roadDash = document.querySelector("[data-road-dash]");
  const legs = {
    nearThigh: rider.querySelector('[data-leg="near-thigh"]'),
    nearShin: rider.querySelector('[data-leg="near-shin"]'),
    farThigh: rider.querySelector('[data-leg="far-thigh"]'),
    farShin: rider.querySelector('[data-leg="far-shin"]')
  };

  const HIP = { x: 121, y: 90 };        // rider hip joint
  const BB = { x: 150, y: 160 };        // bottom bracket (crank center)
  const CRANK_R = 22, THIGH = 47, SHIN = 44;

  // 2-bone IK: knee position for a hip→foot chain (knee bends forward)
  function knee(hip, foot) {
    const dx = foot.x - hip.x, dy = foot.y - hip.y;
    const d = Math.min(Math.hypot(dx, dy), THIGH + SHIN - 0.5);
    const base = Math.atan2(dy, dx);
    const cos = (THIGH * THIGH + d * d - SHIN * SHIN) / (2 * THIGH * d);
    const a = base - Math.acos(Math.max(-1, Math.min(1, cos)));
    return { x: hip.x + THIGH * Math.cos(a), y: hip.y + THIGH * Math.sin(a) };
  }
  function poseLeg(thighEl, shinEl, angle) {
    const foot = { x: BB.x + CRANK_R * Math.cos(angle), y: BB.y + CRANK_R * Math.sin(angle) };
    const k = knee(HIP, foot);
    thighEl.setAttribute("d", `M${HIP.x} ${HIP.y} L${k.x.toFixed(1)} ${k.y.toFixed(1)}`);
    shinEl.setAttribute("d", `M${k.x.toFixed(1)} ${k.y.toFixed(1)} L${foot.x.toFixed(1)} ${foot.y.toFixed(1)}`);
  }

  let pedal = -Math.PI / 3;
  const pose = () => {
    poseLeg(legs.nearThigh, legs.nearShin, pedal);
    poseLeg(legs.farThigh, legs.farShin, pedal + Math.PI);
    gsap.set(crank, { rotation: (pedal * 180 / Math.PI) + 90 });
  };
  pose(); // static pose even under reduced motion

  if (ANIMATE) {
    let dashOffset = 0;
    gsap.ticker.add((t, dtMs) => {
      const dt = dtMs / 1000;
      pedal += dt * 4.6;                       // cadence
      pose();
      spokes.forEach(s => gsap.set(s, { rotation: (t * 260) % 360 }));
      dashOffset -= dt * 190;                  // road slides beneath the rider
      roadDash.setAttribute("stroke-dashoffset", dashOffset.toFixed(1));
    });
    gsap.to(rider, { y: -5, duration: .38, yoyo: true, repeat: -1, ease: "sine.inOut" });

    // floating snapshot idle bob (staggered so they never sync)
    gsap.utils.toArray("[data-hero-photo]").forEach((p, i) => {
      gsap.to(p, { y: i % 2 ? 14 : -14, duration: 2.6 + i * .5, yoyo: true, repeat: -1, ease: "sine.inOut", delay: i * .4 });
    });
  }
}

/* ════════ SECTION 3 · Word Marquee ════════ */
function initMarquee() {
  const track = document.querySelector("[data-marquee-track]");
  const group = document.querySelector("[data-marquee-group]");
  // duplicate the word group for a seamless -50% loop
  track.appendChild(group.cloneNode(true));
  if (!ANIMATE) return;

  const tween = gsap.to(track, { xPercent: -50, duration: 22, repeat: -1, ease: "none" });

  // slow (never stop) while hovered so words are catchable
  const strip = document.querySelector("[data-marquee]");
  strip.addEventListener("mouseenter", () => gsap.to(tween, { timeScale: .22, duration: .5 }));
  strip.addEventListener("mouseleave", () => gsap.to(tween, { timeScale: 1, duration: .5 }));

  // scroll-velocity skew
  const skewTo = gsap.quickTo(strip, "skewX", { duration: .4, ease: "power2.out" });
  ScrollTrigger.create({
    onUpdate: self => skewTo(gsap.utils.clamp(-8, 8, self.getVelocity() / -220))
  });
}

/* ════════ SECTION 4 · Next Ride (state machine renderer) ════════ */
const esc = s => String(s ?? "").replace(/[&<>"']/g,
  c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const PLAN_COLORS = ["#e01226", "#359fb5", "#e18b12", "#5f13a9", "#33b754", "#cc107e"];

function countdownHTML(label) {
  return `
    <div class="countdown" data-countdown aria-label="${esc(label)}">
      ${["Days", "Hours", "Mins", "Secs"].map((l, i) => `
        <span class="cd-cell" style="--cd-bg:${["#5f13a9", "#bc1184", "#e18b12", "#359fb5"][i]}; --cd-rot:${[-2, 1.5, -1, 2][i]}deg">
          <span class="cd-num" data-cd="${l.toLowerCase()}">–</span>
          <span class="cd-label">${l}</span>
        </span>`).join("")}
    </div>`;
}

function liveHTML(row) {
  const steps = planSteps(row.plan);
  const facts = [
    row.location && `📍 ${esc(row.location)}`,
    row.gather_time && `🕕 Gather ${esc(row.gather_time)}`,
    row.roll_time && `🚲 Roll ${esc(row.roll_time)}`
  ].filter(Boolean);
  return `
  <div class="ride-card ride-live">
    <div class="ride-image-wrap">
      <span class="ride-image-tape"></span>
      <div class="ride-image">
        ${row.image_url
          ? `<img src="${esc(row.image_url)}" alt="This week's ride announcement: ${esc(row.title)}">`
          : `<img src="assets/placeholder-02.jpg" alt="Pedal Party ride photo">`}
      </div>
    </div>
    <div class="ride-info">
      <p class="ride-week-label label-text">This Monday's ride</p>
      <h3 class="ride-title">${esc(row.title || "Monday Social Ride")}</h3>
      ${row.hype_line ? `<p class="ride-hype">“${esc(row.hype_line)}”</p>` : ""}
      <div class="ride-facts">${facts.map(f => `<span class="fact-pill">${f}</span>`).join("")}</div>
      ${steps.length ? `
        <p class="plan-heading">Da Plan</p>
        <ol class="plan-timeline">
          ${steps.map((s, i) => `
            <li class="plan-step">
              <span class="plan-dot" style="--dot:${PLAN_COLORS[i % PLAN_COLORS.length]}">${i + 1}</span>
              <span class="plan-text">${esc(s)}</span>
            </li>`).join("")}
        </ol>` : ""}
      ${row.heads_up ? `
        <div class="heads-up"><strong>⚠️ Heads up</strong>${esc(row.heads_up)}</div>` : ""}
    </div>
  </div>`;
}

function messageHTML({ title, sub, note, countdownLabel, igLine }) {
  return `
  <div class="ride-card ride-message">
    <h3 class="ride-message-title">${title}</h3>
    ${sub ? `<p class="ride-message-sub">${sub}</p>` : ""}
    ${note ? `<p class="ride-note">📝 ${esc(note)}</p>` : ""}
    ${countdownLabel ? countdownHTML(countdownLabel) : ""}
    ${igLine ? `<p class="ride-ig-line">${igLine}</p>` : ""}
  </div>`;
}

let cdTimer = null;
function startCountdown(stage, target, onDone) {
  if (cdTimer) clearInterval(cdTimer);
  const cells = {
    days: stage.querySelector('[data-cd="days"]'),
    hours: stage.querySelector('[data-cd="hours"]'),
    mins: stage.querySelector('[data-cd="mins"]'),
    secs: stage.querySelector('[data-cd="secs"]')
  };
  if (!cells.days) return;
  const tick = () => {
    let ms = target.getTime() - Date.now();
    if (ms <= 0) { clearInterval(cdTimer); onDone?.(); return; }
    const s = Math.floor(ms / 1000);
    cells.days.textContent = Math.floor(s / 86400);
    cells.hours.textContent = String(Math.floor(s / 3600) % 24).padStart(2, "0");
    cells.mins.textContent = String(Math.floor(s / 60) % 60).padStart(2, "0");
    cells.secs.textContent = String(s % 60).padStart(2, "0");
  };
  tick();
  cdTimer = setInterval(tick, 1000);
}

function renderRideStage(stage, resolved, fetchFailed) {
  const igLink = `<a href="${INSTAGRAM_URL}" target="_blank" rel="noopener">@pedalpartylr</a>`;
  const rerender = () => initNextRide(); // countdown hit zero → recompute state

  switch (resolved.state) {
    case "LIVE":
      stage.innerHTML = liveHTML(resolved.row);
      break;
    case "COUNTDOWN":
      stage.innerHTML = messageHTML({
        title: "Next ride drops <span style='color:var(--pp-pink)'>Saturday at noon</span>.",
        sub: "Every Monday. Gather at 6, roll at 6:30. Location announced right here.",
        countdownLabel: "Countdown to the next ride plan",
        igLine: fetchFailed ? `Can't reach the ride sheet right now — check ${igLink} for this week's plan.` : ""
      });
      break;
    case "NO_RIDE":
      stage.innerHTML = messageHTML({
        title: "No ride this week — catch you next Monday. 🚲",
        note: resolved.note,
        countdownLabel: "Countdown to the next ride plan",
        sub: "The next plan drops Saturday at noon."
      });
      break;
    case "WEATHER_CANCEL":
      stage.innerHTML = messageHTML({
        title: "Rained out! ⛈️",
        sub: "This week's ride is canceled — safety first. We'll be back next Monday.",
        note: resolved.note,
        countdownLabel: "Countdown to the next ride plan"
      });
      break;
    case "OFF_SEASON":
      stage.innerHTML = messageHTML({
        title: "Pedal Party is hibernating. 🐻",
        sub: "We ride again on <strong>April Fools' Day</strong> — no joke. See you at golden hour.",
        countdownLabel: "Countdown to opening day"
      });
      break;
  }
  if (resolved.countdownTo) startCountdown(stage, resolved.countdownTo, rerender);
  ScrollTrigger.refresh();
}

async function initNextRide() {
  const stage = document.querySelector("[data-ride-stage]");
  const { rows, fetchFailed } = await fetchRides();
  let resolved = resolveRideState(rows, new Date());

  /* Dev preview: ?state=live|countdown|no_ride|weather_cancel|off_season */
  if (STATE_OVERRIDE) {
    const demoRow = rows.find(r => (r.status || "") === "scheduled") || rows[0];
    const in3days = new Date(Date.now() + 3.2 * 86400e3);
    resolved = {
      live: { state: "LIVE", row: demoRow },
      countdown: { state: "COUNTDOWN", countdownTo: in3days },
      no_ride: { state: "NO_RIDE", note: "Taking Labor Day off — rest those legs!", countdownTo: in3days },
      weather_cancel: { state: "WEATHER_CANCEL", note: "Radar says 100% thunderstorms at roll-out. Boo.", countdownTo: in3days },
      off_season: { state: "OFF_SEASON", countdownTo: new Date(Date.now() + 87 * 86400e3) }
    }[STATE_OVERRIDE] || resolved;
  }

  renderRideStage(stage, resolved, fetchFailed);
}

/* ════════ SECTION 5 · About (stat counters) ════════ */
function initAbout() {
  if (!ANIMATE) return;
  document.querySelectorAll("[data-count]").forEach(el => {
    const end = +el.dataset.count;
    gsap.from(el, {
      textContent: end > 100 ? end - 80 : 0,
      duration: 1.6, ease: "power2.out",
      snap: { textContent: 1 },
      scrollTrigger: { trigger: el, start: "top 88%", once: true }
    });
  });
  gsap.from(".stat-card", {
    y: 46, opacity: 0, scale: .85, stagger: .09, duration: .55, ease: "back.out(1.6)",
    scrollTrigger: { trigger: "[data-stats]", start: "top 82%", once: true }
  });
  gsap.from("[data-tagline] span", {
    y: 40, opacity: 0, rotation: -4, stagger: .16, duration: .6, ease: "back.out(1.8)",
    scrollTrigger: { trigger: "[data-tagline]", start: "top 88%", once: true }
  });
}

/* ════════ SECTION 6 · FAQ accordion ════════ */
function initFAQ() {
  const items = gsap.utils.toArray(".faq-item");
  items.forEach(item => {
    const btn = item.querySelector(".faq-q");
    btn.addEventListener("click", () => {
      const isOpen = item.classList.contains("is-open");
      items.forEach(i => { i.classList.remove("is-open"); i.querySelector(".faq-q").setAttribute("aria-expanded", "false"); });
      if (!isOpen) { item.classList.add("is-open"); btn.setAttribute("aria-expanded", "true"); }
    });
  });
}

/* ════════ SECTION 7 · Safety reveal ════════ */
function initSafety() {
  if (!ANIMATE) return;
  gsap.utils.toArray("[data-safety-card]").forEach((card, i) => {
    gsap.from(card, {
      y: 60, opacity: 0, rotation: i === 0 ? -4 : 4, duration: .6, ease: "back.out(1.5)",
      scrollTrigger: { trigger: card, start: "top 85%", once: true }
    });
  });
}

/* ════════ SECTION 8 · Gallery ════════ */
function initGallery() {
  const grid = document.querySelector("[data-gallery]");
  const rots = [-3, 1.8, 2.6, -1.5, 2.2, -2.8, 1.2, -2.2, 3];
  grid.innerHTML = GALLERY_PHOTOS.map((src, i) => `
    <figure class="gallery-item" style="--rot:${rots[i % rots.length]}deg">
      <img src="${src}" alt="Pedal Party ride photo ${i + 1}" loading="lazy">
    </figure>`).join("");
  if (!ANIMATE) return;
  ScrollTrigger.batch(".gallery-item", {
    start: "top 90%", once: true,
    onEnter: batch => gsap.from(batch, {
      y: 70, opacity: 0, scale: .9, stagger: .08, duration: .55, ease: "back.out(1.4)"
    })
  });
}

/* ════════ SECTION 9 · Contact form ════════ */
function initContact() {
  const form = document.querySelector("[data-contact-form]");
  const status = document.querySelector("[data-form-status]");
  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    status.className = "form-status";
    status.textContent = "Sending…";
    const isPlaceholder = FORM_ENDPOINT.includes("YOUR_FORM_ID");
    try {
      if (!isPlaceholder) {
        const res = await fetch(FORM_ENDPOINT, {
          method: "POST",
          headers: { Accept: "application/json" },
          body: new FormData(form)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } else {
        await new Promise(r => setTimeout(r, 600)); // prototype: simulate send
      }
      form.reset();
      status.className = "form-status is-success";
      status.textContent = "Message sent! 🚲 We'll holler back soon.";
    } catch {
      status.className = "form-status is-error";
      status.textContent = "Hmm, that didn't send. Email us instead: hello@pedalpartylr.com";
    }
  });
}

/* ════════ SECTION 10 · Footer (bike rides across on scroll) ════════ */
function initFooter() {
  if (!ANIMATE) return;
  const bike = document.querySelector("[data-footer-bike]");
  const lane = document.querySelector(".footer-ride");
  const wheels = bike.querySelectorAll("[data-fwheel]");
  gsap.fromTo(bike, { x: -110 }, {
    x: () => lane.offsetWidth + 40,
    ease: "none",
    scrollTrigger: {
      trigger: ".footer", start: "top 95%", end: "bottom bottom", scrub: 1.2,
      invalidateOnRefresh: true,
      onUpdate: self => wheels.forEach(w => gsap.set(w, { rotation: self.progress * 1900 }))
    }
  });
}

/* ── Ride readout: current stop + page progress ──────────────── */
function initReadout() {
  const readout = document.querySelector("[data-readout]");
  const label = document.querySelector("[data-readout-label]");
  const bar = document.querySelector("[data-readout-bar]");
  const wheel = document.querySelector("[data-readout-wheel]");

  const stops = [
    [".hero", "ROLL OUT"],
    ["#next-ride", "STOP 01 · NEXT RIDE"],
    ["#about", "STOP 02 · ABOUT"],
    ["#faq", "STOP 03 · FAQ"],
    ["#safety", "STOP 04 · SAFETY"],
    ["#gallery", "STOP 05 · GALLERY"],
    ["#contact", "STOP 06 · SAY HI"],
    [".footer", "BACK HOME 🏁"]
  ];
  stops.forEach(([sel, name]) => {
    const setIfActive = self => { if (self.isActive) label.textContent = name; };
    ScrollTrigger.create({
      trigger: sel, start: "top 55%", end: "bottom 55%",
      onToggle: setIfActive,
      onRefresh: setIfActive   // stays correct after ?jump / refresh
    });
  });
  let rot = 0;
  ScrollTrigger.create({
    start: 0, end: "max",
    onUpdate: self => {
      bar.style.width = `${(self.progress * 100).toFixed(1)}%`;
      readout.classList.toggle("is-visible", self.progress > 0.02 && self.progress < 0.995);
      rot += self.getVelocity() / 300;
      gsap.set(wheel, { rotation: rot % 360, transformOrigin: "50% 50%" });
    }
  });
}

/* ── Section-title reveals (all cream sections) ──────────────── */
function initSectionReveals() {
  if (!ANIMATE) return;
  gsap.utils.toArray(".section-head").forEach(head => {
    gsap.from(head.children, {
      y: 40, opacity: 0, stagger: .12, duration: .6, ease: "power3.out",
      scrollTrigger: { trigger: head, start: "top 86%", once: true }
    });
  });
  gsap.utils.toArray(".faq-item").forEach((item, i) => {
    gsap.from(item, {
      y: 34, opacity: 0, duration: .45, delay: (i % 4) * .06, ease: "power3.out",
      scrollTrigger: { trigger: item, start: "top 92%", once: true }
    });
  });
}

/* ── Jank meter (console): per-frame rAF deltas, log max every 2s ── */
function initJankMeter() {
  let last = performance.now(), max = 0, frames = [], t0 = last;
  const loop = now => {
    const d = now - last; last = now;
    frames.push(d); if (d > max) max = d;
    if (now - t0 > 2000) {
      frames.sort((a, b) => a - b);
      const p95 = frames[Math.floor(frames.length * .95)] || 0;
      console.log(`[jank] max ${max.toFixed(1)}ms · p95 ${p95.toFixed(1)}ms · frames ${frames.length}`);
      max = 0; frames = []; t0 = now;
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

/* ── Boot sequence ───────────────────────────────────────────── */
async function boot() {
  initHeroPin();        // pinned scene FIRST (ScrollTrigger ordering law)
  initHeader();
  initHeroIntro();
  initHeroFilm();
  initMarquee();
  initAbout();
  initFAQ();
  initSafety();
  initGallery();
  initContact();
  initFooter();
  initReadout();
  initSectionReveals();
  initAnchors();
  initJankMeter();

  await initNextRide();
  await document.fonts.ready;
  ScrollTrigger.refresh();

  /* Dev contract: ?jump=<y> lands pre-scrolled with scroll state settled */
  if (JUMP !== null) {
    scrollTo(0, +JUMP || 0);
    ScrollTrigger.update();
    ScrollTrigger.refresh();
    scrollTo(0, +JUMP || 0); // re-assert after refresh recalcs pin spacers
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__ready = true; }));
}

boot();
