(() => {
  "use strict";

  const FEATURES = {
    p: ["bilabial", "stop", 0, 0], b: ["bilabial", "stop", 1, 0],
    t: ["alveolar", "stop", 0, 0], d: ["alveolar", "stop", 1, 0],
    k: ["velar", "stop", 0, 0], "ɡ": ["velar", "stop", 1, 0],
    f: ["labiodental", "fricative", 0, 0], v: ["labiodental", "fricative", 1, 0],
    "θ": ["dental", "fricative", 0, 0], "ð": ["dental", "fricative", 1, 0],
    s: ["alveolar", "fricative", 0, 0], z: ["alveolar", "fricative", 1, 0],
    "ʃ": ["postalveolar", "fricative", 0, 0], "ʒ": ["postalveolar", "fricative", 1, 0],
    h: ["glottal", "fricative", 0, 0],
    "tʃ": ["postalveolar", "affricate", 0, 0], "dʒ": ["postalveolar", "affricate", 1, 0],
    m: ["bilabial", "nasal", 1, 1], n: ["alveolar", "nasal", 1, 1], "ŋ": ["velar", "nasal", 1, 1],
    l: ["alveolar", "liquid", 1, 1], "ɹ": ["postalveolar", "liquid", 1, 1],
    w: ["bilabial", "glide", 1, 1], j: ["palatal", "glide", 1, 1],
  };

  const COMMON_RANK = 20000;

  const el = (id) => document.getElementById(id);
  const form = el("pairs-controls");
  const typeSelect = el("pairs-type");
  const countInput = el("pairs-count");
  const frequencySelect = el("pairs-frequency");
  const positionSelect = el("pairs-position");
  const syllableSelect = el("pairs-syllables");
  const soundSelect = el("pairs-sound");
  const generateBtn = el("pairs-generate");
  const poolText = el("pairs-pool");
  const results = el("pairs-results");
  const listBox = el("pairs-list");
  const notice = el("pairs-notice");

  let words = [];
  let current = [];
  let indexCache = { key: "", buckets: null };

  function contrastInfo(a, b) {
    const fa = FEATURES[a];
    const fb = FEATURES[b];
    if (!fa || !fb) return { consonants: false, distance: 0, differences: ["vowel quality"] };
    const differences = [];
    if (fa[0] !== fb[0]) differences.push("place");
    if (fa[1] !== fb[1]) differences.push("manner");
    if (fa[2] !== fb[2]) differences.push("voicing");
    if (fa[3] !== fb[3]) differences.push("sonority");
    return { consonants: true, distance: differences.length, differences };
  }

  function filterKey() {
    return [frequencySelect.value, syllableSelect.value].join("|");
  }

  function buildIndex() {
    const key = filterKey();
    if (indexCache.key === key) return indexCache.buckets;
    const maxAge = Number(frequencySelect.value);
    const syllables = Number(syllableSelect.value);
    const buckets = new Map();
    for (const entry of words) {
      if (maxAge && !(entry.age > 0 && entry.age <= maxAge && entry.rank > 0 && entry.rank <= COMMON_RANK)) continue;
      if (syllables && entry.syllables.length !== syllables) continue;
      const symbols = entry.symbols;
      for (let i = 0; i < symbols.length; i++) {
        const slot = `${i}|${symbols.slice(0, i).join(" ")}_${symbols.slice(i + 1).join(" ")}`;
        const bucket = buckets.get(slot);
        if (bucket) bucket.push(entry);
        else buckets.set(slot, [entry]);
      }
    }
    indexCache = { key, buckets };
    return buckets;
  }

  function positionOf(index, length) {
    if (index === 0) return "initial";
    if (index === length - 1) return "final";
    return "medial";
  }

  function collectPairs() {
    const buckets = buildIndex();
    const wantPosition = positionSelect.value;
    const maximal = typeSelect.value === "maximal";
    const target = soundSelect.value;
    const pairs = [];
    const seen = new Set();

    for (const [slot, bucket] of buckets) {
      if (bucket.length < 2) continue;
      const index = Number(slot.split("|")[0]);
      const position = positionOf(index, bucket[0].symbols.length);
      if (wantPosition !== "any" && position !== wantPosition) continue;

      for (let i = 0; i < bucket.length; i++) {
        for (let j = i + 1; j < bucket.length; j++) {
          const a = bucket[i];
          const b = bucket[j];
          const soundA = a.symbols[index];
          const soundB = b.symbols[index];
          if (soundA === soundB) continue;
          if (target && soundA !== target && soundB !== target) continue;
          const info = contrastInfo(soundA, soundB);
          if (maximal && (!info.consonants || info.distance < 3)) continue;
          const id = a.word < b.word ? a.word + "|" + b.word : b.word + "|" + a.word;
          if (seen.has(id)) continue;
          seen.add(id);
          pairs.push({ a, b, index, position, soundA, soundB, info });
        }
      }
    }
    return pairs;
  }

  function pairHtml({ a, b, index, position, soundA, soundB, info }) {
    const { escapeHtml, display, ipaText } = window.SLP;
    const word = (entry, sound) =>
      '<div class="pair__side">' +
      `<p class="pair__word">${escapeHtml(entry.word)}</p>` +
      `<p class="pair__ipa">${escapeHtml(ipaText(entry))}</p>` +
      `<p class="pair__sound">${escapeHtml(display(sound))}</p>` +
      "</div>";
    const detail = info.consonants
      ? `${info.differences.join(", ")} · ${info.distance} of 4 features`
      : "vowel contrast";
    return (
      '<article class="card pair">' +
      '<div class="pair__row">' +
      word(a, soundA) +
      '<span class="pair__vs" aria-hidden="true">vs</span>' +
      word(b, soundB) +
      "</div>" +
      '<p class="pair__meta">' +
      `<span class="badge badge--sand">${position}</span> ` +
      `<span class="ipa">/${escapeHtml(display(soundA))}/ vs /${escapeHtml(display(soundB))}/</span> · ${escapeHtml(detail)}` +
      "</p>" +
      "</article>"
    );
  }

  function render() {
    listBox.innerHTML = current.length
      ? `<div class="cards">${current.map(pairHtml).join("")}</div>`
      : '<p class="empty">No pairs match these settings. Try a different position, a larger word list, or minimal instead of maximal.</p>';
  }

  function exportRows() {
    const { ipaText, display } = window.SLP;
    return current.map((p) => [
      p.a.word,
      ipaText(p.a),
      p.b.word,
      ipaText(p.b),
      `/${display(p.soundA)}/ vs /${display(p.soundB)}/`,
      p.position,
      p.info.consonants ? p.info.differences.join(" + ") : "vowel",
    ]);
  }

  const HEADER = ["Word 1", "IPA 1", "Word 2", "IPA 2", "Contrast", "Position", "Differs in"];

  function refreshPool() {
    const ready = words.length > 0;
    generateBtn.disabled = !ready;
    generateBtn.textContent = ready ? "Generate pairs" : "Loading words…";
    if (ready) poolText.textContent = "";
  }

  function generate() {
    const amount = Math.max(1, Math.min(200, Math.round(Number(countInput.value)) || 1));
    countInput.value = amount;
    generateBtn.disabled = true;
    generateBtn.textContent = "Finding pairs…";

    const found = window.SLP.shuffle(collectPairs());
    current = found.slice(0, amount);

    notice.hidden = found.length >= amount;
    if (!notice.hidden) {
      notice.textContent = `Only ${found.length} pair${found.length === 1 ? "" : "s"} match these settings, so you have ${found.length} instead of ${amount}.`;
    }
    poolText.innerHTML = `<strong>${found.length.toLocaleString()}</strong> pair${found.length === 1 ? "" : "s"} available with these settings`;

    render();
    results.hidden = false;
    generateBtn.disabled = false;
    generateBtn.textContent = "Generate pairs";
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function buildSoundOptions() {
    for (const group of window.SLP.soundGroups) {
      const og = document.createElement("optgroup");
      og.label = group.label;
      for (const symbol of group.symbols) {
        const option = document.createElement("option");
        option.value = symbol;
        option.textContent = `/${window.SLP.display(symbol)}/`;
        og.append(option);
      }
      soundSelect.append(og);
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!generateBtn.disabled) generate();
  });

  el("pairs-copy").addEventListener("click", async () => {
    const text = exportRows().map((r) => r.join("\t")).join("\n");
    const ok = await window.SLP.copyText(text);
    const btn = el("pairs-copy");
    btn.textContent = ok ? "Copied" : "Copy failed";
    setTimeout(() => (btn.textContent = "Copy"), 1600);
  });

  el("pairs-csv").addEventListener("click", () => {
    const cell = (v) => (/[",\r\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
    const csv = [HEADER, ...exportRows()].map((r) => r.map(cell).join(",")).join("\r\n");
    window.SLP.download("﻿" + csv + "\r\n", "slp-word-pairs.csv", "text/csv;charset=utf-8");
  });

  el("pairs-print").addEventListener("click", () => window.print());

  for (const control of [typeSelect, frequencySelect, positionSelect, syllableSelect, soundSelect]) {
    control.addEventListener("change", () => {
      poolText.textContent = "";
    });
  }

  refreshPool();
  window.SLP.onReady((loaded) => {
    words = loaded;
    buildSoundOptions();
    refreshPool();
  });
})();
