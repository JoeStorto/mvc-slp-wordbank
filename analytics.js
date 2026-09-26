(() => {
  "use strict";

  const track = (name, tags) => {
    if (typeof window.clarity !== "function") return;
    if (tags) {
      for (const [key, value] of Object.entries(tags)) {
        if (value) window.clarity("set", key, String(value));
      }
    }
    window.clarity("event", name);
  };

  const value = (id) => {
    const el = document.getElementById(id);
    return el ? el.value : "";
  };

  const bucket = (raw) => {
    const num = Number(raw);
    if (!Number.isFinite(num)) return "";
    if (num <= 10) return "1-10";
    if (num <= 25) return "11-25";
    if (num <= 50) return "26-50";
    if (num <= 100) return "51-100";
    return "100+";
  };

  const syllables = () => {
    const chips = [...document.querySelectorAll("#syllable-chips input:checked")];
    return chips.map((chip) => chip.value).join(",");
  };

  const onSubmit = (formId, handler) => {
    const form = document.getElementById(formId);
    if (form) form.addEventListener("submit", handler);
  };

  onSubmit("controls", () => {
    track("generate_words", {
      word_type: value("word-type"),
      word_count: bucket(value("count")),
      syllables: syllables(),
      familiarity: value("frequency"),
      target_sound: value("sound"),
      sound_position: value("position")
    });
  });

  onSubmit("pairs-controls", () => {
    track("generate_pairs", {
      pairs_type: value("pairs-type"),
      pairs_count: bucket(value("pairs-count")),
      pairs_syllables: value("pairs-syllables"),
      pairs_sound: value("pairs-sound")
    });
  });

  onSubmit("ret-controls", () => {
    track("generate_ret", {
      ret_type: value("ret-type"),
      ret_count: bucket(value("ret-count")),
      ret_theme: value("ret-theme")
    });
  });

  onSubmit("spt-controls", () => {
    track("generate_spt", {
      spt_sound: value("spt-sound"),
      spt_count: bucket(value("spt-count")),
      spt_syllables: value("spt-syllables"),
      spt_position: value("spt-position")
    });
  });

  for (const tab of document.querySelectorAll(".tab")) {
    tab.addEventListener("click", () => track("tab_" + tab.id.replace("tab-", "")));
  }

  for (const btn of document.querySelectorAll("[data-view]")) {
    btn.addEventListener("click", () => track("view_" + btn.dataset.view));
  }

  const actions = {
    "flash-open": "view_flash_cards",
    copy: "export_words_copy",
    csv: "export_words_csv",
    "quizlet-open": "export_words_quizlet",
    print: "export_words_print",
    "pairs-copy": "export_pairs_copy",
    "pairs-csv": "export_pairs_csv",
    "pairs-print": "export_pairs_print",
    "ret-copy": "export_ret_copy",
    "ret-print": "export_ret_print",
    "spt-copy": "export_spt_copy",
    "spt-csv": "export_spt_csv",
    "spt-print": "export_spt_print"
  };

  for (const [id, name] of Object.entries(actions)) {
    const el = document.getElementById(id);
    if (el) el.addEventListener("click", () => track(name));
  }

  const generate = document.getElementById("generate");
  if (generate && generate.disabled) {
    const started = performance.now();
    const observer = new MutationObserver(() => {
      if (generate.disabled) return;
      observer.disconnect();
      const seconds = (performance.now() - started) / 1000;
      const band = seconds <= 1 ? "0-1s" : seconds <= 3 ? "1-3s" : seconds <= 6 ? "3-6s" : "6s+";
      track("data_ready", { load_time: band });
    });
    observer.observe(generate, { attributes: true, attributeFilter: ["disabled"] });
  }
})();
