import { readFile, writeFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "data", "words.tsv");

const SOURCES = {
  cmu: {
    url: "https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict",
    file: ".cache-cmudict.dict",
    encoding: "utf8",
  },
  moby: {
    url: "https://www.gutenberg.org/files/3204/files/mhyph.txt",
    file: ".cache-mhyph.txt",
    encoding: "latin1",
  },
  freq: {
    url: "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_50k.txt",
    file: ".cache-freq.txt",
    encoding: "utf8",
  },
  blocked: {
    url: "https://raw.githubusercontent.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/master/en",
    file: ".cache-blocked.txt",
    encoding: "utf8",
  },
};

async function load({ url, file, encoding }) {
  const path = join(here, file);
  try {
    await access(path);
  } catch {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Download failed: ${url} (${res.status})`);
    await writeFile(path, Buffer.from(await res.arrayBuffer()));
  }
  return readFile(path, encoding);
}

const [cmuText, mobyText, freqText, blockedText] = await Promise.all([
  load(SOURCES.cmu),
  load(SOURCES.moby),
  load(SOURCES.freq),
  load(SOURCES.blocked),
]);

const blocked = new Set(
  blockedText.split(/\r?\n/).map((l) => l.trim().toLowerCase()).filter(Boolean),
);

const rank = new Map();
freqText.split(/\r?\n/).forEach((line, i) => {
  const word = line.split(" ")[0];
  if (word && !rank.has(word)) rank.set(word, i + 1);
});

const dictionary = new Set();
for (const line of mobyText.split(/\r?\n/)) {
  if (!/^[a-z\xA5]+$/.test(line)) continue;
  dictionary.add(line.replaceAll("\xA5", ""));
}

const notEnglish = new Set([
  "assicurazioni",
  "microelettronica",
  "partecipazioni",
  "revolucionario",
  "laryngoscopicaly",
]);

const seen = new Set();
const rows = [];
for (const line of cmuText.split(/\r?\n/)) {
  const m = line.match(/^([a-z]+) ([A-Z0-9 ]+?)(?:\s+#.*)?$/);
  if (!m) continue;
  const [, word, phones] = m;
  if (word.length < 2 && word !== "a" && word !== "i") continue;
  if (blocked.has(word) || notEnglish.has(word)) continue;
  const syllables = (phones.match(/[0-2]/g) || []).length;
  if (syllables < 1 || syllables > 10) continue;
  if (!dictionary.has(word) && syllables < 7) continue;
  if (seen.has(word)) continue;
  seen.add(word);
  rows.push([word, phones, rank.get(word) || 0]);
}

const supplement = await readFile(join(here, "long-words.tsv"), "utf8");
for (const line of supplement.split(/\r?\n/)) {
  const [word, phones] = line.split("\t");
  if (!word || seen.has(word)) continue;
  seen.add(word);
  rows.push([word, phones, rank.get(word) || 0]);
}

rows.sort((a, b) => (a[0] < b[0] ? -1 : 1));
await writeFile(out, rows.map((r) => r.join("\t")).join("\n") + "\n");

const realSpellings = new Set([...blocked].filter((w) => /^[a-z]+$/.test(w)));
const realSounds = new Set();
for (const line of cmuText.split(/\r?\n/)) {
  const m = line.match(/^([a-z']+)(?:\(\d+\))? ([A-Z0-9 ]+?)(?:\s+#.*)?$/);
  if (!m) continue;
  const spelling = m[1].replaceAll("'", "");
  if (spelling) realSpellings.add(spelling);
  realSounds.add(m[2].replace(/[0-9]/g, ""));
}
for (const line of mobyText.split(/\r?\n/)) {
  for (const part of line.toLowerCase().replaceAll("\xA5", "").split(/[^a-z]+/)) {
    if (part) realSpellings.add(part);
  }
}
for (const line of freqText.split(/\r?\n/)) {
  const word = line.split(" ")[0];
  if (/^[a-z]+$/.test(word)) realSpellings.add(word);
}
await writeFile(
  join(here, "..", "data", "real-check.txt"),
  [...realSpellings].sort().join("\n") + "\n#sounds\n" + [...realSounds].sort().join("\n") + "\n",
);

const counts = {};
for (const r of rows) {
  const n = (r[1].match(/[0-2]/g) || []).length;
  counts[n] = (counts[n] || 0) + 1;
}
process.stdout.write(
  `${rows.length} words written to data/words.tsv\n` +
    `by syllable count: ${JSON.stringify(counts)}\n` +
    `real-word check: ${realSpellings.size} spellings, ${realSounds.size} pronunciations\n`,
);
