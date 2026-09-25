/* ==========================================================================
   奇思科创社 官网 — 交互脚本
   纯原生，无依赖。功能：导航、移动端菜单、滚动淡入、FAQ、数字计数、返回顶部
   ========================================================================== */

(function () {
  "use strict";

  var cfg = window.SITE_CONFIG || {};
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 导航：滚动阴影 + 当前页高亮 + 移动端菜单 ---------- */
  function initNav() {
    var nav = document.querySelector(".nav");
    var burger = document.querySelector(".nav__burger");
    var panel = document.querySelector(".nav__panel");
    if (!nav) return;

    var onScroll = function () {
      nav.classList.toggle("is-scrolled", window.scrollY > 12);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    // 当前页高亮
    var here = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll("[data-nav]").forEach(function (a) {
      if (a.getAttribute("data-nav") === here) a.classList.add("is-active");
    });

    if (burger && panel) {
      burger.addEventListener("click", function () {
        nav.classList.toggle("is-open");
        burger.setAttribute("aria-expanded", String(nav.classList.contains("is-open")));
      });
      panel.addEventListener("click", function (e) {
        if (e.target.closest("a")) {
          nav.classList.remove("is-open");
          burger.setAttribute("aria-expanded", "false");
        }
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
          nav.classList.remove("is-open");
          burger.setAttribute("aria-expanded", "false");
        }
      });
    }
  }

  /* ---------- 滚动淡入 ---------- */
  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var delay = Number(en.target.getAttribute("data-delay") || 0);
        setTimeout(function () { en.target.classList.add("is-in"); }, delay);
        io.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 数字滚动计数 ---------- */
  function initCounters() {
    var nums = document.querySelectorAll("[data-count]");
    if (!nums.length) return;

    var run = function (el) {
      var target = parseFloat(el.getAttribute("data-count"));
      var suffix = el.getAttribute("data-suffix") || "";
      var prefix = el.getAttribute("data-prefix") || "";
      var dur = 1400;
      var start = null;

      if (reduceMotion) {
        el.textContent = prefix + target + suffix;
        return;
      }
      var step = function (ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        var val = Math.round(target * eased);
        el.textContent = prefix + val + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    if (!("IntersectionObserver" in window)) {
      nums.forEach(run);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        run(en.target);
        io.unobserve(en.target);
      });
    }, { threshold: 0.5 });
    nums.forEach(function (el) { io.observe(el); });
  }

  /* ---------- FAQ 手风琴 ---------- */
  function initFaq() {
    document.querySelectorAll(".faq__item").forEach(function (item) {
      var btn = item.querySelector(".faq__q");
      var ans = item.querySelector(".faq__a");
      if (!btn || !ans) return;

      btn.addEventListener("click", function () {
        var open = item.classList.contains("is-open");

        // 同组互斥
        var group = item.closest(".faq");
        if (group) {
          group.querySelectorAll(".faq__item.is-open").forEach(function (other) {
            other.classList.remove("is-open");
            other.querySelector(".faq__q").setAttribute("aria-expanded", "false");
            other.querySelector(".faq__a").style.maxHeight = "0px";
          });
        }
        if (open) {
          ans.style.maxHeight = "0px";
          btn.setAttribute("aria-expanded", "false");
          item.classList.remove("is-open");
        } else {
          item.classList.add("is-open");
          btn.setAttribute("aria-expanded", "true");
          ans.style.maxHeight = ans.scrollHeight + "px";
        }
      });
    });
  }

  /* ---------- 返回顶部 ---------- */
  function initToTop() {
    var btn = document.querySelector(".to-top");
    if (!btn) return;
    var onScroll = function () {
      btn.classList.toggle("is-show", window.scrollY > 520);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  /* ---------- 按配置填充动态内容 ---------- */
  function applyConfig() {
    document.querySelectorAll("[data-cfg]").forEach(function (el) {
      var key = el.getAttribute("data-cfg");
      var val = cfg[key];
      if (val === undefined || val === null || val === "") return;
      if (el.tagName === "IMG") el.src = val;
      else el.textContent = val;
    });

    // 二维码：有图则替换占位框内容
    document.querySelectorAll("[data-qr]").forEach(function (frame) {
      var src = cfg[frame.getAttribute("data-qr")];
      if (!src) {
        frame.classList.add("qr-frame--empty");
        return;
      }
      var img = document.createElement("img");
      img.src = src;
      img.alt = frame.getAttribute("data-qr-alt") || "二维码";
      img.loading = "lazy";
      frame.classList.remove("qr-frame--empty");
      frame.innerHTML = "";
      frame.appendChild(img);
    });

    // QQ 群跳转链接
    document.querySelectorAll("[data-qq-jump]").forEach(function (a) {
      var key = cfg.qqGroupKey;
      if (key) {
        a.href = "https://qun.qq.com/join.html?_wv=1027&k=" + key;
        a.removeAttribute("data-qq-jump");
      } else {
        a.removeAttribute("href");
      }
    });

    // 统计脚本
    if (cfg.analyticsToken) {
      var s = document.createElement("script");
      s.defer = true;
      s.src = "https://static.cloudflareinsights.com/beacon.min.js";
      s.setAttribute("data-cf-beacon", JSON.stringify({ token: cfg.analyticsToken }));
      document.body.appendChild(s);
    }
  }

  /* ---------- 页脚年份 ---------- */
  function initYear() {
    document.querySelectorAll("[data-year]").forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  }

  /* ---------- 启动 ---------- */
  function boot() {
    initNav();
    initReveal();
    initCounters();
    initFaq();
    initToTop();
    applyConfig();
    initYear();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
