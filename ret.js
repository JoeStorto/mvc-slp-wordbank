(() => {
  "use strict";

  const NOUNS = {
    Home: ["kitchen", "bed", "couch", "lamp", "kettle", "broom", "towel", "key", "clock", "window", "blanket", "mug", "sink", "toolbox"],
    Food: ["sandwich", "coffee", "apple", "soup", "birthday cake", "pizza", "ice cream", "grocery bag", "breakfast", "cookie jar", "salad", "popcorn"],
    Animals: ["dog", "cat", "horse", "bird", "fish", "rabbit", "cow", "duck", "squirrel", "puppy", "kitten", "turtle"],
    Outdoors: ["garden", "beach", "rain", "snow", "campfire", "mountain", "lake", "park bench", "bicycle", "boat", "tent", "fishing rod"],
    "School and work": ["pencil", "notebook", "computer", "classroom", "telephone", "calendar", "mailbox", "desk", "library", "hammer", "truck", "ladder"],
    Clothing: ["shoes", "coat", "hat", "glasses", "watch", "umbrella", "gloves", "scarf", "boots", "purse"],
    "People and health": ["baby", "grandmother", "doctor", "nurse", "mail carrier", "neighbor", "wheelchair", "medicine", "toothbrush", "hairbrush"],
  };

  const ACTIONS = {
    Home: ["someone washing dishes", "a man making coffee", "a woman folding laundry", "someone sweeping the floor", "a family eating dinner", "someone answering the phone"],
    Food: ["a girl eating ice cream", "someone cutting a birthday cake", "a man grilling outside", "someone carrying groceries", "a child spilling milk"],
    Animals: ["a dog chasing a ball", "a cat sleeping on a chair", "a bird building a nest", "a horse jumping a fence", "someone walking a dog"],
    Outdoors: ["children building a snowman", "a man mowing the lawn", "people swimming at the beach", "someone raking leaves", "a woman planting flowers", "a boy riding a bike"],
    "School and work": ["a teacher writing on the board", "children waiting for the bus", "a man fixing a car", "someone painting a wall", "a woman giving a presentation", "a man climbing a ladder"],
    Clothing: ["a child tying his shoes", "a woman buttoning her coat", "someone trying on glasses", "a man holding an umbrella in the rain"],
    "People and health": ["a nurse taking blood pressure", "a grandmother reading to a child", "someone brushing their teeth", "a man using a wheelchair ramp", "neighbors shaking hands"],
  };

  const NOUN_CUES = [
    "What is it? / What is it called?",
    "What do you do with it?",
    "Where do you keep it? / Where do you see it?",
    "When do you use it?",
    "Who uses it?",
    "What do you think about it?",
  ];

  const ACTION_CUES = [
    "Who is that? / Who do you see?",
    "What are they doing?",
    "Where is this happening?",
    "When would this happen?",
    "Why are they doing it?",
    "What happens next?",
  ];

  const el = (id) => document.getElementById(id);
  const form = el("ret-controls");
  const typeSelect = el("ret-type");
  const countInput = el("ret-count");
  const themeSelect = el("ret-theme");
  const generateBtn = el("ret-generate");
  const poolText = el("ret-pool");
  const results = el("ret-results");
  const listBox = el("ret-list");

  let current = [];

  function themes() {
    return [...new Set([...Object.keys(NOUNS), ...Object.keys(ACTIONS)])];
  }

  function itemPool() {
    const type = typeSelect.value;
    const theme = themeSelect.value;
    const out = [];
    const add = (source, kind) => {
      for (const [name, items] of Object.entries(source)) {
        if (theme && name !== theme) continue;
        for (const text of items) out.push({ text, kind, theme: name });
      }
    };
    if (type !== "action") add(NOUNS, "noun");
    if (type !== "noun") add(ACTIONS, "action");
    return out;
  }

  function itemHtml(item, position) {
    const { escapeHtml, shuffle } = window.SLP;
    const cues = item.kind === "noun" ? NOUN_CUES : ACTION_CUES;
    const chosen = shuffle(cues).slice(0, 3);
    const steps = [
      ["Free response", "Show the picture. <em>Tell me about this.</em> Wait, and accept whatever comes: a word, a gesture, a phrase."],
      ["Reinforce and model", "Confirm the response and say it back as a simple sentence, using the person's own words."],
      ["Wh-cue", `Ask one cue to add information:<ul class="ret__cues">${chosen.map((c) => `<li>${escapeHtml(c)}</li>`).join("")}</ul>`],
      ["Model the whole sentence", "Combine the first response and the new information into one sentence, then ask for a repetition."],
      ["Come back to it", "Re-present the picture later in the session and ask for the full sentence again."],
    ];
    return (
      '<article class="card ret">' +
      '<header class="ret__head">' +
      `<span class="badge badge--sand">${position}</span>` +
      `<h3 class="ret__stimulus">${escapeHtml(item.text)}</h3>` +
      `<span class="ret__kind">${item.kind === "noun" ? "Object" : "Action"} · ${escapeHtml(item.theme)}</span>` +
      "</header>" +
      '<ol class="ret__steps">' +
      steps.map(([title, body]) => `<li><b>${title}.</b> ${body}</li>`).join("") +
      "</ol>" +
      '<p class="ret__notes">Notes: <span class="ret__line"></span></p>' +
      "</article>"
    );
  }

  function render() {
    listBox.innerHTML = current.length
      ? `<div class="cards cards--ret">${current.map((item, i) => itemHtml(item, i + 1)).join("")}</div>`
      : '<p class="empty">No prompts match these settings.</p>';
  }

  function generate() {
    const amount = Math.max(1, Math.min(40, Math.round(Number(countInput.value)) || 1));
    countInput.value = amount;
    const pool = itemPool();
    current = window.SLP.shuffle(pool).slice(0, amount);
    poolText.innerHTML = `<strong>${current.length}</strong> prompt${current.length === 1 ? "" : "s"} from ${pool.length} available`;
    render();
    results.hidden = false;
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function copyText() {
    const cues = (item) => (item.kind === "noun" ? NOUN_CUES : ACTION_CUES).join(" | ");
    return current
      .map((item, i) => `${i + 1}. ${item.text} (${item.kind}, ${item.theme})\n   Cues: ${cues(item)}`)
      .join("\n");
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    generate();
  });

  el("ret-copy").addEventListener("click", async () => {
    const ok = await window.SLP.copyText(copyText());
    const btn = el("ret-copy");
    btn.textContent = ok ? "Copied" : "Copy failed";
    setTimeout(() => (btn.textContent = "Copy"), 1600);
  });

  el("ret-print").addEventListener("click", () => window.print());

  for (const name of themes()) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    themeSelect.append(option);
  }

  generateBtn.disabled = false;
})();
