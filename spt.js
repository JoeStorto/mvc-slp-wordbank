(() => {
  "use strict";

  const STEPS = [
    ["Elicit the word", "Show the picture or written word and ask for it. If the production is correct, move to the next word. If not, go to step 2."],
    ["Model and repetition", "<em>Listen: [word]. Now you say it.</em> Allow up to three attempts before moving down the hierarchy."],
    ["Integral stimulation", "<em>Watch me, listen to me, say it with me.</em> Produce the word together, then fade your voice and let the person finish alone."],
    ["Placement and written cue", "Describe or show where the articulators go for the target sound, and show the written word or letter. Then try the word again."],
    ["Repeated practice", "Once it is correct, practise the word several times in a row, then come back to it later in the session to check it holds."],
  ];

  const el = (id) => document.getElementById(id);
  const form = el("spt-controls");
  const soundSelect = el("spt-sound");
  const positionSelect = el("spt-position");
  const countInput = el("spt-count");
  const syllableSelect = el("spt-syllables");
  const structureSelect = el("spt-structure");
  const frequencySelect = el("spt-frequency");
  const generateBtn = el("spt-generate");
  const poolText = el("spt-pool");
  const results = el("spt-results");
  const sheet = el("spt-sheet");
  const notice = el("spt-notice");

  let words = [];
  let current = [];

  const BLENDS = [
    "bl", "br", "dr", "fl", "fr", "ɡl", "ɡɹ", "kl", "kɹ", "kw", "pl", "pɹ",
    "sk", "sl", "sm", "sn", "sp", "st", "sw", "tɹ", "θɹ", "ʃɹ",
    "skɹ", "spl", "spɹ", "stɹ", "skw",
    "ft", "kt", "ks", "ld", "lf", "lk", "lp", "lt", "mp", "nd", "nt", "ŋk", "ps", "sk", "sp", "st", "ts",
  ];

  function splitSound(sound) {
    const parts = [];
    let rest = sound;
    const units = ["tʃ", "dʒ", "θ", "ð", "ʃ", "ʒ", "ŋ", "ɡ", "ɹ"];
    while (rest) {
      const unit = units.find((u) => rest.startsWith(u));
      parts.push(unit || rest[0]);
      rest = rest.slice(unit ? unit.length : 1);
    }
    return parts;
  }

  function indexOfSequence(symbols, parts, from = 0) {
    outer: for (let i = from; i + parts.length <= symbols.length; i++) {
      for (let j = 0; j < parts.length; j++) {
        if (symbols[i + j] !== parts[j]) continue outer;
      }
      return i;
    }
    return -1;
  }

  function matches(entry) {
    const sound = soundSelect.value;
    if (!sound) return true;
    const s = entry.symbols;
    const parts = splitSound(sound);
    const position = positionSelect.value;
    if (position === "initial") return indexOfSequence(s, parts) === 0;
    if (position === "final") return indexOfSequence(s, parts) === s.length - parts.length && indexOfSequence(s, parts, s.length - parts.length) !== -1;
    if (position === "medial") {
      let at = indexOfSequence(s, parts, 1);
      while (at !== -1) {
        if (at + parts.length < s.length) return true;
        at = indexOfSequence(s, parts, at + 1);
      }
      return false;
    }
    return indexOfSequence(s, parts) !== -1;
  }

  function shapeOf(syllable) {
    return syllable.phones.map((p) => (p.vowel ? "V" : "C")).join("");
  }

  function matchesStructure(entry) {
    const shape = structureSelect.value;
    if (!shape) return true;
    return entry.syllables.some((syllable) => shapeOf(syllable) === shape);
  }

  function pool() {
    const limit = Number(frequencySelect.value);
    const syllables = Number(syllableSelect.value);
    return words.filter(
      (entry) =>
        (!limit || (entry.rank > 0 && entry.rank <= limit)) &&
        (!syllables || entry.syllables.length === syllables) &&
        matchesStructure(entry) &&
        matches(entry),
    );
  }

  function stepsHtml() {
    return (
      '<section class="spt-steps">' +
      "<h3>Cueing hierarchy</h3>" +
      '<ol class="spt-steps__list">' +
      STEPS.map(([title, body]) => `<li><b>${title}.</b> ${body}</li>`).join("") +
      "</ol>" +
      '<p class="spt-steps__note">Move down a step only after an error, and back up as production improves. Check the wording against the protocol you were trained in.</p>' +
      "</section>"
    );
  }

  const CUE_COLUMNS = [
    "Repetition: 5 times",
    "Minimal pair",
    "Show printed word",
    "Watch me, listen to me, say it with me (3 attempts)",
    "Articulatory placement cue",
  ];

  function targetLabel() {
    const { display } = window.SLP;
    const sound = soundSelect.value ? `/${display(soundSelect.value)}/` : "";
    const shape = structureSelect.value;
    return [sound, shape].filter(Boolean).join(" ") || "Target words";
  }

  function rowsHtml() {
    const { escapeHtml, ipaText } = window.SLP;
    const blanks = CUE_COLUMNS.map(() => '<td class="spt__mark"></td>').join("");
    const rows = current
      .map(
        (entry) =>
          "<tr>" +
          `<td class="words__word">${escapeHtml(entry.word)}</td>` +
          `<td class="words__ipa spt__ipa">${escapeHtml(ipaText(entry))}</td>` +
          blanks +
          "</tr>",
      )
      .join("");
    const heads = CUE_COLUMNS.map((label) => `<th scope="col" class="spt__mark">${escapeHtml(label)}</th>`).join("");
    return (
      '<table class="words spt__table"><thead><tr>' +
      `<th scope="col" class="spt__target">${escapeHtml(targetLabel())}</th>` +
      '<th scope="col" class="spt__ipa">IPA</th>' +
      heads +
      `</tr></thead><tbody>${rows}</tbody></table>`
    );
  }

  function render() {
    sheet.innerHTML = current.length
      ? stepsHtml() + rowsHtml()
      : '<p class="empty">No words match these settings. Try another position, more syllables, or a larger word list.</p>';
  }

  function generate() {
    const amount = Math.max(1, Math.min(60, Math.round(Number(countInput.value)) || 1));
    countInput.value = amount;
    const available = pool();
    current = window.SLP.shuffle(available)
      .slice(0, amount)
      .sort((a, b) => a.word.localeCompare(b.word));

    notice.hidden = available.length >= amount;
    if (!notice.hidden) {
      notice.textContent = `Only ${available.length} word${available.length === 1 ? "" : "s"} match these settings, so the sheet has ${available.length} instead of ${amount}.`;
    }
    poolText.innerHTML = `<strong>${available.length.toLocaleString()}</strong> word${available.length === 1 ? "" : "s"} available with these settings`;

    render();
    results.hidden = false;
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function exportRows() {
    const { ipaText, display, plainSyllables } = window.SLP;
    const sound = soundSelect.value ? `/${display(soundSelect.value)}/` : "any";
    return current.map((entry, i) => [
      i + 1,
      entry.word,
      ipaText(entry),
      plainSyllables(entry),
      entry.syllables.length,
      entry.syllables.map(shapeOf).join("-"),
      sound,
      positionSelect.value,
    ]);
  }

  const HEADER = ["#", "Word", "IPA", "Syllables", "Syllable count", "Structure", "Target sound", "Position"];

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!generateBtn.disabled) generate();
  });

  el("spt-copy").addEventListener("click", async () => {
    const ok = await window.SLP.copyText(exportRows().map((r) => r.join("\t")).join("\n"));
    const btn = el("spt-copy");
    btn.textContent = ok ? "Copied" : "Copy failed";
    setTimeout(() => (btn.textContent = "Copy"), 1600);
  });

  el("spt-csv").addEventListener("click", () => {
    const cell = (v) => (/[",\r\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
    const csv = [HEADER, ...exportRows()].map((r) => r.map(cell).join(",")).join("\r\n");
    window.SLP.download("﻿" + csv + "\r\n", "slp-sound-production-treatment.csv", "text/csv;charset=utf-8");
  });

  el("spt-print").addEventListener("click", () => window.print());

  window.SLP.onReady((loaded) => {
    words = loaded;
    const groups = [...window.SLP.soundGroups, { label: "Blends and clusters", symbols: [...new Set(BLENDS)] }];
    for (const group of groups) {
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
    generateBtn.disabled = false;
    generateBtn.textContent = "Generate practice sheet";
  });
})();
