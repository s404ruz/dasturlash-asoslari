/* ==========================================================================
   11-mavzu: Ma'lumotlar bazasi va relyatsion model asoslari
   Interactive Offline Presentation Engine
   ========================================================================== */

(() => {
  const slides = Array.from(document.querySelectorAll(".slide"));
  const stage = document.getElementById("deckStage");
  const viewport = document.getElementById("stageViewport");
  const progressFill = document.getElementById("progressFill");
  const counterEl = document.getElementById("slideCounter");
  const chapterNameEl = document.getElementById("currentChapterName");

  const notesDockContent = document.getElementById("notesDockContent");
  const notesBtn = document.getElementById("btnNotes");
  const themeBtn = document.getElementById("btnTheme");
  const menuBtn = document.getElementById("btnMenu");
  const overviewBtn = document.getElementById("btnOverview");
  const fullscreenBtn = document.getElementById("btnFullscreen");
  const printBtn = document.getElementById("btnPrint");
  const prevBtn = document.getElementById("btnPrev");
  const nextBtn = document.getElementById("btnNext");

  const drawer = document.getElementById("chapterDrawer");
  const drawerBackdrop = document.getElementById("drawerBackdrop");
  const drawerList = document.getElementById("drawerList");
  const drawerCloseBtn = document.getElementById("btnDrawerClose");

  const overviewModal = document.getElementById("overviewModal");
  const overviewGrid = document.getElementById("overviewGrid");
  const overviewCloseBtn = document.getElementById("btnOverviewClose");

  let currentIndex = 0;

  function renderLucideIcons() {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  /* ------------------------------------------------------------------------
     1. Responsive 16:9 Stage Scaling
     ------------------------------------------------------------------------ */
  function scaleStage() {
    if (!stage || !viewport) return;
    const rect = viewport.getBoundingClientRect();
    const availW = Math.max(320, rect.width - 28);
    const availH = Math.max(200, rect.height - 20);
    const scale = Math.min(availW / 1280, availH / 720, 1.45);
    stage.style.transform = `scale(${scale})`;
  }

  window.addEventListener("resize", scaleStage);

  /* ------------------------------------------------------------------------
     2. Built-in Offline Syntax Highlighter (Python & SQL)
     ------------------------------------------------------------------------ */
  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function highlightCode(raw, lang) {
    const escaped = escapeHtml(raw);
    const tokens = [];
    const stash = (cls, match) => {
      const id = tokens.length;
      tokens.push(`<span class="${cls}">${match}</span>`);
      return `\u0000${id}\u0000`;
    };

    let code = escaped;

    if (lang === "python") {
      code = code.replace(/(#[^\n]*)/g, (m) => stash("tok-com", m));
      code = code.replace(/("""[\s\S]*?"""|'''[\s\S]*?'''|f?"(?:\\.|[^"\\])*"|f?'(?:\\.|[^'\\])*')/g, (m) =>
        stash("tok-str", m)
      );
      code = code.replace(
        /\b(import|from|as|def|return|if|elif|else|for|in|while|try|except|with|and|or|not|True|False|None|pass|break|continue)\b/g,
        '<span class="tok-kw">$1</span>'
      );
      code = code.replace(
        /\b(print|len|range|set|dict|list|tuple|sorted|type|sum|int|str|float)\b/g,
        '<span class="tok-fn">$1</span>'
      );
      code = code.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-num">$1</span>');
    } else if (lang === "sql") {
      code = code.replace(/(--[^\n]*)/g, (m) => stash("tok-com", m));
      code = code.replace(/('(?:''|[^'])*')/g, (m) => stash("tok-str", m));
      code = code.replace(
        /\b(CREATE|TABLE|IF|NOT|EXISTS|PRIMARY|KEY|FOREIGN|REFERENCES|UNIQUE|CHECK|DEFAULT|NULL|ON|DELETE|RESTRICT|CASCADE|SET|INSERT|INTO|VALUES|SELECT|FROM|WHERE|JOIN|LEFT|GROUP|BY|ORDER|ALTER|ADD|COLUMN|RENAME|TO|DROP|PRAGMA|BEGIN|COMMIT|ROLLBACK|UPDATE|EXPLAIN|QUERY|PLAN|STRICT|AND|OR|IN|IS|AS|COUNT|INDEX)\b/gi,
        '<span class="tok-kw">$1</span>'
      );
      code = code.replace(
        /\b(INTEGER|TEXT|REAL|BLOB|NUMERIC)\b/gi,
        '<span class="tok-type">$1</span>'
      );
      code = code.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-num">$1</span>');
    }

    return code.replace(/\u0000(\d+)\u0000/g, (_, idx) => tokens[Number(idx)]);
  }

  function initCodeBlocks() {
    document.querySelectorAll(".code-card").forEach((card) => {
      const codeEl = card.querySelector("pre code");
      if (!codeEl) return;

      const rawText = codeEl.textContent.replace(/^\n+|\n+$/g, "");
      const lang = codeEl.classList.contains("language-python")
        ? "python"
        : codeEl.classList.contains("language-sql")
        ? "sql"
        : "plain";

      codeEl.dataset.raw = rawText;
      if (lang !== "plain") {
        codeEl.innerHTML = highlightCode(rawText, lang);
      } else {
        codeEl.textContent = rawText;
      }

      const copyBtn = card.querySelector(".copy-btn");
      if (copyBtn) {
        const setCopyState = (copied) => {
          copyBtn.innerHTML = copied
            ? '<i data-lucide="check"></i><span>Nusxalandi</span>'
            : '<i data-lucide="copy"></i><span>Nusxalash</span>';
          copyBtn.classList.toggle("copied", copied);
          renderLucideIcons();
        };
        setCopyState(false);

        copyBtn.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(rawText);
            setCopyState(true);
            setTimeout(() => setCopyState(false), 1500);
          } catch {
            const ta = document.createElement("textarea");
            ta.value = rawText;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            ta.remove();
            setCopyState(true);
            setTimeout(() => setCopyState(false), 1500);
          }
        });
      }
    });
  }

  /* ------------------------------------------------------------------------
     3. Navigation, Fragments & Speaker Notes
     ------------------------------------------------------------------------ */
  function getFragments(slide) {
    return Array.from(slide.querySelectorAll(".fragment"));
  }

  function updateSlideNumberBadges() {
    slides.forEach((slide, idx) => {
      const badge = slide.querySelector(".slide-num-badge");
      if (badge) {
        badge.textContent = `${idx + 1} / ${slides.length}`;
      }
    });
  }

  function goToSlide(index, revealAllFragments = false) {
    if (index < 0 || index >= slides.length) return;

    slides.forEach((s) => s.classList.remove("active"));
    currentIndex = index;
    const activeSlide = slides[currentIndex];
    activeSlide.classList.add("active");

    const fragments = getFragments(activeSlide);
    fragments.forEach((f) => {
      if (revealAllFragments) f.classList.add("visible");
      else f.classList.remove("visible");
    });

    counterEl.textContent = `${currentIndex + 1} / ${slides.length}`;
    chapterNameEl.textContent = activeSlide.dataset.chapter || "11-mavzu";

    const pct = ((currentIndex + 1) / slides.length) * 100;
    progressFill.style.width = `${pct}%`;

    const noteSrc = activeSlide.querySelector(".speaker-notes-source");
    notesDockContent.innerHTML = noteSrc
      ? noteSrc.innerHTML
      : "<p>Ushbu slayd uchun qo‘shimcha o‘qituvchi izohi kiritilmagan.</p>";

    history.replaceState(null, "", `#slide-${currentIndex + 1}`);
    syncMenuHighlight();
  }

  function stepNext() {
    const activeSlide = slides[currentIndex];
    const hiddenFragment = getFragments(activeSlide).find(
      (f) => !f.classList.contains("visible")
    );
    if (hiddenFragment) {
      hiddenFragment.classList.add("visible");
      return;
    }
    if (currentIndex < slides.length - 1) {
      goToSlide(currentIndex + 1, false);
    }
  }

  function stepPrev() {
    const activeSlide = slides[currentIndex];
    const visibleFragments = getFragments(activeSlide).filter((f) =>
      f.classList.contains("visible")
    );
    if (visibleFragments.length > 0) {
      visibleFragments[visibleFragments.length - 1].classList.remove("visible");
      return;
    }
    if (currentIndex > 0) {
      goToSlide(currentIndex - 1, true);
    }
  }

  /* ------------------------------------------------------------------------
     4. Chapter Drawer & Overview Grid
     ------------------------------------------------------------------------ */
  function buildNavigationUI() {
    drawerList.innerHTML = "";
    overviewGrid.innerHTML = "";

    let lastChapter = "";
    slides.forEach((slide, idx) => {
      const chap = slide.dataset.chapter || "Kirish";
      const title =
        slide.dataset.title ||
        slide.querySelector(".slide-title, .cover-title")?.textContent.trim() ||
        `Slayd ${idx + 1}`;

      if (chap !== lastChapter) {
        const chapEl = document.createElement("div");
        chapEl.className = "drawer-chapter-title";
        chapEl.textContent = chap;
        drawerList.appendChild(chapEl);
        lastChapter = chap;
      }

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "drawer-slide-btn";
      btn.dataset.index = String(idx);
      btn.innerHTML = `<span class="drawer-slide-num">${idx + 1}.</span><span>${title}</span>`;
      btn.addEventListener("click", () => {
        goToSlide(idx);
        closeDrawer();
      });
      drawerList.appendChild(btn);

      const ovCard = document.createElement("div");
      ovCard.className = "ov-card";
      ovCard.dataset.index = String(idx);
      ovCard.innerHTML = `
        <div class="ov-meta"><span>${chap}</span><span>#${idx + 1}</span></div>
        <div class="ov-title">${title}</div>
      `;
      ovCard.addEventListener("click", () => {
        goToSlide(idx);
        closeOverview();
      });
      overviewGrid.appendChild(ovCard);
    });
  }

  function syncMenuHighlight() {
    drawerList.querySelectorAll(".drawer-slide-btn").forEach((b) => {
      b.classList.toggle("current", Number(b.dataset.index) === currentIndex);
    });
    overviewGrid.querySelectorAll(".ov-card").forEach((c) => {
      c.classList.toggle("current", Number(c.dataset.index) === currentIndex);
    });
  }

  function openDrawer() {
    drawer.classList.add("open");
    drawerBackdrop.classList.add("open");
    menuBtn.classList.add("active");
  }

  function closeDrawer() {
    drawer.classList.remove("open");
    drawerBackdrop.classList.remove("open");
    menuBtn.classList.remove("active");
  }

  function toggleDrawer() {
    if (drawer.classList.contains("open")) closeDrawer();
    else openDrawer();
  }

  function openOverview() {
    overviewModal.classList.add("open");
    overviewBtn.classList.add("active");
  }

  function closeOverview() {
    overviewModal.classList.remove("open");
    overviewBtn.classList.remove("active");
  }

  function toggleOverview() {
    if (overviewModal.classList.contains("open")) closeOverview();
    else openOverview();
  }

  function toggleNotes() {
    const isOpen = document.body.classList.toggle("notes-open");
    notesBtn.classList.toggle("active", isOpen);
    setTimeout(scaleStage, 260);
  }

  function setThemeButton(theme) {
    themeBtn.innerHTML =
      theme === "dark"
        ? '<i data-lucide="sun"></i><span>Yorug‘</span>'
        : '<i data-lucide="moon"></i><span>Tungi</span>';
    renderLucideIcons();
  }

  function toggleTheme() {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const next = isDark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    setThemeButton(next);
    try {
      localStorage.setItem("db11_theme", next);
    } catch {}
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  /* ------------------------------------------------------------------------
     5. Interactive Widgets: Roadmap Jumps, Normalization, SQLi Sim, Quizzes, QA
     ------------------------------------------------------------------------ */
  function initJumpLinks() {
    document.querySelectorAll("[data-goto]").forEach((el) => {
      el.addEventListener("click", () => {
        const target = Number(el.dataset.goto) - 1;
        if (!Number.isNaN(target)) goToSlide(target);
      });
    });
  }

  function initNormalizationLab() {
    const lab = document.getElementById("normLab");
    if (!lab) return;
    const buttons = lab.querySelectorAll(".tab-btn");
    const panels = lab.querySelectorAll(".norm-panel");

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const step = btn.dataset.step;
        buttons.forEach((b) => b.classList.toggle("active", b === btn));
        panels.forEach((p) =>
          p.classList.toggle("active", p.dataset.step === step)
        );
      });
    });
  }

  function initSqlInjectionLab() {
    const lab = document.getElementById("sqliLab");
    if (!lab) return;

    let selectedInput = "attack";
    let selectedMode = "unsafe";

    const sqlPreview = document.getElementById("sqliSqlPreview");
    const resultPreview = document.getElementById("sqliResultPreview");
    const verdictBox = document.getElementById("sqliVerdict");

    const rows = [
      ["Karimov", "AA1111111"],
      ["Azizova", "AB2222222"],
      ["Olimov", "AC3333333"],
    ];

    function render() {
      const val = selectedInput === "normal" ? "Karimov" : "x' OR '1'='1";

      if (selectedMode === "unsafe") {
        const sql = `SELECT * FROM mijozlar WHERE familiya = '${val}'`;
        sqlPreview.innerHTML = highlightCode(sql, "sql");

        if (selectedInput === "normal") {
          resultPreview.innerHTML = `[('Karimov', 'AA1111111')]`;
          verdictBox.className = "callout warn";
          verdictBox.innerHTML =
            "<strong>Ogohlantirish:</strong> Oddiy qiymatda to‘g‘ri ishlagandek ko‘rinadi, lekin f-satr SQL-in’ektsiyaga to‘liq ochiq!";
        } else {
          resultPreview.innerHTML = rows
            .map((r) => `('${r[0]}', '${r[1]}')`)
            .join(",\n");
          verdictBox.className = "callout danger";
          verdictBox.innerHTML =
            "<strong>XAVF! Ma’lumotlar sizib chiqdi:</strong> <code>OR '1'='1'</code> sharti har doim rost bo‘lgani uchun <b>barcha mijozlarning pasport ma’lumotlari</b> qaytib keldi!";
        }
      } else {
        const sql = `SELECT * FROM mijozlar WHERE familiya = ?\n-- Parametr: (${JSON.stringify(val)},)`;
        sqlPreview.innerHTML = highlightCode(sql, "sql");

        if (selectedInput === "normal") {
          resultPreview.innerHTML = `[('Karimov', 'AA1111111')]`;
          verdictBox.className = "callout success";
          verdictBox.innerHTML =
            "<strong>Xavfsiz:</strong> So‘rov tuzilmasi va qiymat alohida uzatildi. Faqat Karimov qaytadi.";
        } else {
          resultPreview.innerHTML = `[]  # Bo‘sh natija`;
          verdictBox.className = "callout success";
          verdictBox.innerHTML =
            '<span class="inline-ico-label"><i data-lucide="shield-check" class="ico-emerald"></i><strong>Hujum to‘sildi:</strong></span> <code>x\' OR \'1\'=\'1</code> buyruq sifatida emas, oddiy matn qiymati sifatida qidirildi. Bunday familiyali mijoz yo‘q.';
          renderLucideIcons();
        }
      }
    }

    lab.querySelectorAll("[data-sqli-input]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedInput = btn.dataset.sqliInput;
        lab
          .querySelectorAll("[data-sqli-input]")
          .forEach((b) => b.classList.toggle("active", b === btn));
        render();
      });
    });

    lab.querySelectorAll("[data-sqli-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedMode = btn.dataset.sqliMode;
        lab
          .querySelectorAll("[data-sqli-mode]")
          .forEach((b) => b.classList.toggle("active", b === btn));
        render();
      });
    });

    render();
  }

  function initQuizzes() {
    document.querySelectorAll(".quiz-card").forEach((card) => {
      const options = Array.from(card.querySelectorAll(".quiz-opt"));
      const feedback = card.querySelector(".quiz-feedback");
      const resetBtn = card.querySelector(".quiz-reset-btn");

      options.forEach((opt) => {
        opt.addEventListener("click", () => {
          const isCorrect = opt.dataset.correct === "true";
          options.forEach((o) => {
            o.disabled = true;
            if (o.dataset.correct === "true") o.classList.add("is-correct");
          });
          if (!isCorrect) opt.classList.add("is-wrong");

          if (feedback) {
            feedback.classList.add("show", isCorrect ? "ok" : "err");
            feedback.innerHTML =
              (isCorrect
                ? '<span class="inline-ico-label"><i data-lucide="check-circle-2" class="ico-emerald"></i><strong>To‘g‘ri!</strong></span> '
                : '<span class="inline-ico-label"><i data-lucide="x-circle" class="ico-rose"></i><strong>Noto‘g‘ri.</strong></span> ') +
              (card.dataset.explain || "");
            renderLucideIcons();
          }
        });
      });

      if (resetBtn) {
        resetBtn.addEventListener("click", () => {
          options.forEach((o) => {
            o.disabled = false;
            o.classList.remove("is-correct", "is-wrong");
          });
          if (feedback) {
            feedback.className = "quiz-feedback";
            feedback.innerHTML = "";
          }
        });
      }
    });
  }

  function initRevealableQA() {
    document.querySelectorAll(".qa-item").forEach((item) => {
      item.addEventListener("click", () => {
        item.classList.toggle("open");
      });
    });
  }

  /* ------------------------------------------------------------------------
     6. Keyboard & Event Bindings
     ------------------------------------------------------------------------ */
  document.addEventListener("keydown", (e) => {
    if (e.target.matches("input, textarea, select")) return;

    if (e.key === "Escape") {
      closeDrawer();
      closeOverview();
      return;
    }

    if (overviewModal.classList.contains("open") || drawer.classList.contains("open")) {
      return;
    }

    switch (e.key) {
      case "ArrowRight":
      case "PageDown":
      case " ":
        if (e.target.tagName !== "BUTTON") {
          e.preventDefault();
          stepNext();
        }
        break;
      case "ArrowLeft":
      case "PageUp":
        e.preventDefault();
        stepPrev();
        break;
      case "Home":
        e.preventDefault();
        goToSlide(0);
        break;
      case "End":
        e.preventDefault();
        goToSlide(slides.length - 1);
        break;
      case "n":
      case "N":
        toggleNotes();
        break;
      case "m":
      case "M":
        toggleDrawer();
        break;
      case "o":
      case "O":
        toggleOverview();
        break;
      case "d":
      case "D":
        toggleTheme();
        break;
      case "f":
      case "F":
        toggleFullscreen();
        break;
    }
  });

  prevBtn.addEventListener("click", stepPrev);
  nextBtn.addEventListener("click", stepNext);
  notesBtn.addEventListener("click", toggleNotes);
  themeBtn.addEventListener("click", toggleTheme);
  menuBtn.addEventListener("click", toggleDrawer);
  drawerCloseBtn.addEventListener("click", closeDrawer);
  drawerBackdrop.addEventListener("click", closeDrawer);
  overviewBtn.addEventListener("click", toggleOverview);
  overviewCloseBtn.addEventListener("click", closeOverview);
  fullscreenBtn.addEventListener("click", toggleFullscreen);
  printBtn.addEventListener("click", () => window.print());

  /* Restore Theme */
  try {
    const savedTheme = localStorage.getItem("db11_theme");
    if (savedTheme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      setThemeButton("dark");
    }
  } catch {}

  /* Boot */
  initCodeBlocks();
  updateSlideNumberBadges();
  buildNavigationUI();
  initJumpLinks();
  initNormalizationLab();
  initSqlInjectionLab();
  initQuizzes();
  initRevealableQA();
  renderLucideIcons();

  const hashMatch = location.hash.match(/^#slide-(\d+)$/);
  const initialIndex = hashMatch
    ? Math.min(Math.max(Number(hashMatch[1]) - 1, 0), slides.length - 1)
    : 0;

  goToSlide(initialIndex);
  scaleStage();
})();
