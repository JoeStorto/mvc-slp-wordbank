(() => {
  "use strict";

  const COMMON_RANK = 20000;

  const FRONTED = { k: "t", "ɡ": "d" };
  const STOPPED = { f: "p", v: "b", "θ": "t", "ð": "d", s: "t", z: "d", "ʃ": "t", "ʒ": "d", "tʃ": "t", "dʒ": "d" };
  const GLIDED = { "ɹ": "w", l: "w" };
  const SONORITY = {
    p: 1, b: 1, t: 1, d: 1, k: 1, "ɡ": 1, "tʃ": 1, "dʒ": 1,
    f: 2, v: 2, "θ": 2, "ð": 2, s: 2, z: 2, "ʃ": 2, "ʒ": 2, h: 2,
    m: 3, n: 3, "ŋ": 3,
    l: 4, "ɹ": 4,
    w: 5, j: 5,
  };
  const FINAL_CONSONANTS = ["p", "b", "t", "d", "k", "ɡ", "f", "v", "θ", "ð", "s", "z", "ʃ", "ʒ", "tʃ", "dʒ", "m", "n", "ŋ", "l"];
  const PLACE = { p: "labial", b: "labial", m: "labial", t: "alveolar", d: "alveolar", n: "alveolar", k: "velar", "ɡ": "velar", "ŋ": "velar" };
  const KIND = { p: 0, t: 0, k: 0, b: 1, d: 1, "ɡ": 1, m: 2, n: 2, "ŋ": 2 };
  const AT_PLACE = { labial: ["p", "b", "m"], alveolar: ["t", "d", "n"], velar: ["k", "ɡ", "ŋ"] };

  const sounds = (list) => list.map((symbol) => ({ value: symbol, label: null }));

  const PATTERNS = {
    fronting: {
      label: "Fronting",
      type: "Substitution",
      what: "A sound made at the back of the mouth is replaced by one made at the front: /k/ becomes /t/ and /ɡ/ becomes /d/.",
      example: "key",
      sounds: sounds(Object.keys(FRONTED)),
      positions: ["any", "initial", "medial", "final"],
      sites: (phones) => phones.filter((p) => FRONTED[p.symbol]),
      apply: (phones) => substitute(phones, (p) => FRONTED[p.symbol]),
    },
    stopping: {
      label: "Stopping",
      type: "Substitution",
      what: "A fricative or affricate is replaced by a stop made in a similar place: /s/ becomes /t/, /f/ becomes /p/, /ʃ/ becomes /t/.",
      example: "sun",
      sounds: sounds(Object.keys(STOPPED)),
      positions: ["any", "initial", "medial", "final"],
      sites: (phones) => phones.filter((p) => STOPPED[p.symbol]),
      apply: (phones) => substitute(phones, (p) => STOPPED[p.symbol]),
    },
    gliding: {
      label: "Gliding",
      type: "Substitution",
      what: "/ɹ/ or /l/ before a vowel is replaced by the glide /w/.",
      example: "rabbit",
      sounds: sounds(Object.keys(GLIDED)),
      positions: ["any", "initial", "medial"],
      sites: (phones) => phones.filter((p) => p.onset && GLIDED[p.symbol]),
      apply: (phones) => substitute(phones, (p) => p.onset && GLIDED[p.symbol]),
    },
    vocalization: {
      label: "Vocalization",
      type: "Substitution",
      what: "/l/ or /ɹ/ after a vowel is replaced by a vowel, so apple sounds like “appo” and ladder like “laddo”.",
      example: "apple",
      sounds: sounds(["l", "ɹ"]),
      positions: ["any", "medial", "final"],
      match: (p, sound) => (sound === "ɹ" ? p.symbol === "ɹ" || p.symbol === "ɚ" : p.symbol === sound),
      sites: (phones) => phones.filter((p) => vocalizes(p)),
      apply: (phones, syllables) => vocalize(syllables),
    },
    assimilation: {
      label: "Assimilation",
      type: "Substitution",
      what: "The first consonant changes to be made in the same place as a later one: dog becomes “gog”, top becomes “pop”.",
      example: "dog",
      anyLabel: "Any type",
      sounds: [
        { value: "velar", label: "Velar (dog → gog)" },
        { value: "labial", label: "Labial (top → pop)" },
        { value: "alveolar", label: "Alveolar (kite → tite)" },
      ],
      positions: [],
      match: (p, sound) => p.harmony === sound,
      sites: (phones) => {
        const site = harmonySite(phones);
        return site ? [site] : [];
      },
      apply: (phones) => {
        const site = harmonySite(phones);
        site.from = site.symbol;
        site.symbol = AT_PLACE[site.harmony][KIND[site.symbol]];
      },
    },
    clusters: {
      label: "Cluster reduction",
      type: "Omission",
      anyLabel: "Any cluster",
      what: "One consonant of a cluster at the start of a syllable is left out. The sound kept is usually the least sonorous one, so /sp/ becomes /p/ and /tɹ/ becomes /t/.",
      example: "spoon",
      sounds: [
        { value: "s", label: "s clusters (/sp/, /st/, /sn/…)" },
        { value: "l", label: "l clusters (/bl/, /pl/, /fl/…)" },
        { value: "ɹ", label: "r clusters (/tɹ/, /bɹ/, /kɹ/…)" },
        { value: "w", label: "w clusters (/kw/, /tw/, /sw/…)" },
      ],
      positions: ["any", "initial", "medial"],
      sites: (phones) => clusterSites(phones),
      apply: (phones) => reduceClusters(phones),
    },
    final: {
      label: "Final consonant deletion",
      type: "Omission",
      what: "The last consonant of the word is left off.",
      example: "cat",
      sounds: sounds(FINAL_CONSONANTS),
      positions: ["final"],
      sites: (phones, syllables) => {
        const last = syllables[syllables.length - 1];
        const coda = last.phones.slice(last.phones.findIndex((p) => p.vowel) + 1);
        const p = phones[phones.length - 1];
        return coda.length === 1 && FINAL_CONSONANTS.includes(p.symbol) ? [p] : [];
      },
      apply: (phones) => {
        phones[phones.length - 1].dropped = true;
      },
    },
    weak: {
      label: "Weak syllable deletion",
      type: "Omission",
      what: "An unstressed syllable that is not the last one in the word is left out.",
      example: "banana",
      sounds: [],
      positions: [],
      sites: (phones, syllables) => {
        const weak = weakSyllable(syllables);
        return weak ? weak.phones : [];
      },
      apply: (phones, syllables) => {
        for (const p of weakSyllable(syllables).phones) p.dropped = true;
      },
    },
  };

  const RELEASED = ["fronting", "stopping", "gliding", "clusters", "final", "weak"];
  for (const key of Object.keys(PATTERNS)) {
    if (!RELEASED.includes(key)) delete PATTERNS[key];
  }

  const MIXED = "all";

  const el = (id) => document.getElementById(id);
  const form = el("soda-controls");
  const patternSelect = el("soda-pattern");
  const soundSelect = el("soda-sound");
  const positionSelect = el("soda-position");
  const countInput = el("soda-count");
  const syllableSelect = el("soda-syllables");
  const levelSelect = el("soda-level");
  const chartPrint = el("soda-chart-print");
  const generateBtn = el("soda-generate");
  const poolText = el("soda-pool");
  const results = el("soda-results");
  const sheet = el("soda-sheet");
  const notice = el("soda-notice");
  const chart = el("soda-chart");

  let words = [];
  let current = [];

  function substitute(phones, replacement) {
    for (const p of phones) {
      const next = replacement(p);
      if (next) {
        p.from = p.symbol;
        p.symbol = next;
      }
    }
  }

  function onsets(phones) {
    const groups = new Map();
    for (const p of phones) {
      if (!p.onset) continue;
      if (!groups.has(p.syllable)) groups.set(p.syllable, []);
      groups.get(p.syllable).push(p);
    }
    return [...groups.values()].filter((g) => g.length > 1 && !g.some((p) => p.symbol === "j"));
  }

  function clusterSites(phones) {
    return onsets(phones).flat();
  }

  function reduceClusters(phones) {
    for (const group of onsets(phones)) {
      let keep = group[0];
      for (const p of group) if (SONORITY[p.symbol] < SONORITY[keep.symbol]) keep = p;
      for (const p of group) if (p !== keep) p.dropped = true;
    }
  }

  function harmonySite(phones) {
    const [first, vowel, later] = phones;
    if (!first || first.vowel || !vowel || !vowel.vowel || !later || later.vowel) return null;
    if (!PLACE[first.symbol] || !PLACE[later.symbol] || PLACE[first.symbol] === PLACE[later.symbol]) return null;
    first.harmony = PLACE[later.symbol];
    return first;
  }

  function vocalizes(p) {
    if (p.beforeVowel) return false;
    return p.symbol === "ɚ" || (!p.vowel && !p.onset && (p.symbol === "l" || p.symbol === "ɹ"));
  }

  function vocalize(syllables) {
    for (const s of syllables) {
      s.phones.forEach((p, i) => {
        const prev = s.phones[i - 1];
        if (!vocalizes(p)) return;
        if (p.symbol === "ɚ") {
          p.from = p.symbol;
          p.symbol = "oʊ";
        } else if (p.symbol === "l" && prev && prev.symbol === "ə") {
          prev.from = prev.symbol;
          prev.symbol = "oʊ";
          p.dropped = true;
        } else if (p.symbol === "l") {
          p.from = p.symbol;
          p.symbol = "ʊ";
        } else if (p.symbol === "ɹ") {
          p.from = p.symbol;
          p.symbol = "ə";
        }
      });
    }
  }

  function weakSyllable(syllables) {
    if (syllables.length < 2) return null;
    return syllables.slice(0, -1).find((s) => s.stress === 0) || null;
  }

  function analyse(entry) {
    const phones = [];
    const syllables = entry.syllables.map((s, si) => {
      const vowelAt = s.phones.findIndex((p) => p.vowel);
      const copy = {
        stress: s.stress,
        phones: s.phones.map((p, pi) => ({
          symbol: p.symbol,
          vowel: p.vowel,
          onset: !p.vowel && pi < vowelAt,
          syllable: si,
        })),
      };
      phones.push(...copy.phones);
      return copy;
    });
    phones.forEach((p, i) => {
      p.position = i === 0 ? "initial" : i === phones.length - 1 ? "final" : "medial";
      p.beforeVowel = Boolean(phones[i + 1] && phones[i + 1].vowel);
    });
    return { phones, syllables };
  }

  function siteMatches(pattern, site, position) {
    if (!position || position === "any") return true;
    const where = pattern === PATTERNS.clusters ? (site.syllable === 0 ? "initial" : "medial") : site.position;
    return where === position;
  }

  function sitesFor(pattern, entry, sound, position) {
    const { phones, syllables } = analyse(entry);
    let sites = pattern.sites(phones, syllables);
    if (pattern === PATTERNS.clusters && sound) {
      const groups = onsets(phones).filter((g) => (sound === "s" ? g[0].symbol === "s" : g.some((p) => p.symbol === sound)));
      sites = groups.flat();
    } else if (sound) {
      sites = sites.filter((p) => (pattern.match ? pattern.match(p, sound) : p.symbol === sound));
    }
    return sites.filter((site) => siteMatches(pattern, site, position));
  }

  function predict(pattern, entry, sound, position) {
    const target = analyse(entry);
    const error = analyse(entry);
    pattern.apply(error.phones, error.syllables);
    target.phones.forEach((p, i) => {
      p.hit = error.phones[i].dropped || Boolean(error.phones[i].from);
    });
    const kept = error.syllables
      .map((s) => ({ stress: s.stress, phones: s.phones.filter((p) => !p.dropped) }))
      .filter((s) => s.phones.some((p) => p.vowel));
    for (const s of kept) for (const p of s.phones) p.changed = Boolean(p.from);
    return { entry, pattern, target: target.syllables, error: kept };
  }

  function ipa(syllables, flag) {
    const { display, escapeHtml } = window.SLP;
    const n = syllables.length;
    return (
      "/" +
      syllables
        .map((s, i) => {
          const mark = n > 1 ? (s.stress === 1 ? "ˈ" : s.stress === 2 ? "ˌ" : "") : "";
          const body = s.phones
            .map((p) => {
              const text = display(p.symbol);
              if (!flag) return text;
              return p[flag] ? `<mark class="soda__mark">${escapeHtml(text)}</mark>` : escapeHtml(text);
            })
            .join("");
          return (i === 0 || mark ? mark : ".") + body;
        })
        .join("") +
      "/"
    );
  }

  function levelOk(entry) {
    const maxAge = Number(levelSelect.value);
    if (!maxAge) return true;
    return entry.age > 0 && entry.age <= maxAge && entry.rank > 0 && entry.rank <= COMMON_RANK;
  }

  function syllablesOk(entry) {
    const n = Number(syllableSelect.value);
    return !n || entry.syllables.length === n;
  }

  function poolFor(pattern, sound, position) {
    return words.filter((entry) => levelOk(entry) && syllablesOk(entry) && sitesFor(pattern, entry, sound, position).length);
  }

  const isMixed = () => patternSelect.value === MIXED;
  const chosen = () => PATTERNS[patternSelect.value];

  const POSITION_LABEL = { any: "Anywhere", initial: "Initial", medial: "Medial", final: "Final" };

  function refreshOptions() {
    const pattern = chosen();
    const { display } = window.SLP;

    soundSelect.replaceChildren(new Option((pattern && pattern.anyLabel) || "Any sound", ""));
    for (const s of pattern ? pattern.sounds : []) {
      soundSelect.append(new Option(s.label || `/${display(s.value)}/`, s.value));
    }
    soundSelect.disabled = !pattern || !pattern.sounds.length;

    const positions = pattern ? pattern.positions : [];
    positionSelect.replaceChildren(...(positions.length ? positions : ["any"]).map((p) => new Option(POSITION_LABEL[p], p)));
    positionSelect.disabled = positions.length < 2;

    const weak = pattern === PATTERNS.weak;
    const one = syllableSelect.querySelector('option[value="1"]');
    one.disabled = weak;
    if (weak && syllableSelect.value === "1") syllableSelect.value = "0";
  }

  function refreshPool() {
    if (!words.length) return;
    if (isMixed()) {
      const counts = Object.values(PATTERNS).map((p) => poolFor(p, "", "any").length);
      const min = Math.min(...counts);
      poolText.innerHTML = `Words for all ${Object.keys(PATTERNS).length} patterns, at least <strong>${min.toLocaleString()}</strong> available for each`;
      generateBtn.disabled = min === 0;
      return;
    }
    const total = poolFor(chosen(), soundSelect.value, positionSelect.value).length;
    poolText.innerHTML = `<strong>${total.toLocaleString()}</strong> word${total === 1 ? "" : "s"} where this pattern could show`;
    generateBtn.disabled = total === 0;
  }

  function generate() {
    const amount = Math.max(1, Math.min(60, Math.round(Number(countInput.value)) || 1));
    countInput.value = amount;
    const { shuffle } = window.SLP;

    if (isMixed()) {
      const list = Object.values(PATTERNS);
      const per = Math.ceil(amount / list.length);
      const used = new Set();
      const rows = [];
      for (const pattern of list) {
        let got = 0;
        for (const entry of shuffle(poolFor(pattern, "", "any"))) {
          if (got >= per) break;
          if (used.has(entry.word)) continue;
          used.add(entry.word);
          rows.push(predict(pattern, entry, "", "any"));
          got++;
        }
      }
      current = [];
      for (let round = 0; current.length < amount && round < per; round++) {
        for (const pattern of list) {
          const row = rows.filter((r) => r.pattern === pattern)[round];
          if (row && current.length < amount) current.push(row);
        }
      }
      current.sort((a, b) => list.indexOf(a.pattern) - list.indexOf(b.pattern) || a.entry.word.localeCompare(b.entry.word));
      notice.hidden = current.length >= amount;
      if (!notice.hidden) notice.textContent = `Only ${current.length} words could be found across the ${Object.keys(PATTERNS).length} patterns with these settings.`;
    } else {
      const pattern = chosen();
      const sound = soundSelect.value;
      const position = positionSelect.value;
      const available = poolFor(pattern, sound, position);
      current = shuffle(available)
        .slice(0, amount)
        .sort((a, b) => a.word.localeCompare(b.word))
        .map((entry) => predict(pattern, entry, sound, position));
      notice.hidden = available.length >= amount;
      if (!notice.hidden) {
        notice.textContent = `Only ${available.length} word${available.length === 1 ? "" : "s"} match these settings, so the sheet has ${available.length} instead of ${amount}.`;
      }
    }

    render();
    results.hidden = false;
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function titleText() {
    if (isMixed()) return `All ${Object.keys(PATTERNS).length} patterns`;
    const pattern = chosen();
    const { display } = window.SLP;
    const sound = soundSelect.value;
    const option = pattern.sounds.find((s) => s.value === sound);
    const soundText = sound ? ` · ${option && option.label ? option.label.replace(/ \(.*$/, "") : `/${display(sound)}/`}` : "";
    const position = positionSelect.value !== "any" && pattern.positions.length > 1 ? ` · ${POSITION_LABEL[positionSelect.value].toLowerCase()}` : "";
    return pattern.label + soundText + position;
  }

  function render() {
    const { escapeHtml } = window.SLP;
    if (!current.length) {
      sheet.innerHTML = '<p class="empty">No words match these settings. Try another sound, more syllables, or a wider vocabulary level.</p>';
      return;
    }
    const blanks = '<td class="soda__heard soda__blank"></td>' + ["S", "O", "D", "A"].map(() => '<td class="soda__box soda__blank"></td>').join("");
    const rows = current
      .map(
        (row, i) =>
          "<tr>" +
          `<td class="words__num">${i + 1}</td>` +
          `<td class="words__word" data-label="Word">${escapeHtml(row.entry.word)}</td>` +
          `<td class="words__ipa" data-label="Target">${ipa(row.target, "hit")}</td>` +
          `<td class="words__ipa soda__error" data-label="Likely error">${ipa(row.error, "changed")}${isMixed() ? `<small class="soda__pattern">${escapeHtml(row.pattern.label)}</small>` : ""}</td>` +
          blanks +
          "</tr>",
      )
      .join("");
    sheet.innerHTML =
      `<h3 class="spt__title">${escapeHtml(titleText())}</h3>` +
      '<table class="words sheet soda__table"><thead><tr>' +
      '<th scope="col" class="words__num">#</th>' +
      '<th scope="col">Word</th>' +
      '<th scope="col">Target</th>' +
      '<th scope="col">Likely error</th>' +
      '<th scope="col" class="soda__heard soda__blank">What you heard</th>' +
      ["Substitution", "Omission", "Distortion", "Addition"]
        .map((t) => `<th scope="col" class="soda__box soda__blank"><abbr title="${t}">${t[0]}</abbr></th>`)
        .join("") +
      `</tr></thead><tbody>${rows}</tbody>` +
      '<tfoot><tr><th scope="row" colspan="5" class="soda__total">' +
      `Total errors <span class="soda__correct">Correct: ______ / ${current.length}</span></th>` +
      ["S", "O", "D", "A"].map(() => '<td class="soda__box soda__blank"></td>').join("") +
      "</tr></tfoot></table>";
  }

  function chartHtml() {
    const { escapeHtml } = window.SLP;
    const byWord = new Map(words.map((e) => [e.word, e]));
    const TYPES = [
      ["Substitution", "One sound is replaced by another.", "rabbit said as “wabbit”"],
      ["Omission", "A sound is left out.", "cat said as “ca”"],
      ["Distortion", "The sound is attempted but comes out inaccurate, without becoming another English sound.", "/s/ with air escaping over the sides of the tongue (a lateral lisp)"],
      ["Addition", "An extra sound is inserted.", "blue said as “buh-lue”, /bəˈlu/"],
    ];
    const typeRows = TYPES.map(
      ([name, what, example]) =>
        `<tr><th scope="row"><b class="soda__letter">${name[0]}</b>${name}</th><td>${what}</td><td>${escapeHtml(example)}</td></tr>`,
    ).join("");
    const patternRows = Object.values(PATTERNS)
      .map((pattern) => {
        const entry = byWord.get(pattern.example);
        const example = entry
          ? (() => {
              const row = predict(pattern, entry, "", "any");
              return `<span class="soda__ex-word">${escapeHtml(entry.word)}</span> <span class="soda__ex-ipa">${ipa(row.target, "hit")} → ${ipa(row.error, "changed")}</span>`;
            })()
          : "";
        return `<tr><th scope="row">${pattern.label}</th><td>${pattern.type}</td><td>${escapeHtml(pattern.what)}</td><td>${example}</td></tr>`;
      })
      .join("");
    return (
      '<h2 id="soda-chart-title">Reference chart</h2>' +
      '<h3 class="soda-chart__sub">Error types</h3>' +
      '<table class="words sheet soda-chart__table"><thead><tr><th scope="col">Type</th><th scope="col">What happens</th><th scope="col">Example</th></tr></thead>' +
      `<tbody>${typeRows}</tbody></table>` +
      '<h3 class="soda-chart__sub">Error patterns</h3>' +
      '<table class="words sheet soda-chart__table soda-chart__table--patterns"><thead><tr><th scope="col">Pattern</th><th scope="col">Type</th><th scope="col">What happens</th><th scope="col">Example</th></tr></thead>' +
      `<tbody>${patternRows}</tbody></table>`
    );
  }

  function exportRows() {
    const text = (syllables) => ipa(syllables, null);
    return current.map((row, i) => [i + 1, row.entry.word, text(row.target), text(row.error), row.pattern.label, row.pattern.type]);
  }

  const HEADER = ["#", "Word", "Target IPA", "Likely error IPA", "Pattern", "Error type"];

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!generateBtn.disabled) generate();
  });

  patternSelect.addEventListener("change", () => {
    refreshOptions();
    refreshPool();
  });
  for (const input of [soundSelect, positionSelect, syllableSelect, levelSelect]) {
    input.addEventListener("change", refreshPool);
  }

  chartPrint.addEventListener("change", () => chart.classList.toggle("soda-chart--print", chartPrint.checked));

  el("plain-r").addEventListener("change", () => {
    refreshOptions();
    if (words.length) chart.innerHTML = chartHtml();
    if (current.length) render();
  });

  el("soda-copy").addEventListener("click", async () => {
    const ok = await window.SLP.copyText(exportRows().map((r) => r.join("\t")).join("\n"));
    const btn = el("soda-copy");
    btn.textContent = ok ? "Copied" : "Copy failed";
    setTimeout(() => (btn.textContent = "Copy"), 1600);
  });

  el("soda-csv").addEventListener("click", () => {
    const cell = (v) => (/[",\r\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
    const csv = [HEADER, ...exportRows()].map((r) => r.map(cell).join(",")).join("\r\n");
    window.SLP.download("﻿" + csv + "\r\n", "slp-soda-scoring-sheet.csv", "text/csv;charset=utf-8");
  });

  el("soda-print").addEventListener("click", () => window.print());

  for (const [key, pattern] of Object.entries(PATTERNS)) {
    patternSelect.append(new Option(`${pattern.label} (${pattern.type.toLowerCase()})`, key));
  }

  window.SLP.onReady((loaded) => {
    words = loaded;
    refreshOptions();
    chart.innerHTML = chartHtml();
    refreshPool();
    generateBtn.textContent = "Generate scoring sheet";
  });
})();
