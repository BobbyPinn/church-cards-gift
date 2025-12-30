let cards = [];

let memoriesById = {};
//search fucntion
let allCards = [];
let swiper = null;

const searchInput = document.getElementById("searchInput");
const filterSelect = document.getElementById("filterSelect");
const clearBtn = document.getElementById("clearBtn");
const statsEl = document.getElementById("stats");



const wrapper = document.getElementById("swiperWrapper");

// Modal elements (match your HTML IDs)
const overlay = document.getElementById("modalOverlay");
const closeBtn = document.getElementById("modalClose");
const modalDate = document.getElementById("modalDate");
const modalTitle = document.getElementById("modalTitle");
const modalDesc = document.getElementById("modalDesc");
const modalFront = document.getElementById("side1Img");
const modalBack = document.getElementById("side2Img");
const modalGallery = document.getElementById("gallery");

//search 
function memoryTextForCard(card) {
  return (card.memories || [])
    .map((mid) => memoriesById[mid]?.title || "")
    .filter(Boolean)
    .join(" ");
}

function searchableText(card) {
  const parts = [
    card.id || "",
    card.title || "",
    card.description || "",
    memoryTextForCard(card),
  ];
  return parts.join(" ").toLowerCase();
}

function passesFilter(card, filterValue) {
  if (filterValue === "all") return true;
  if (filterValue === "hasBack") return !!card.back;
  if (filterValue === "singles") return !card.back;
  if (filterValue === "hasPhotos") return (card.photos?.length || 0) > 0;
  if (filterValue === "hasMemories") return (card.memories?.length || 0) > 0;
  return true;
}

function updateStats() {
  const total = allCards.length;
  const showing = cards.length;
  const withBack = allCards.filter(c => !!c.back).length;
  const singles = allCards.filter(c => !c.back).length;
  const withMem = allCards.filter(c => (c.memories?.length || 0) > 0).length;

  statsEl.textContent = `Showing ${showing} of ${total} • Pairs: ${withBack} • Singles: ${singles} • Shared memories: ${withMem}`;
}

function buildSwiper() {
  // rebuild slides
  wrapper.innerHTML = "";
  cards.forEach((c, i) => wrapper.appendChild(makeSlide(c, i)));

  // destroy old swiper safely
  if (swiper) {
    swiper.destroy(true, true);
    swiper = null;
  }

  // create new swiper
  swiper = new Swiper(".swiper", {
    effect: "coverflow",
    grabCursor: true,
    centeredSlides: true,
    slidesPerView: "auto",
    loop: cards.length >= 3,
    coverflowEffect: {
      rotate: 0,
      stretch: 0,
      depth: 160,
      modifier: 1.25,
      slideShadows: false,
    },
    pagination: { el: ".swiper-pagination", clickable: true },
    navigation: { nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" },
    keyboard: { enabled: true },
  });
}

function applySearchAndFilter() {
  const q = (searchInput.value || "").trim().toLowerCase();
  const f = filterSelect.value;

  cards = allCards
    .filter(card => passesFilter(card, f))
    .filter(card => (q ? searchableText(card).includes(q) : true))
    .sort((a, b) => (a.priority ?? 9999) - (b.priority ?? 9999) || cardNumber(a) - cardNumber(b));


  buildSwiper();
  updateStats();
}



function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cardNumber(card) {
  // card.id is like "card-001"
  const n = parseInt(String(card.id || "").replace("card-", ""), 10);
  return Number.isFinite(n) ? n : 999999;
}

function makeSlide(card, index) {
  const slide = document.createElement("div");
  slide.className = "swiper-slide";

  slide.innerHTML = `
    <div class="card" data-index="${index}">
      <img src="${card.front}" alt="Card: ${escapeHtml(card.title || card.id)}" />
      <div class="card-meta">
        <div class="card-date">${escapeHtml(card.date || "")}</div>
        <div class="card-title">${escapeHtml(card.title || card.id)}</div>
        <div class="card-desc">${escapeHtml(card.description || "")}</div>
      </div>
    </div>
  `;
  return slide;
}

function isVideo(src) {
  return /\.(mp4|webm|mov)$/i.test(src);
}


function openModal(card) {
  modalDate.textContent = card.date || "";
  modalTitle.textContent = card.title || card.id || "";
  modalDesc.textContent = card.description || "";

  modalFront.src = card.front;

  if (card.back) {
    modalBack.src = card.back;
    modalBack.style.opacity = "1";
  } else {
    // no back: show same image dimmed
    modalBack.src = card.front;
    modalBack.style.opacity = "0.25";
  }

    modalGallery.innerHTML = "";

  // start with the card’s own photos
  let merged = [...(card.photos || [])];

  // add photos from any linked memories (like Valentines)
  for (const mid of (card.memories || [])) {
    const mem = memoriesById[mid];
    if (mem?.photos?.length) merged.push(...mem.photos);
  }

  merged.forEach((src) => {
  if (isVideo(src)) {
    const vid = document.createElement("video");
    vid.src = src;
    vid.controls = true;
    vid.playsInline = true;
    vid.preload = "metadata";

    modalGallery.appendChild(vid);
  } else {
    const img = document.createElement("img");
    img.src = src;
    img.alt = "Photo";
    img.style.cursor = "pointer";
    img.addEventListener("click", () => openLightbox(src));
    modalGallery.appendChild(img);
  }
});



  overlay.classList.add("open");
}

function closeModal() {
  overlay.classList.remove("open");
}

// Lightbox for gallery images
const lightboxOverlay = document.getElementById("lightboxOverlay");
const lightboxImg = document.getElementById("lightboxImg");
const lightboxClose = document.getElementById("lightboxClose");

function openLightbox(src) {
  if (!lightboxOverlay || !lightboxImg) return;
  lightboxImg.src = src;
  lightboxOverlay.classList.add("open");
}

function closeLightbox() {
  if (lightboxOverlay) lightboxOverlay.classList.remove("open");
}

if (lightboxClose) {
  lightboxClose.addEventListener("click", closeLightbox);
}
if (lightboxOverlay) {
  lightboxOverlay.addEventListener("click", (e) => {
    if (e.target === lightboxOverlay) closeLightbox();
  });
}
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeLightbox();
});

// -------- Love timer + flowers --------
const HEARTS = ["💗","💖","💞","💕","❤️","🤍"];
const FLOWERS = ["🌸","🌷","🌹","💐","🌺","🌼","🌻","💖"];


// Set your start date here (keep this line)
const REL_START = new Date("2022-06-14T00:00:00"); // change this

// Timer elements for the "Time Together" grid
const elYears = document.getElementById("tYears");
const elMonths = document.getElementById("tMonths");
const elDays = document.getElementById("tDays");
const elHours = document.getElementById("tHours");
const elMinutes = document.getElementById("tMinutes");
const elSeconds = document.getElementById("tSeconds");

function pad2(n){ return String(n).padStart(2, "0"); }

// Add months safely (handles month length differences)
function addMonths(date, months) {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}
function addYears(date, years) {
  return addMonths(date, years * 12);
}

// Calendar-accurate diff: years/months/days then leftover h/m/s
function calendarDiff(from, to) {
  if (to < from) return { years:0, months:0, days:0, hours:0, minutes:0, seconds:0 };

  let years = to.getFullYear() - from.getFullYear();
  let cursor = addYears(from, years);
  if (cursor > to) { years--; cursor = addYears(from, years); }

  let months = (to.getFullYear() - cursor.getFullYear()) * 12 + (to.getMonth() - cursor.getMonth());
  let cursor2 = addMonths(cursor, months);
  if (cursor2 > to) { months--; cursor2 = addMonths(cursor, months); }

  const remSec = Math.floor((to - cursor2) / 1000);
  const days = Math.floor(remSec / 86400);
  const hours = Math.floor((remSec % 86400) / 3600);
  const minutes = Math.floor((remSec % 3600) / 60);
  const seconds = remSec % 60;

  return { years, months, days, hours, minutes, seconds };
}

function updateTimeTogether(){
  // If you haven’t added the HTML yet, don’t crash
  if (!elYears) return;

  const now = new Date();
  const d = calendarDiff(REL_START, now);

  elYears.textContent = pad2(d.years);
  elMonths.textContent = pad2(d.months);
  elDays.textContent = pad2(d.days);
  elHours.textContent = pad2(d.hours);
  elMinutes.textContent = pad2(d.minutes);
  elSeconds.textContent = pad2(d.seconds);
}

setInterval(updateTimeTogether, 1000);
updateTimeTogether();


function burstFlowers(x, y, count = 18) {
  const gravity = 1800;      // px/s^2 (bigger = falls faster)
  const drag = 0.985;        // air resistance (closer to 1 = less drag)
  const minLife = 900;       // ms
  const maxLife = 1600;      // ms

  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    el.className = "flower-pop";
    el.textContent = FLOWERS[Math.floor(Math.random() * FLOWERS.length)];
    document.body.appendChild(el);

    // Randomize size/rotation
    const size = 14 + Math.random() * 18;
    el.style.fontSize = `${size}px`;

    // Start position
    let px = x;
    let py = y;

    // Initial velocity: "shoot out" fast in random direction
    // angle bias upward a bit, but still spread wide
    const angle = (-Math.PI / 2) + (Math.random() - 0.5) * (Math.PI * 0.9);
    const speed = 700 + Math.random() * 700; // initial burst speed (px/s)

    let vx = Math.cos(angle) * speed + (Math.random() - 0.5) * 200; // extra chaos
    let vy = Math.sin(angle) * speed - Math.random() * 200;         // more upward kick

    // Spin
    let rot = Math.random() * 360;
    const spin = (Math.random() - 0.5) * 720; // deg/s

    const life = minLife + Math.random() * (maxLife - minLife);
    const start = performance.now();
    let last = start;

    // We'll fade out near the end
    function tick(now) {
      const dt = (now - last) / 1000; // seconds
      last = now;

      // physics
      vy += gravity * dt;   // gravity pulls down
      vx *= drag;           // air resistance
      vy *= drag;

      px += vx * dt;
      py += vy * dt;

      rot += spin * dt;

      // progress + fade
      const t = now - start;
      const p = Math.min(1, t / life);
      el.style.opacity = String(1 - p);

      // apply transform (translate + rotate)
      el.style.transform = `translate(${px}px, ${py}px) rotate(${rot}deg)`;

      // remove when done
      if (p < 1) {
        requestAnimationFrame(tick);
      } else {
        el.remove();
      }
    }

    requestAnimationFrame(tick);
  }
}

document.getElementById("flowerBtn")?.addEventListener("click", (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  //flower amount
  burstFlowers(x, y, 100);
});

let fallingEnabled = true;

function spawnFallingHeart() {
  if (!fallingEnabled) return;

  const el = document.createElement("div");
  el.className = "falling-flower";
  el.textContent = HEARTS[Math.floor(Math.random() * HEARTS.length)];

  const x = Math.random() * window.innerWidth;
  const dur = 6 + Math.random() * 5; // 6–11s

  el.style.setProperty("--x", `${x}px`);
  el.style.setProperty("--dur", `${dur}s`);

  document.body.appendChild(el);
  el.addEventListener("animationend", () => el.remove());
}

setInterval(spawnFallingHeart, 900);

/* =========================
   FUNCTION BEGIN: setupIntroEnvelope
   Purpose: 1st click opens envelope + shows letter; 2nd click enters site.
========================= */
function setupIntroEnvelope() {
  const overlayEl = document.getElementById("introOverlay");
  const envBtnEl = document.getElementById("envBtn"); // your .wrapper
  if (!overlayEl || !envBtnEl) return;

  // Pause falling hearts while intro is visible
  if (typeof fallingEnabled !== "undefined") fallingEnabled = false;

  let step = 0; // 0 = closed, 1 = letter shown

  function enterSite() {
    overlayEl.classList.add("is-hidden");
    if (typeof fallingEnabled !== "undefined") fallingEnabled = true;
  }

  function openEnvelope() {
    overlayEl.classList.add("is-open");
    step = 1;
  }

  function handleActivate() {
    if (step === 0) {
      openEnvelope();
    } else {
      enterSite();
    }
  }

  // Click
  envBtnEl.addEventListener("click", handleActivate);

  // Keyboard: Enter / Space
  envBtnEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleActivate();
    }
  });
}
/* =========================
   FUNCTION END: setupIntroEnvelope
========================= */






async function init() {
  // Load JSON
  const res = await fetch("./data/cards.json");
  cards = await res.json();
  //Valaentines/ memories
  const memRes = await fetch("./data/memories.json");
const memories = await memRes.json();
memoriesById = Object.fromEntries(memories.map(m => [m.id, m]));


  // A) Keep in card number order
  cards.sort((a, b) => cardNumber(a) - cardNumber(b));

    // Keep a master copy (for search/filter)
  allCards = cards.slice().sort((a, b) => {
  const pa = (a.priority ?? 9999);
  const pb = (b.priority ?? 9999);
  if (pa !== pb) return pa - pb;          // important first
  return cardNumber(a) - cardNumber(b);   // then normal order
});

  cards = allCards.slice();

  buildSwiper();
  updateStats();

}

// Click a card to open modal
document.addEventListener("click", (e) => {
  const cardEl = e.target.closest(".card");
  if (!cardEl) return;

  const idx = Number(cardEl.dataset.index);
  const card = cards[idx];
  if (card) openModal(card);
});

// Close modal
closeBtn.addEventListener("click", closeModal);
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

//part of search function
searchInput.addEventListener("input", applySearchAndFilter);
filterSelect.addEventListener("change", applySearchAndFilter);

clearBtn.addEventListener("click", () => {
  searchInput.value = "";
  filterSelect.value = "all";
  applySearchAndFilter();
});


setupIntroEnvelope();

init();


