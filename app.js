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
    img.addEventListener("click", () => window.open(src, "_blank"));
    modalGallery.appendChild(img);
  }
});



  overlay.classList.add("open");
}

function closeModal() {
  overlay.classList.remove("open");
}

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

init();
