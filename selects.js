(() => {
  "use strict";

  const wrappers = [];

  for (const select of document.querySelectorAll("select")) {
    const wrapper = document.createElement("span");
    wrapper.className = "select";
    select.parentNode.insertBefore(wrapper, select);
    wrapper.append(select);
    wrappers.push(wrapper);
  }

  const closeAll = (except) => {
    for (const wrapper of wrappers) {
      if (wrapper !== except) wrapper.classList.remove("is-open");
    }
  };

  for (const wrapper of wrappers) {
    const select = wrapper.querySelector("select");

    select.addEventListener("mousedown", () => {
      if (select.disabled) return;
      const open = wrapper.classList.contains("is-open");
      closeAll();
      wrapper.classList.toggle("is-open", !open);
    });

    select.addEventListener("keydown", (event) => {
      if ([" ", "Enter", "ArrowDown", "ArrowUp"].includes(event.key)) {
        wrapper.classList.add("is-open");
      } else if (event.key === "Escape" || event.key === "Tab") {
        wrapper.classList.remove("is-open");
      }
    });

    select.addEventListener("change", () => wrapper.classList.remove("is-open"));
    select.addEventListener("blur", () => wrapper.classList.remove("is-open"));
  }

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".select")) closeAll();
  });

  window.addEventListener("blur", () => closeAll());
})();
