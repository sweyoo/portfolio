/* ==========================================================================
   Eliáš Novák — Web Developer Portfolio
   Shared behaviour: loading screen, intro reveal, nav, scroll reveal
   ========================================================================== */

(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* -------------------- Loading screen -------------------- */

  function initLoader() {
    var loader = document.getElementById("loading-screen");
    if (!loader) return;

    var percentEl = loader.querySelector(".loader-percent");
    var barFill = loader.querySelector(".loader-bar-fill");

    function finishLoader() {
      // The <head> safety-net script (see every page) sets this same timer;
      // clear it here so it never fires after we've already finished normally.
      if (window.__loaderFallbackTimer) {
        window.clearTimeout(window.__loaderFallbackTimer);
      }
      if (percentEl) percentEl.textContent = "100%";
      if (barFill) barFill.style.width = "100%";
      loader.classList.add("hidden");
      revealIntroText();
      document.body.classList.remove("is-loading");
      loader.addEventListener(
        "transitionend",
        function () {
          if (loader.parentNode) loader.parentNode.removeChild(loader);
        },
        { once: true }
      );
    }

    if (prefersReducedMotion) {
      finishLoader();
      return;
    }

    // Total counting time: 3.6s (within the requested 3.5-4s window).
    // Combined with the short hold + fade-out, the full sequence lands ~3.9-4s.
    var duration = 3600;
    var start = null;

    // Keyframes describe the natural, non-linear rhythm: a quick initial
    // climb, a steady mid-section slowdown, a brief near-stall just before
    // completion, then a snappy final jump to 100.
    var keyframes = [
      { t: 0.00, p: 0, ease: "out" },
      { t: 0.30, p: 58, ease: "inout" },
      { t: 0.58, p: 82, ease: "inout" },
      { t: 0.78, p: 93, ease: "inout" },
      { t: 0.93, p: 96, ease: "linear" },
      { t: 1.00, p: 100, ease: "out" }
    ];

    function applyEase(x, type) {
      if (type === "out") return 1 - Math.pow(1 - x, 3);
      if (type === "inout") return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
      return x; // linear
    }

    function percentAt(overallT) {
      for (var i = 0; i < keyframes.length - 1; i++) {
        var a = keyframes[i];
        var b = keyframes[i + 1];
        if (overallT <= b.t || i === keyframes.length - 2) {
          var span = b.t - a.t || 1;
          var localT = Math.min(Math.max((overallT - a.t) / span, 0), 1);
          return a.p + (b.p - a.p) * applyEase(localT, b.ease);
        }
      }
      return 100;
    }

    function tick(timestamp) {
      if (start === null) start = timestamp;
      var overallT = Math.min((timestamp - start) / duration, 1);
      var rawPercent = percentAt(overallT);

      // Both come from the same rawPercent every frame, so they're always
      // in sync — the number is just the rounded display form. The bar
      // keeps the fractional value so it moves continuously at 60fps
      // instead of snapping between whole percents.
      if (percentEl) percentEl.textContent = Math.round(rawPercent) + "%";
      if (barFill) barFill.style.width = rawPercent + "%";

      if (overallT < 1) {
        requestAnimationFrame(tick);
      } else {
        setTimeout(finishLoader, 80);
      }
    }

    requestAnimationFrame(tick);
  }

  /* -------------------- Intro text reveal --------------------
     Staggers in the current page's own headline/subtitle (and any
     accent-colored word inside it) once the loader clears. Order and
     spacing between elements come from the --intro-delay custom property
     set inline on each .intro-el in the markup. */

  function revealIntroText() {
    document.querySelectorAll(".intro-el").forEach(function (el) {
      el.classList.add("is-in");
    });
  }

  /* -------------------- Mobile nav toggle -------------------- */

  function initNav() {
    var toggle = document.querySelector(".nav-toggle");
    var links = document.querySelector(".nav-links");
    if (!toggle || !links) return;

    toggle.addEventListener("click", function () {
      var isOpen = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    links.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* -------------------- Active nav link --------------------
     Links are root-absolute folder paths (e.g. "/o-mne/"), so comparison
     strips a trailing "index.html" and any trailing slash from both sides
     before matching — that keeps it correct whether the server resolves
     "/o-mne/" or "/o-mne/index.html" as the current location. */

  function normalizePath(path) {
    return path.replace(/index\.html$/, "").replace(/\/+$/, "") || "/";
  }

  function initActiveLink() {
    var current = normalizePath(window.location.pathname);
    document.querySelectorAll(".nav-links a").forEach(function (link) {
      if (normalizePath(link.getAttribute("href")) === current) {
        link.setAttribute("aria-current", "page");
      }
    });
  }

  /* -------------------- Scroll-triggered reveal --------------------
     Shared by the below-the-fold fade-up sections and the skill bars:
     apply the end state immediately for reduced-motion / no-IO support,
     otherwise animate once each element enters the viewport. */

  function revealOnIntersect(elements, applyEndState, options) {
    if (!elements.length) return;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      elements.forEach(applyEndState);
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          applyEndState(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, options);

    elements.forEach(function (el) {
      observer.observe(el);
    });
  }

  function initReveal() {
    revealOnIntersect(
      document.querySelectorAll(".reveal"),
      function (el) { el.classList.add("is-visible"); },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
  }

  function initSkillBars() {
    revealOnIntersect(
      document.querySelectorAll(".skill-bar-fill[data-value]"),
      function (el) { el.style.width = el.getAttribute("data-value") + "%"; },
      { threshold: 0.3 }
    );
  }

  /* -------------------- Staggered children index -------------------- */

  function initStagger() {
    document.querySelectorAll(".reveal-stagger").forEach(function (group) {
      Array.prototype.forEach.call(group.children, function (child, i) {
        child.style.setProperty("--i", i);
      });
    });
  }

  /* -------------------- Footer year -------------------- */

  function initYear() {
    var el = document.getElementById("year");
    if (el) el.textContent = new Date().getFullYear();
  }

  /* -------------------- Contact form (static placeholder) --------------------
     No backend wired up yet — this just gives visible confirmation feedback
     so the form doesn't feel like a dead end while a real endpoint is pending. */

  function initContactForm() {
    var form = document.getElementById("contact-form");
    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var button = form.querySelector("button[type=submit]");
      if (!button) return;
      var original = button.textContent;
      button.textContent = "Odesláno ✓";
      button.disabled = true;
      setTimeout(function () {
        button.textContent = original;
        button.disabled = false;
        form.reset();
      }, 2600);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initLoader();
    initNav();
    initActiveLink();
    initStagger();
    initReveal();
    initSkillBars();
    initYear();
    initContactForm();
  });
})();
