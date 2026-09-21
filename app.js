(() => {
  "use strict";

  const MAX_SYLLABLES = 10;
  const MAX_WORDS = 500;

  const VOWELS = {
    AA: "ɑ", AE: "æ", AH: "ʌ", AO: "ɔ", AW: "aʊ", AY: "aɪ", EH: "ɛ", ER: "ɝ",
    EY: "eɪ", IH: "ɪ", IY: "i", OW: "oʊ", OY: "ɔɪ", UH: "ʊ", UW: "u",
  };

  const CONSONANTS = {
    B: "b", CH: "tʃ", D: "d", DH: "ð", F: "f", G: "ɡ", HH: "h", JH: "dʒ", K: "k",
    L: "l", M: "m", N: "n", NG: "ŋ", P: "p", R: "ɹ", S: "s", SH: "ʃ", T: "t",
    TH: "θ", V: "v", W: "w", Y: "j", Z: "z", ZH: "ʒ",
  };

  const ONSETS = new Set([
    ...Object.keys(CONSONANTS).filter((c) => c !== "NG"),
    "P R", "P L", "B R", "B L", "T R", "D R", "K R", "K L", "G R", "G L",
    "F R", "F L", "TH R", "SH R", "S P", "S T", "S K", "S M", "S N", "S L",
    "S W", "S F", "T W", "D W", "K W", "G W", "TH W", "P Y", "B Y", "F Y",
    "V Y", "K Y", "G Y", "M Y", "HH Y",
    "S P R", "S P L", "S T R", "S K R", "S K W", "S K L", "S P Y", "S K Y",
  ]);

  const LAX = new Set(["IH", "EH", "AE", "AH", "UH"]);

  const SOUND_GROUPS = [
    { label: "Consonants", symbols: ["p", "b", "t", "d", "k", "ɡ", "f", "v", "θ", "ð", "s", "z", "ʃ", "ʒ", "h", "tʃ", "dʒ", "m", "n", "ŋ", "l", "ɹ", "w", "j"] },
    { label: "Vowels", symbols: ["i", "ɪ", "eɪ", "ɛ", "æ", "ɑ", "ɔ", "oʊ", "ʊ", "u", "ʌ", "ə", "ɝ", "ɚ"] },
    { label: "Diphthongs", symbols: ["aɪ", "aʊ", "ɔɪ"] },
  ];

  const el = (id) => document.getElementById(id);
  const form = el("controls");
  const countInput = el("count");
  const frequencySelect = el("frequency");
  const soundSelect = el("sound");
  const positionSelect = el("position");
  const balanceInput = el("balance");
  const plainRInput = el("plain-r");
  const generateBtn = el("generate");
  const poolText = el("pool");
  const chipsBox = el("syllable-chips");
  const results = el("results");
  const listBox = el("word-list");
  const notice = el("notice");
  const sortSelect = el("sort");
  const wordTypeSelect = el("word-type");
  const perCountInput = el("per-count");

  let words = [];
  let current = [];

  function symbolFor(code, stress) {
    if (code === "AH" && stress === 0) return "ə";
    if (code === "ER" && stress === 0) return "ɚ";
    return VOWELS[code] || CONSONANTS[code];
  }

  function syllabify(phones) {
    const vowelAt = [];
    phones.forEach((p, i) => {
      if (p.vowel) vowelAt.push(i);
    });

    const syllables = vowelAt.map((v) => ({ stress: phones[v].stress, phones: [] }));
    let start = 0;

    vowelAt.forEach((v, n) => {
      const next = vowelAt[n + 1];
      if (next === undefined) {
        syllables[n].phones = phones.slice(start);
        return;
      }
      const cluster = phones.slice(v + 1, next).map((p) => p.code);
      let split = cluster.length;
      for (let k = 0; k < cluster.length; k++) {
        if (ONSETS.has(cluster.slice(k).join(" "))) {
          split = k;
          break;
        }
      }
      const vowel = phones[v];
      if (split === 0 && cluster.length && vowel.stress > 0 && LAX.has(vowel.code)) {
        split = 1;
      }
      const end = v + 1 + split;
      syllables[n].phones = phones.slice(start, end);
      start = end;
    });

    return syllables;
  }

  function parseEntry(line) {
    const [word, arpabet, rank, age] = line.split("\t");
    const phones = arpabet.split(" ").map((token) => {
      const code = token.replace(/[0-9]/g, "");
      const digit = token.match(/[0-9]/);
      const vowel = Boolean(digit);
      const stress = vowel ? Number(digit[0]) : null;
      return { code, vowel, stress, symbol: symbolFor(code, stress) };
    });
    const syllables = syllabify(phones);
    return {
      word,
      rank: Number(rank) || 0,
      age: (Number(age) || 0) / 10,
      phones,
      syllables,
      symbols: phones.map((p) => p.symbol),
    };
  }

  const TIED = { "aɪ": "a͡ɪ", "aʊ": "a͡ʊ", "ɔɪ": "ɔ͡ɪ", "eɪ": "e͡ɪ", "oʊ": "o͡ʊ" };

  function display(symbol) {
    const tied = TIED[symbol] || symbol;
    return plainRInput.checked ? tied.replace(/ɹ/g, "r") : tied;
  }

  function stressOf(entry, syllable) {
    if (entry.syllables.length < 2) return "primary";
    return syllable.stress === 1 ? "primary" : syllable.stress === 2 ? "secondary" : "";
  }

  function syllableText(entry, syllable, withMark = true) {
    const stress = entry.syllables.length > 1 ? stressOf(entry, syllable) : "";
    const mark = withMark ? { primary: "ˈ", secondary: "ˌ" }[stress] || "" : "";
    return mark + syllable.phones.map((p) => display(p.symbol)).join("");
  }

  function ipaText(entry) {
    return "/" + entry.syllables
      .map((s, i) => {
        const text = syllableText(entry, s);
        return i === 0 || /^[ˈˌ]/.test(text) ? text : "." + text;
      })
      .join("") + "/";
  }

  function readSelectedSyllables() {
    return [...chipsBox.querySelectorAll("input:checked")].map((i) => Number(i.value));
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

  function baseFilter() {
    const limit = Number(frequencySelect.value);
    const sound = soundSelect.value;
    const position = positionSelect.value;
    return (entry) =>
      (!limit || (entry.rank > 0 && entry.rank <= limit)) &&
      matchesSound(entry, sound, position);
  }

  function countBySyllables() {
    const keep = baseFilter();
    const counts = Array(MAX_SYLLABLES + 1).fill(0);
    for (const entry of words) {
      if (keep(entry)) counts[entry.syllables.length]++;
    }
    return counts;
  }

  function buildChips() {
    const frag = document.createDocumentFragment();
    for (let n = 1; n <= MAX_SYLLABLES; n++) {
      const label = document.createElement("label");
      label.className = "chip";
      label.innerHTML =
        `<input type="checkbox" value="${n}"${n <= 3 ? " checked" : ""}>` +
        `<span><b>${n}</b><small data-count="${n}">…</small></span>`;
      frag.append(label);
    }
    chipsBox.append(frag);
  }

  function buildSoundOptions() {
    for (const group of SOUND_GROUPS) {
      const og = document.createElement("optgroup");
      og.label = group.label;
      for (const symbol of group.symbols) {
        const option = document.createElement("option");
        option.value = symbol;
        option.textContent = `/${symbol}/`;
        og.append(option);
      }
      soundSelect.append(og);
    }
  }

  function refreshSoundLabels() {
    for (const option of soundSelect.querySelectorAll("option[value]")) {
      if (option.value) option.textContent = `/${display(option.value)}/`;
    }
  }

  function countMath() {
    const n = readSelectedSyllables().length;
    const amount = Math.max(1, Math.min(MAX_WORDS, Math.round(Number(countInput.value)) || 1));
    el("per-count-number").textContent = amount.toLocaleString();
    if (!perCount() || !n) return "";
    return ` · ${n} count${n === 1 ? "" : "s"} × ${amount} = <strong>${(n * amount).toLocaleString()}</strong> words`;
  }

  function refreshPool() {
    balanceInput.disabled = perCount();
    balanceInput.closest(".check").classList.toggle("check--off", perCount());
    frequencySelect.disabled = isNonsense();
    if (isNonsense()) {
      for (const small of chipsBox.querySelectorAll("[data-count]")) small.hidden = true;
      const selected = readSelectedSyllables();
      poolText.innerHTML = selected.length
        ? "A new set of nonsense words is created each time you click Generate" + countMath()
        : "Choose at least one syllable count.";
      generateBtn.disabled = !selected.length;
      generateBtn.textContent = "Generate word bank";
      return;
    }
    const counts = countBySyllables();
    for (let n = 1; n <= MAX_SYLLABLES; n++) {
      const small = chipsBox.querySelector(`[data-count="${n}"]`);
      small.hidden = false;
      small.textContent = `${counts[n].toLocaleString()} word${counts[n] === 1 ? "" : "s"}`;
    }
    const selected = readSelectedSyllables();
    const total = selected.reduce((sum, n) => sum + counts[n], 0);
    if (!selected.length) {
      poolText.textContent = "Choose at least one syllable count.";
    } else {
      poolText.innerHTML = `<strong>${total.toLocaleString()}</strong> matching word${total === 1 ? "" : "s"} to draw from${countMath()}`;
    }
    generateBtn.disabled = !selected.length || total === 0;
    generateBtn.textContent = "Generate word bank";
  }

  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const perCount = () => perCountInput.checked;

  function sample(amount) {
    if (isNonsense()) return sampleNonsense(amount);
    const keep = baseFilter();
    const selected = new Set(readSelectedSyllables());
    const pool = words.filter((e) => selected.has(e.syllables.length) && keep(e));

    if (perCount()) {
      const picked = [];
      const short = [];
      for (const n of [...selected].sort((a, b) => a - b)) {
        const bucket = shuffle(pool.filter((e) => e.syllables.length === n)).slice(0, amount);
        if (bucket.length < amount) short.push({ n, got: bucket.length });
        picked.push(...bucket);
      }
      return { picked, target: amount * selected.size, short };
    }

    if (!balanceInput.checked || selected.size < 2) {
      return { picked: shuffle(pool).slice(0, amount), target: amount, short: [] };
    }

    const buckets = [...selected]
      .sort((a, b) => a - b)
      .map((n) => shuffle(pool.filter((e) => e.syllables.length === n)))
      .filter((b) => b.length);
    const picked = [];
    let round = 0;
    while (picked.length < amount && buckets.some((b) => b.length > round)) {
      for (const bucket of buckets) {
        if (picked.length >= amount) break;
        if (bucket[round]) picked.push(bucket[round]);
      }
      round++;
    }
    return { picked, target: amount, short: [] };
  }

  const realSpellings = new Set();
  const realSounds = new Set();
  const soundKey = (entry) => entry.phones.map((p) => p.code).join(" ");
  let realCheck = null;

  function ensureRealCheck() {
    if (!realCheck) {
      realCheck = fetch("data/real-check.txt")
        .then((res) => {
          if (!res.ok) throw new Error(res.statusText);
          return res.text();
        })
        .then((text) => {
          const [spellings, sounds = ""] = text.split("\n#sounds\n");
          for (const line of spellings.split("\n")) if (line) realSpellings.add(line);
          for (const line of sounds.split("\n")) if (line) realSounds.add(line);
        })
        .catch((error) => {
          realCheck = null;
          throw error;
        });
    }
    return realCheck;
  }

  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  const N_ONSET_SINGLE = [
    "B", "B", "B", "B", "P", "P", "P", "P", "D", "D", "D", "D", "T", "T", "T", "T",
    "M", "M", "M", "M", "N", "N", "N", "N", "K", "K", "K", "G", "G", "G",
    "W", "W", "W", "HH", "HH", "F", "F", "S", "S", "L", "L", "Y", "V", "Z",
  ];
  const N_ONSET_CLUSTER = ["B L", "P L", "K L", "S L", "S T", "S P", "S N", "S M"];
  const N_CODA_SINGLE = [
    "P", "P", "B", "B", "T", "T", "T", "D", "D", "D", "K", "K", "G",
    "M", "M", "M", "N", "N", "N", "F", "S", "S", "L", "L", "NG",
  ];
  const N_CODA_MEDIAL = ["N", "N", "M", "M", "L", "T", "P"];
  const N_STRESSED = [
    "IH", "IH", "IH", "IH", "EH", "EH", "EH", "EH", "AE", "AE", "AE", "AE",
    "AA", "AA", "AA", "AH", "AH", "AH", "IY", "IY", "OW", "OW", "EY", "EY", "UW",
  ];
  const N_UNSTRESSED_FINAL = ["AH", "AH", "IY", "ER", "OW"];
  const N_UNSTRESSED_MEDIAL = ["AH", "AH", "AH", "IH", "ER"];
  const N_NO_CODA = new Set(["HH", "W", "Y", "R", "DH"]);
  const DIPHTHONGS = new Set(["AY", "AW", "OY"]);

  const SYMBOL_CODE = {};
  for (const [code, symbol] of Object.entries(CONSONANTS)) SYMBOL_CODE[symbol] = { code, vowel: false };
  for (const [code, symbol] of Object.entries(VOWELS)) SYMBOL_CODE[symbol] = { code, vowel: true, stressed: null };
  SYMBOL_CODE["ʌ"] = { code: "AH", vowel: true, stressed: true };
  SYMBOL_CODE["ə"] = { code: "AH", vowel: true, stressed: false };
  SYMBOL_CODE["ɝ"] = { code: "ER", vowel: true, stressed: true };
  SYMBOL_CODE["ɚ"] = { code: "ER", vowel: true, stressed: false };

  const split = (cluster) => (cluster ? cluster.split(" ") : []);

  function primaryIndex(n) {
    if (n === 1) return 0;
    const r = Math.random();
    if (r < 0.6 || n === 2) return r < 0.7 ? 0 : 1;
    return r < 0.85 ? 1 : 2;
  }

  function buildSyllables(n) {
    const primary = primaryIndex(n);
    const syllables = [];
    for (let i = 0; i < n; i++) {
      const final = i === n - 1;
      let stress = i === primary ? 1 : 0;
      if (n >= 4 && Math.abs(i - primary) === 2 && !syllables.some((s) => s.stress === 2)) stress = 2;

      const r = Math.random();
      let onset;
      if (i === 0) onset = r < 0.08 ? [] : r < 0.93 ? [pick(N_ONSET_SINGLE)] : split(pick(N_ONSET_CLUSTER));
      else onset = r < 0.97 ? [pick(N_ONSET_SINGLE)] : split(pick(N_ONSET_CLUSTER));

      const code = stress > 0 ? pick(N_STRESSED) : pick(final ? N_UNSTRESSED_FINAL : N_UNSTRESSED_MEDIAL);
      const lax = LAX.has(code);
      const c = Math.random();
      let coda = [];
      if (final) {
        if (stress === 0 && code !== "AH") coda = c < 0.85 ? [] : [pick(N_CODA_MEDIAL)];
        else if (DIPHTHONGS.has(code)) coda = c < 0.6 ? [] : [pick(N_CODA_SINGLE)];
        else if (lax) coda = [pick(N_CODA_SINGLE)];
        else coda = c < 0.45 ? [] : [pick(N_CODA_SINGLE)];
      } else if (c < (stress > 0 && lax ? 0.15 : 0.02)) {
        coda = [pick(N_CODA_MEDIAL)];
      }
      syllables.push({ stress, code, onset, coda });
    }
    return syllables;
  }

  function forceTarget(syllables, sound, position) {
    const info = SYMBOL_CODE[sound];
    if (!info) return;
    const n = syllables.length;
    const last = syllables[n - 1];
    const where = position === "any" ? pick(["initial", "medial", "final"]) : position;

    if (!info.vowel) {
      if (where === "initial" && info.code !== "NG") syllables[0].onset = [info.code];
      else if (where === "final" && !N_NO_CODA.has(info.code)) last.coda = [info.code];
      else if (where === "medial" && n > 1 && info.code !== "NG") syllables[1].onset = [info.code];
      else if (where === "medial" && info.code === "NG") syllables[0].coda = ["NG"];
      return;
    }

    let index = where === "initial" ? 0 : where === "final" ? n - 1 : Math.floor(Math.random() * n);
    if (info.stressed === false) {
      const options = syllables.map((s, i) => i).filter((i) => syllables[i].stress === 0);
      if (!options.length) return;
      if (syllables[index].stress !== 0) index = pick(options);
    }
    const syl = syllables[index];
    if (info.stressed === true && syl.stress === 0) {
      for (const s of syllables) {
        if (s.stress === 1) {
          s.stress = 0;
          s.code = "AH";
        }
      }
      syl.stress = 1;
    }
    syl.code = info.code;
    if (where === "initial" && index === 0) syl.onset = [];
    if (where === "final" && index === n - 1) syl.coda = [];
  }

  function normalize(syllables, sound) {
    const target = sound && SYMBOL_CODE[sound];
    for (const s of syllables) {
      if (DIPHTHONGS.has(s.code) && s.coda.length > 1) s.coda = [s.coda[s.coda.length - 1]];
      const forcedVowel = target && target.vowel && target.code === s.code;
      if (s.stress === 0 && s.coda.length && (s.code === "IY" || s.code === "OW") && !forcedVowel) {
        s.code = pick(["AH", "IH"]);
      }
    }
  }

  function isLegal(syllables) {
    for (let i = 0; i < syllables.length - 1; i++) {
      const coda = syllables[i].coda;
      const onset = syllables[i + 1].onset;
      if (coda.length && onset.length && coda[coda.length - 1] === onset[0]) return false;
    }
    const last = syllables[syllables.length - 1];
    if ((LAX.has(last.code) && last.code !== "AH" || last.code === "AH" && last.stress > 0) && !last.coda.length) return false;
    for (let i = 0; i < syllables.length; i++) {
      const s = syllables[i];
      if (s.coda.includes("NG") && !LAX.has(s.code)) return false;
      if (i > 0 && !s.onset.length && !syllables[i - 1].coda.length) return false;
      if (s.onset.length && s.coda.length && s.onset.join(" ") === s.coda.join(" ") && syllables.length === 1) return false;
    }
    return true;
  }

  function flatten(syllables) {
    const phones = [];
    for (const s of syllables) {
      for (const code of s.onset) phones.push({ code, vowel: false, stress: null });
      phones.push({ code: s.code, vowel: true, stress: s.stress });
      for (const code of s.coda) phones.push({ code, vowel: false, stress: null });
    }
    return phones.map((p) => ({ ...p, symbol: symbolFor(p.code, p.stress) }));
  }

  const FRONT = new Set(["IY", "IH", "EH", "AY", "ER", "Y"]);
  const SHORT = new Set(["IH", "EH", "AE", "AH", "AA"]);
  const SIMPLE = { P: "p", B: "b", T: "t", D: "d", G: "g", M: "m", N: "n", R: "r", W: "w", Y: "y", Z: "z", TH: "th", DH: "th", SH: "sh", ZH: "zh", HH: "h" };

  function spell(phones) {
    const last = phones.length - 1;
    const vowelAt = phones.map((p, i) => (p.vowel ? i : -1)).filter((i) => i >= 0);
    const lastVowel = vowelAt[vowelAt.length - 1];
    const magic =
      ["EY", "AY", "OW"].includes(phones[lastVowel].code) &&
      lastVowel === last - 1 &&
      !["NG", "V", "JH", "CH", "SH", "TH", "DH", "ZH"].includes(phones[last].code);

    let out = "";
    for (let i = 0; i <= last; i++) {
      const p = phones[i];
      const next = phones[i + 1];
      const prev = phones[i - 1];
      const final = i === last;

      if (p.vowel) {
        const isMagic = magic && i === lastVowel;
        const stressed = p.stress > 0;
        out += {
          IY: stressed ? "ee" : final ? "y" : "i",
          IH: "i",
          EY: final ? "ay" : isMagic ? "a" : "ai",
          EH: "e",
          AE: "a",
          AA: final ? "ah" : "o",
          AO: "aw",
          OW: isMagic || final ? "o" : "oa",
          UW: "oo",
          UH: "oo",
          AH: stressed || !final ? "u" : "a",
          ER: stressed ? "ur" : "er",
          AY: isMagic ? "i" : final ? "y" : next && next.code === "T" ? "igh" : "y",
          AW: final ? "ow" : "ou",
          OY: final ? "oy" : "oi",
        }[p.code];
        continue;
      }

      const afterShort = final && prev && prev.vowel && prev.stress > 0 && SHORT.has(prev.code);
      switch (p.code) {
        case "K":
          if (next && next.code === "W") {
            out += "qu";
            i++;
          } else if (afterShort) out += "ck";
          else out += final || (next && FRONT.has(next.code)) ? "k" : "c";
          break;
        case "CH":
          out += afterShort ? "tch" : "ch";
          break;
        case "JH":
          out += final ? (afterShort ? "dge" : "ge") : "j";
          break;
        case "F":
          out += afterShort ? "ff" : "f";
          break;
        case "S":
          out += afterShort ? "ss" : "s";
          break;
        case "L":
          out += afterShort ? "ll" : "l";
          break;
        case "V":
          out += final ? "ve" : "v";
          break;
        case "NG":
          out += next && next.code === "K" ? "n" : "ng";
          break;
        default:
          out += SIMPLE[p.code];
      }
    }
    return magic ? out + "e" : out;
  }

  const TABOO = ["fʌk", "ʃɪt", "bɪtʃ", "kʌnt", "kɑk", "dɪk", "pɪs", "twɑt", "hoɹ", "tɪt", "ɹe͡ɪp", "næz", "slət"];

  function isTaboo(word, sounds) {
    const run = sounds.replace(/ /g, "");
    return TABOO.some((bad) => run.includes(bad) || word.includes(bad));
  }

  function makeNonsense(n, sound, position, seen) {
    for (let attempt = 0; attempt < 400; attempt++) {
      const syllables = buildSyllables(n);
      if (sound) forceTarget(syllables, sound, position);
      normalize(syllables, sound);
      if (!isLegal(syllables)) continue;
      const phones = flatten(syllables);
      const word = spell(phones);
      const entry = {
        word,
        rank: 0,
        nonsense: true,
        phones,
        syllables: syllabify(phones),
        symbols: phones.map((p) => p.symbol),
      };
      if (entry.syllables.length !== n) continue;
      if (!matchesSound(entry, sound, position)) continue;
      const sounds = soundKey(entry);
      if (isTaboo(word, entry.symbols.join(""))) continue;
      if (realSpellings.has(word) || realSounds.has(sounds) || seen.has(word) || seen.has(sounds)) continue;
      seen.add(word);
      seen.add(sounds);
      return entry;
    }
    return null;
  }

  function sampleNonsense(amount) {
    const counts = readSelectedSyllables().sort((a, b) => a - b);
    const sound = soundSelect.value;
    const position = positionSelect.value;
    const seen = new Set();
    const picked = [];
    const failed = new Set();
    if (perCount()) {
      const short = [];
      for (const n of counts) {
        let got = 0;
        while (got < amount) {
          const entry = makeNonsense(n, sound, position, seen);
          if (!entry) break;
          picked.push(entry);
          got++;
        }
        if (got < amount) short.push({ n, got });
      }
      return { picked, target: amount * counts.length, short };
    }
    for (let i = 0; picked.length < amount && failed.size < counts.length && i < amount * 4; i++) {
      const open = counts.filter((n) => !failed.has(n));
      const n = balanceInput.checked ? open[i % open.length] : pick(open);
      const entry = makeNonsense(n, sound, position, seen);
      if (entry) picked.push(entry);
      else failed.add(n);
    }
    return { picked: shuffle(picked), target: amount, short: [] };
  }

  const isNonsense = () => wordTypeSelect.value === "nonsense";

  function sorted(list) {
    const byWord = (a, b) => a.word.localeCompare(b.word);
    const copy = list.slice();
    switch (sortSelect.value) {
      case "alpha":
        return copy.sort(byWord);
      case "phonemes":
        return copy.sort((a, b) => a.phones.length - b.phones.length || byWord(a, b));
      case "random":
        return copy;
      default:
        return copy.sort((a, b) => a.syllables.length - b.syllables.length || byWord(a, b));
    }
  }

  function escapeHtml(text) {
    return text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  }

  const STRESS_LABEL = { primary: "primary stress", secondary: "secondary stress" };

  function syllablesHtml(entry) {
    return entry.syllables
      .map((s) => {
        const stress = stressOf(entry, s);
        const cls = stress ? ` syl--${stress}` : "";
        const label = stress ? `<span class="sr-only"> (${STRESS_LABEL[stress]})</span>` : "";
        return `<span class="syl${cls}">${escapeHtml(syllableText(entry, s, false))}${label}</span>`;
      })
      .join("");
  }

  function phonemesHtml(entry) {
    const target = soundSelect.value;
    return entry.syllables
      .map((s) =>
        '<span class="phon-group">' +
        s.phones
          .map((p) => {
            const cls = [
              "phon",
              p.vowel ? "phon--vowel" : "",
              target && p.symbol === target ? "phon--target" : "",
            ].filter(Boolean).join(" ");
            return `<span class="${cls}">${escapeHtml(display(p.symbol))}</span>`;
          })
          .join("") +
        "</span>",
      )
      .join("");
  }

  function cardHtml(entry, extraClass = "") {
    return (
      `<article class="card${extraClass}">` +
      '<header class="card__head">' +
      `<h4 class="card__word">${escapeHtml(entry.word)}</h4>` +
      `<span class="card__ipa">${escapeHtml(ipaText(entry))}</span>` +
      "</header>" +
      '<div class="card__row">' +
      `<p class="card__label">Syllables <span class="badge">${entry.syllables.length}</span></p>` +
      `<div class="segs">${syllablesHtml(entry)}</div>` +
      "</div>" +
      '<div class="card__row">' +
      `<p class="card__label">Phonemes <span class="badge badge--sand">${entry.phones.length}</span></p>` +
      `<div class="phons">${phonemesHtml(entry)}</div>` +
      "</div>" +
      "</article>"
    );
  }

  function gridHtml(list) {
    return `<div class="cards">${list.map((e) => cardHtml(e)).join("")}</div>`;
  }

  function listHtml(list) {
    const rows = list
      .map(
        (e) =>
          "<tr>" +
          `<td class="words__word" data-label="Word">${escapeHtml(e.word)}</td>` +
          `<td data-label="Syllables"><div class="segs">${syllablesHtml(e)}</div></td>` +
          `<td class="words__num" data-label="Syll.">${e.syllables.length}</td>` +
          `<td data-label="Phonemes"><div class="phons">${phonemesHtml(e)}</div></td>` +
          `<td class="words__num" data-label="Phon.">${e.phones.length}</td>` +
          `<td class="words__ipa" data-label="IPA">${escapeHtml(ipaText(e))}</td>` +
          "</tr>",
      )
      .join("");
    return (
      '<table class="words"><thead><tr>' +
      '<th scope="col">Word</th>' +
      '<th scope="col">Syllables</th>' +
      '<th scope="col" class="words__num">#</th>' +
      '<th scope="col">Phonemes</th>' +
      '<th scope="col" class="words__num">#</th>' +
      '<th scope="col">IPA (American)</th>' +
      `</tr></thead><tbody>${rows}</tbody></table>`
    );
  }

  function readView() {
    try {
      return localStorage.getItem("slp-view") === "list" ? "list" : "cards";
    } catch {
      return "cards";
    }
  }

  let view = readView();

  function setView(next) {
    view = next;
    try {
      localStorage.setItem("slp-view", next);
    } catch {}
    for (const btn of document.querySelectorAll("[data-view]")) {
      btn.setAttribute("aria-pressed", String(btn.dataset.view === view));
    }
    render();
  }

  function render() {
    if (!current.length) {
      listBox.innerHTML = '<p class="empty">No words match these settings. Try more syllable counts, a larger word list, or a different sound.</p>';
      return;
    }
    const draw = view === "list" ? listHtml : gridHtml;
    const list = sorted(current);
    if (sortSelect.value !== "syllables") {
      listBox.innerHTML = draw(list);
      return;
    }
    const groups = new Map();
    for (const entry of list) {
      const n = entry.syllables.length;
      if (!groups.has(n)) groups.set(n, []);
      groups.get(n).push(entry);
    }
    listBox.innerHTML = [...groups]
      .map(([n, items]) =>
        '<section class="group">' +
        `<h3 class="group__title">${n} syllable${n === 1 ? "" : "s"} <small>${items.length} word${items.length === 1 ? "" : "s"}</small></h3>` +
        draw(items) +
        "</section>",
      )
      .join("");
  }

  const flash = el("flash");
  const flashStage = el("flash-stage");
  const flashCounter = el("flash-counter");
  let deck = [];
  let deckIndex = 0;

  function showFlash() {
    const entry = deck[deckIndex];
    flashStage.innerHTML = cardHtml(entry, " card--flash");
    flashCounter.textContent = `${deckIndex + 1} of ${deck.length}`;
  }

  function openFlash() {
    if (!current.length) return;
    deck = sorted(current);
    deckIndex = 0;
    showFlash();
    flash.showModal();
  }

  function step(delta) {
    deckIndex = (deckIndex + delta + deck.length) % deck.length;
    showFlash();
  }

  function randomCard() {
    if (deck.length < 2) return;
    let next = deckIndex;
    while (next === deckIndex) next = Math.floor(Math.random() * deck.length);
    deckIndex = next;
    showFlash();
  }

  el("flash-open").addEventListener("click", openFlash);
  el("flash-close").addEventListener("click", () => flash.close());
  el("flash-prev").addEventListener("click", () => step(-1));
  el("flash-next").addEventListener("click", () => step(1));
  el("flash-random").addEventListener("click", randomCard);

  flash.addEventListener("click", (event) => {
    if (event.target === flash) flash.close();
  });

  flash.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") step(-1);
    else if (event.key === "ArrowRight") step(1);
    else if (event.key === "r" || event.key === "R") randomCard();
    else return;
    event.preventDefault();
  });

  let touchX = null;
  flashStage.addEventListener("touchstart", (event) => {
    touchX = event.changedTouches[0].clientX;
  }, { passive: true });
  flashStage.addEventListener("touchend", (event) => {
    if (touchX === null) return;
    const dx = event.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
  });

  for (const btn of document.querySelectorAll("[data-view]")) {
    btn.addEventListener("click", () => setView(btn.dataset.view));
  }
  setView(view);

  async function generate() {
    if (isNonsense()) {
      generateBtn.disabled = true;
      generateBtn.textContent = "Checking against real words…";
      try {
        await ensureRealCheck();
      } catch {
        notice.hidden = false;
        notice.textContent = "The real-word check failed to load, so no nonsense words were made. Try again.";
        results.hidden = false;
        current = [];
        render();
        refreshPool();
        return;
      }
      refreshPool();
    }
    const requested = Math.round(Number(countInput.value));
    if (!Number.isFinite(requested) || requested < 1) {
      countInput.value = 1;
    } else if (requested > MAX_WORDS) {
      countInput.value = MAX_WORDS;
    }
    const amount = Number(countInput.value);
    const { picked, target, short } = sample(amount);
    current = picked;

    const plural = (n, word) => `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`;
    if (picked.length < target) {
      const detail = short.length
        ? ` Short: ${short.map(({ n, got }) => `${plural(got, "word")} with ${plural(n, "syllable")}`).join(", ")}.`
        : "";
      notice.hidden = false;
      notice.textContent = `Only ${plural(picked.length, "word")} match these settings, so the bank has ${picked.length.toLocaleString()} instead of ${target.toLocaleString()}.${detail}`;
    } else {
      notice.hidden = true;
    }

    render();
    results.hidden = false;
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function plainSyllables(e) {
    return e.syllables.map((s) => syllableText(e, s, false)).join("-");
  }

  function plainPhonemes(e) {
    return e.phones.map((p) => display(p.symbol)).join(" ");
  }

  const EXPORT_HEADER = ["Word", "IPA", "Syllables", "Syllable breakdown", "Phonemes", "Phoneme breakdown"];

  function exportRows() {
    return sorted(current).map((e) => [
      e.word,
      ipaText(e),
      e.syllables.length,
      plainSyllables(e),
      e.phones.length,
      plainPhonemes(e),
    ]);
  }

  function quizletText() {
    return sorted(current)
      .map((e) => {
        const syl = e.syllables.length;
        const phon = e.phones.length;
        const definition =
          `${ipaText(e)}, ` +
          `${syl} syllable${syl === 1 ? "" : "s"} (${plainSyllables(e)}), ` +
          `${phon} phoneme${phon === 1 ? "" : "s"} (${plainPhonemes(e)})`;
        return `${e.word}\t${definition}`;
      })
      .join("\n");
  }

  async function writeClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  function flashLabel(btn, text, original) {
    btn.textContent = text;
    setTimeout(() => (btn.textContent = original), 1600);
  }

  async function copyList() {
    const text = exportRows().map((r) => r.join("\t")).join("\n");
    const ok = await writeClipboard(text);
    flashLabel(el("copy"), ok ? "Copied" : "Copy failed", "Copy");
  }

  function download(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function downloadCsv() {
    const cell = (v) => {
      const text = String(v);
      return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const csv = [EXPORT_HEADER, ...exportRows()].map((r) => r.map(cell).join(",")).join("\r\n");
    download("﻿" + csv + "\r\n", "slp-word-bank.csv", "text/csv;charset=utf-8");
  }

  const quizlet = el("quizlet");

  async function exportQuizlet() {
    const ok = await writeClipboard(quizletText());
    el("quizlet-status").textContent = ok
      ? `${current.length} card${current.length === 1 ? "" : "s"} copied to your clipboard.`
      : "Your browser blocked the clipboard. Download the file instead and paste its contents.";
    quizlet.showModal();
  }

  el("quizlet-open").addEventListener("click", exportQuizlet);
  el("quizlet-close").addEventListener("click", () => quizlet.close());
  el("quizlet-download").addEventListener("click", () =>
    download(quizletText() + "\n", "slp-word-bank-quizlet.txt", "text/plain;charset=utf-8"),
  );
  quizlet.addEventListener("click", (event) => {
    if (event.target === quizlet) quizlet.close();
  });

  async function load() {
    buildChips();
    buildSoundOptions();
    try {
      const res = await fetch("data/words.tsv");
      if (!res.ok) throw new Error(res.statusText);
      const text = await res.text();
      words = text.split("\n").filter(Boolean).map(parseEntry);
      for (const entry of words) {
        realSpellings.add(entry.word);
        realSounds.add(soundKey(entry));
      }
      refreshPool();
    } catch {
      generateBtn.textContent = "Word list failed to load";
      poolText.textContent = "Refresh the page to try again.";
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!generateBtn.disabled) generate();
  });

  form.addEventListener("click", (event) => {
    const mode = event.target.dataset && event.target.dataset.select;
    if (!mode) return;
    for (const input of chipsBox.querySelectorAll("input")) input.checked = mode === "all";
    refreshPool();
  });

  chipsBox.addEventListener("change", refreshPool);
  perCountInput.addEventListener("change", refreshPool);
  countInput.addEventListener("input", refreshPool);
  frequencySelect.addEventListener("change", refreshPool);
  wordTypeSelect.addEventListener("change", () => {
    if (isNonsense()) ensureRealCheck().catch(() => {});
    refreshPool();
  });
  soundSelect.addEventListener("change", refreshPool);
  positionSelect.addEventListener("change", refreshPool);
  plainRInput.addEventListener("change", () => {
    refreshSoundLabels();
    if (current.length) render();
  });
  sortSelect.addEventListener("change", render);
  el("copy").addEventListener("click", copyList);
  el("csv").addEventListener("click", downloadCsv);
  el("print").addEventListener("click", () => window.print());

  const ready = [];
  window.SLP = {
    display,
    ipaText,
    escapeHtml,
    shuffle,
    pick,
    download,
    copyText: writeClipboard,
    syllablesHtml,
    phonemesHtml,
    plainSyllables,
    plainPhonemes,
    soundGroups: SOUND_GROUPS,
    words: () => words,
    onReady(callback) {
      if (words.length) callback(words);
      else ready.push(callback);
    },
  };

  load().then(() => {
    for (const callback of ready) callback(words);
    ready.length = 0;
  });
})();
