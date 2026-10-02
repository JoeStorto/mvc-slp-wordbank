(() => {
  "use strict";

  const COMMON_RANK = 20000;
  const MAX_ROWS = 30;

  const OBJECT_VERBS = new Set(["want", "like", "see", "have", "get", "find", "need"]);
  const PLACES = {
    here: "here",
    there: "there",
    outside: "outside",
    inside: "inside",
    home: "at home",
    school: "at school",
    room: "in the room",
    table: "at the table",
    chair: "on the chair",
    bathroom: "in the bathroom",
  };
  const TIMES_NEEDING_OBJECT = new Set(["before", "after"]);
  const PLAIN_SUBJECTS = new Set(["you", "we", "they"]);
  const THIRD_SUBJECTS = new Set(["he", "she"]);
  const NAMED = { mom: "Mom", dad: "Dad", friend: "My friend" };

  const PROMPTS = [
    (w) => `Tell me about the ${w}.`,
    (w) => `Where might you see the ${w}?`,
    (w) => `Ask me a question about the ${w}.`,
    (w) => `What would you do with the ${w}?`,
  ];

  const el = (id) => document.getElementById(id);
  const form = el("ladder-controls");
  const soundSelect = el("ladder-sound");
  const positionSelect = el("ladder-position");
  const countInput = el("ladder-count");
  const syllableSelect = el("ladder-syllables");
  const levelSelect = el("ladder-level");
  const generateBtn = el("ladder-generate");
  const poolText = el("ladder-pool");
  const results = el("ladder-results");
  const sheet = el("ladder-sheet");
  const notice = el("ladder-notice");

  let words = [];
  let nouns = new Set();
  let frames = null;
  let current = [];

  function subject(word) {
    if (word === "i") return { text: "I", third: false };
    if (PLAIN_SUBJECTS.has(word)) return { text: word[0].toUpperCase() + word.slice(1), third: false };
    if (THIRD_SUBJECTS.has(word)) return { text: word[0].toUpperCase() + word.slice(1), third: true };
    if (word === "it") return null;
    return { text: NAMED[word] || `The ${word}`, third: true };
  }

  function agree(verb) {
    if (verb === "have") return "has";
    if (/(s|sh|ch|x|z|o)$/.test(verb)) return verb + "es";
    if (/[^aeiou]y$/.test(verb)) return verb.slice(0, -1) + "ies";
    return verb + "s";
  }

  function buildFrames() {
    const groups = window.SLP.coreGroups();
    const list = (name) => [...(groups.get(`Sentence building: ${name}`) || [])];
    const subjects = list("who").map(subject).filter(Boolean);
    const verbs = list("doing").filter((v) => OBJECT_VERBS.has(v));
    const tails = [
      ...list("where").filter((w) => PLACES[w]).map((w) => PLACES[w]),
      ...list("when").filter((w) => !TIMES_NEEDING_OBJECT.has(w)),
    ];
    return { subjects, verbs, tails };
  }

  function matchesSound(entry, sound, position) {
    if (!sound) return true;
    const s = entry.symbols;
    const last = s.length - 1;
    if (position === "initial") return s[0] === sound;
    if (position === "final") return s[last] === sound;
    if (position === "medial") return s.slice(1, last).includes(sound);
    return s.includes(sound);
  }

  function pool() {
    const maxAge = Number(levelSelect.value);
    const syllables = Number(syllableSelect.value);
    const sound = soundSelect.value;
    const position = positionSelect.value;
    return words.filter(
      (entry) =>
        nouns.has(entry.word) &&
        (!maxAge || (entry.age > 0 && entry.age <= maxAge && entry.rank > 0 && entry.rank <= COMMON_RANK)) &&
        (!syllables || entry.syllables.length === syllables) &&
        matchesSound(entry, sound, position),
    );
  }

  function rung(entry) {
    const { pick } = window.SLP;
    const verb = pick(frames.verbs);
    const sentenceVerb = pick(frames.verbs);
    const who = pick(frames.subjects);
    const tail = pick(frames.tails);
    const w = entry.word;
    return {
      entry,
      phrase: `${verb} the ${w}`,
      sentence: `${who.text} ${who.third ? agree(sentenceVerb) : sentenceVerb} the ${w} ${tail}.`,
      conversation: pick(PROMPTS)(w),
    };
  }

  function refreshPool() {
    if (!words.length || !nouns.size) return;
    const total = pool().length;
    poolText.innerHTML = `<strong>${total.toLocaleString()}</strong> target word${total === 1 ? "" : "s"} available with these settings`;
    generateBtn.disabled = total === 0;
  }

  function targetLabel() {
    const { display } = window.SLP;
    const sound = soundSelect.value;
    if (!sound) return "Any sound";
    const position = positionSelect.value;
    return `/${display(sound)}/${position === "any" ? "" : `, ${position}`}`;
  }

  function highlight(text, word) {
    const { escapeHtml } = window.SLP;
    const at = text.lastIndexOf(word);
    if (at < 0) return escapeHtml(text);
    return escapeHtml(text.slice(0, at)) + `<b class="ladder__target">${escapeHtml(word)}</b>` + escapeHtml(text.slice(at + word.length));
  }

  function render() {
    const { escapeHtml, ipaText } = window.SLP;
    if (!current.length) {
      sheet.innerHTML = '<p class="empty">No words match these settings. Try another position, more syllables, or a wider vocabulary level.</p>';
      return;
    }
    const rows = current
      .map(
        (row, i) =>
          "<tr>" +
          `<td class="words__num">${i + 1}</td>` +
          `<td class="ladder__word" data-label="Word"><span class="words__word">${escapeHtml(row.entry.word)}</span> <span class="words__ipa">${escapeHtml(ipaText(row.entry))}</span></td>` +
          `<td data-label="Phrase">${highlight(row.phrase, row.entry.word)}</td>` +
          `<td data-label="Sentence">${highlight(row.sentence, row.entry.word)}</td>` +
          `<td data-label="Conversation">${highlight(row.conversation, row.entry.word)}</td>` +
          "</tr>",
      )
      .join("");
    const correct = `Correct: ____ / ${current.length}`;
    sheet.innerHTML =
      `<h3 class="spt__title">Target: <span class="ladder__sound">${escapeHtml(targetLabel())}</span></h3>` +
      '<table class="words sheet ladder__table"><thead><tr>' +
      '<th scope="col" class="words__num">#</th>' +
      '<th scope="col">1. Word</th>' +
      '<th scope="col">2. Phrase</th>' +
      '<th scope="col">3. Sentence</th>' +
      '<th scope="col">4. Conversation</th>' +
      `</tr></thead><tbody>${rows}</tbody>` +
      '<tfoot class="ladder__tally"><tr><td class="words__num"></td>' +
      [0, 1, 2, 3].map(() => `<td>${correct}</td>`).join("") +
      "</tr></tfoot></table>";
  }

  function generate() {
    const amount = Math.max(1, Math.min(MAX_ROWS, Math.round(Number(countInput.value)) || 1));
    countInput.value = amount;
    const available = pool();
    current = window.SLP.shuffle(available)
      .slice(0, amount)
      .sort((a, b) => a.word.localeCompare(b.word))
      .map(rung);
    notice.hidden = available.length >= amount;
    if (!notice.hidden) {
      notice.textContent = `Only ${available.length} word${available.length === 1 ? "" : "s"} match these settings, so the sheet has ${available.length} instead of ${amount}.`;
    }
    render();
    results.hidden = false;
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const HEADER = ["#", "Word", "IPA", "Phrase", "Sentence", "Conversation"];

  function exportRows() {
    const { ipaText } = window.SLP;
    return current.map((row, i) => [i + 1, row.entry.word, ipaText(row.entry), row.phrase, row.sentence, row.conversation]);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!generateBtn.disabled) generate();
  });

  for (const input of [soundSelect, positionSelect, syllableSelect, levelSelect]) {
    input.addEventListener("change", refreshPool);
  }

  el("plain-r").addEventListener("change", () => {
    for (const option of soundSelect.querySelectorAll("option[value]")) {
      if (option.value) option.textContent = `/${window.SLP.display(option.value)}/`;
    }
    if (current.length) render();
  });

  el("ladder-copy").addEventListener("click", async () => {
    const ok = await window.SLP.copyText(exportRows().map((r) => r.join("\t")).join("\n"));
    const btn = el("ladder-copy");
    btn.textContent = ok ? "Copied" : "Copy failed";
    setTimeout(() => (btn.textContent = "Copy"), 1600);
  });

  el("ladder-csv").addEventListener("click", () => {
    const cell = (v) => (/[",\r\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
    const csv = [HEADER, ...exportRows()].map((r) => r.map(cell).join(",")).join("\r\n");
    window.SLP.download("﻿" + csv + "\r\n", "slp-conversation-ladder.csv", "text/csv;charset=utf-8");
  });

  el("ladder-print").addEventListener("click", () => window.print());

  window.SLP.onReady(async (loaded) => {
    words = loaded;
    frames = buildFrames();
    for (const group of window.SLP.soundGroups.filter((g) => g.label === "Consonants")) {
      const og = document.createElement("optgroup");
      og.label = group.label;
      for (const symbol of group.symbols) og.append(new Option(`/${window.SLP.display(symbol)}/`, symbol));
      soundSelect.append(og);
    }
    try {
      const res = await fetch("data/nouns.txt");
      if (!res.ok) throw new Error(res.statusText);
      const known = new Set(loaded.map((entry) => entry.word));
      const plural = (w) =>
        (w.endsWith("ies") && known.has(w.slice(0, -3) + "y")) ||
        (w.endsWith("ves") && (known.has(w.slice(0, -3) + "f") || known.has(w.slice(0, -3) + "fe"))) ||
        (w.endsWith("es") && known.has(w.slice(0, -2))) ||
        (w.endsWith("s") && !w.endsWith("ss") && known.has(w.slice(0, -1)));
      nouns = new Set((await res.text()).split("\n").filter((w) => w && !plural(w)));
    } catch {
      generateBtn.textContent = "Word list failed to load";
      poolText.textContent = "Refresh the page to try again.";
      return;
    }
    generateBtn.textContent = "Generate ladder";
    refreshPool();
  });
})();
