/* ============================================================
   RENOVA — Shared script.js
   Handles: mobile menu, cost estimator, login validation,
   chat UI, gallery filter, material compare, toast.

   FULL-STACK MODE: when the Renova Node backend (server.js) is
   running, this script talks to its REST API (/api/*). If the
   API is unreachable (e.g. the HTML files are opened directly),
   every feature falls back to client-side demo mode.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- API helper (backend detection + calls) ---------- */
  var API = { available: null }; // null = not checked yet

  function getApiBase() {
    return window.RENOVA_API_URL || localStorage.getItem("renova_api_url") || "";
  }

  function apiCheck() {
    if (API.available !== null) return Promise.resolve(API.available);
    var base = getApiBase();
    return fetch(base + "/api/health", { method: "GET" })
      .then(function (r) {
        API.available = r.ok;
        return API.available;
      })
      .catch(function () {
        API.available = false;
        return false;
      });
  }

  function apiJSON(path, opts) {
    opts = opts || {};
    opts.headers = { "Content-Type": "application/json" };
    var base = getApiBase();
    return fetch(base + path, opts).then(function (r) {
      return r.json().then(function (data) {
        return { ok: r.ok, status: r.status, data: data };
      });
    });
  }

  /* ---------- Mobile nav toggle ---------- */
  function setupNav() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.querySelector(".main-nav");
    if (!toggle || !nav) return;
    toggle.addEventListener("click", function () {
      nav.classList.toggle("open");
      var open = nav.classList.contains("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.innerHTML = open
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M6 18L18 6"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
    });
    // Close on link click (mobile)
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        if (window.innerWidth <= 768) {
          nav.classList.remove("open");
          toggle.setAttribute("aria-expanded", "false");
          toggle.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
        }
      });
    });
  }

  /* ---------- Delegated data-toast clicks (works for dynamic content too) ---------- */
  document.addEventListener("click", function (e) {
    var el = e.target.closest ? e.target.closest("[data-toast]") : null;
    if (el) {
      e.preventDefault();
      showToast(el.getAttribute("data-toast"));
    }
  });

  /* ---------- Toast helper ---------- */
  function showToast(msg) {
    var existing = document.querySelector(".toast");
    if (existing) existing.remove();
    var t = document.createElement("div");
    t.className = "toast";
    t.innerHTML =
      '<span class="ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 13l4 4L19 7"/></svg></span><span>' +
      msg +
      "</span>";
    document.body.appendChild(t);
    requestAnimationFrame(function () {
      t.classList.add("show");
    });
    setTimeout(function () {
      t.classList.remove("show");
      setTimeout(function () {
        t.remove();
      }, 300);
    }, 2600);
  }
  window.renovaToast = showToast;

  /* ---------- Footer meta: API status pill + ZIP download link ---------- */
  function setupFooterMeta() {
    var bar = document.querySelector(".footer-bottom");
    if (!bar || bar.querySelector("#api-status")) return;
    var wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;align-items:center;gap:14px;flex-wrap:wrap";
    var pill = document.createElement("span");
    pill.id = "api-status";
    pill.style.cssText = "display:inline-flex;align-items:center;gap:6px;font-size:0.78rem;font-weight:600;padding:4px 12px;border-radius:999px;border:1px solid var(--grey-700);color:var(--grey-400)";
    pill.innerHTML = "Backend: checking\u2026";
    wrap.appendChild(pill);

    apiCheck().then(function (up) {
      if (up) {
        pill.style.borderColor = "#10B981";
        pill.style.color = "#34D399";
        pill.innerHTML = "\u25CF Backend connected \u2014 SQLite database active";
      } else {
        pill.innerHTML = "\u25CB Static mode (GitHub Pages) \u2014 Run 'python server.py' for SQLite database";
      }
    });

    // Download link only if the ZIP is actually present next to the site
    fetch("renova-fullstack.zip", { method: "HEAD" })
      .then(function (r) {
        if (!r.ok) return;
        var a = document.createElement("a");
        a.href = "renova-fullstack.zip";
        a.setAttribute("download", "renova-fullstack.zip");
        a.style.cssText = "display:inline-flex;align-items:center;gap:6px;font-size:0.8rem;font-weight:600;color:var(--orange-primary)";
        a.innerHTML = '\u2B07 Download full project (ZIP)';
        wrap.appendChild(a);
      })
      .catch(function () {});

    bar.appendChild(wrap);
  }

  /* ---------- Cost Estimator ---------- */
  function setupEstimator() {
    var form = document.getElementById("estimator-form");
    if (!form) return;

    var baseRates = {
      kitchen: 1200,
      bathroom: 1500,
      bedroom: 800,
      "living-room": 900,
      "full-home": 1000,
    };
    var qualityMult = { standard: 1, premium: 1.35, luxury: 1.8 };
    var workAddons = {
      flooring: 250,
      painting: 120,
      plumbing: 180,
      electrical: 200,
      carpentry: 220,
    };

    function rupee(n) {
      return "\u20B9" + Math.round(n).toLocaleString("en-IN");
    }

    function calc() {
      var room = form.querySelector("#room-type").value;
      var area = parseFloat(form.querySelector("#area").value) || 0;
      var qualityEl = form.querySelector('input[name="quality"]:checked');
      var quality = qualityEl ? qualityEl.value : "standard";
      var checked = form.querySelectorAll('input[name="work"]:checked');
      var areaMin = area;
      var areaMax = area * 1.18;

      var base = (baseRates[room] || 1000) * area;
      var mult = qualityMult[quality] || 1;
      var baseCost = base * mult;

      var breakdown = {};
      var totalAddonsMin = 0;
      var totalAddonsMax = 0;
      checked.forEach(function (c) {
        var add = workAddons[c.value] || 0;
        breakdown[c.value] = add * area;
        totalAddonsMin += add * area;
        totalAddonsMax += add * areaMax;
      });

      // distribute base cost across categories if none chosen
      if (Object.keys(breakdown).length === 0) {
        ["flooring", "painting", "plumbing", "electrical", "carpentry"].forEach(function (k) {
          breakdown[k] = (baseCost / 5);
        });
      } else {
        breakdown.base = baseCost;
      }

      var totalMin = baseCost + totalAddonsMin;
      var totalMax = baseCost + totalAddonsMax;

      var rangeEl = document.getElementById("range-num");
      if (rangeEl) {
        rangeEl.innerHTML = rupee(totalMin) + ' <span class="small">– ' + rupee(totalMax) + "</span>";
      }
      var liveArea = document.getElementById("live-area");
      if (liveArea) liveArea.textContent = area ? area + " sq.ft" : "—";

      // Build bar chart
      var chartEl = document.getElementById("breakdown-chart");
      if (chartEl) {
        var entries = Object.keys(breakdown).map(function (k) {
          return { key: k, val: breakdown[k] };
        });
        var maxVal = Math.max.apply(null, entries.map(function (e) { return e.val; })) || 1;
        var labels = {
          flooring: "Flooring", painting: "Painting", plumbing: "Plumbing",
          electrical: "Electrical", carpentry: "Carpentry", base: "Base build"
        };
        chartEl.innerHTML = entries.map(function (e) {
          var pct = Math.round((e.val / maxVal) * 100);
          return '<div class="bar-row">' +
            '<div class="bar-head"><span>' + (labels[e.key] || e.key) + '</span><span class="val">' + rupee(e.val) + '</span></div>' +
            '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%"></div></div>' +
            '</div>';
        }).join("");
      }
    }

    form.addEventListener("input", calc);
    form.addEventListener("change", calc);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      calc();
      showToast("Estimate updated!");
    });
    calc();

    /* --- "Save estimate" button: persists to the backend when available --- */
    var resultCard = document.querySelector(".result-card");
    if (resultCard && !document.getElementById("save-estimate")) {
      var saveBtn = document.createElement("button");
      saveBtn.id = "save-estimate";
      saveBtn.type = "button";
      saveBtn.className = "btn btn-primary btn-block";
      saveBtn.style.marginTop = "22px";
      saveBtn.textContent = "Save this estimate";
      resultCard.appendChild(saveBtn);
      saveBtn.addEventListener("click", function () {
        var qualityEl = form.querySelector('input[name="quality"]:checked');
        var works = [];
        form.querySelectorAll('input[name="work"]:checked').forEach(function (c) { works.push(c.value); });
        var payload = {
          room: form.querySelector("#room-type").value,
          area: parseFloat(form.querySelector("#area").value) || 0,
          quality: qualityEl ? qualityEl.value : "standard",
          works: works,
        };
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving\u2026";
        apiCheck()
          .then(function (up) {
            if (!up) throw new Error("offline");
            return apiJSON("/api/estimate", { method: "POST", body: JSON.stringify(payload) });
          })
          .then(function (res) {
            if (!res.ok) throw new Error(res.data.error || "Server error");
            showToast("Saved on server as estimate #" + res.data.estimateId + " (" + res.data.estimate.rangeText + ")");
          })
          .catch(function (err) {
            if (err.message === "offline") {
              showToast("Saved locally (static mode) \u2014 run server.js for server-side saving");
            } else {
              showToast("Could not save: " + err.message);
            }
          })
          .then(function () {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save this estimate";
          });
      });
    }
  }

  /* ---------- Login (client validation + server auth when available) ---------- */
  function setupLogin() {
    var form = document.getElementById("login-form");
    if (!form) return;

    // Demo-credentials hint (helpful during demos/viva)
    if (!form.querySelector(".demo-hint")) {
      var hint = document.createElement("p");
      hint.className = "demo-hint";
      hint.style.cssText = "font-size:0.8rem;color:var(--grey-500);background:var(--orange-light);border-radius:8px;padding:8px 12px;margin-bottom:18px";
      hint.innerHTML = "Demo login: <strong>demo@renova.in</strong> / <strong>demo123</strong> (works when the backend runs)";
      form.insertBefore(hint, form.firstChild);
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = form.querySelector("#email");
      var pass = form.querySelector("#password");
      var emailErr = form.querySelector("#email-err");
      var passErr = form.querySelector("#pass-err");
      var ok = true;
      var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!re.test(email.value.trim())) {
        emailErr.classList.add("show");
        ok = false;
      } else {
        emailErr.classList.remove("show");
      }
      if (!pass.value) {
        passErr.classList.add("show");
        ok = false;
      } else {
        passErr.classList.remove("show");
      }
      if (!ok) return;

      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      var label = btn.textContent;
      btn.textContent = "Signing in\u2026";

      apiCheck()
        .then(function (up) {
          if (!up) throw new Error("offline");
          return apiJSON("/api/login", {
            method: "POST",
            body: JSON.stringify({ email: email.value.trim(), password: pass.value }),
          });
        })
        .then(function (res) {
          if (!res.ok) {
            showToast(res.data.error || "Invalid email or password");
            return;
          }
          showToast(res.data.message || "Welcome back!");
          try {
            sessionStorage.setItem("renova_user", JSON.stringify(res.data.user || {}));
          } catch (e) {}
          setTimeout(function () { form.reset(); }, 1200);
        })
        .catch(function (err) {
          if (err.message === "offline") {
            showToast("Welcome back! (demo mode \u2014 no backend detected)");
            setTimeout(function () { form.reset(); }, 1200);
          } else {
            showToast("Sign-in failed: " + err.message);
          }
        })
        .then(function () {
          btn.disabled = false;
          btn.textContent = label;
        });
    });
  }

  /* ---------- Inspiration gallery filter ---------- */
  function setupGallery() {
    var tabs = document.querySelectorAll(".filter-tabs button");
    var items = document.querySelectorAll(".gallery-item");
    if (!tabs.length) return;
    tabs.forEach(function (btn) {
      btn.addEventListener("click", function () {
        tabs.forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        var cat = btn.getAttribute("data-cat");
        items.forEach(function (it) {
          if (cat === "all" || it.getAttribute("data-cat") === cat) {
            it.classList.remove("hidden");
          } else {
            it.classList.add("hidden");
          }
        });
      });
    });
    // Save heart
    document.querySelectorAll(".gallery-item .save").forEach(function (s) {
      s.addEventListener("click", function (e) {
        e.stopPropagation();
        var path = s.querySelector("svg path");
        if (s.classList.toggle("saved")) {
          if (path) path.setAttribute("fill", "#F97316");
          showToast("Saved to your mood board!");
        } else {
          if (path) path.setAttribute("fill", "none");
        }
      });
    });
  }

  /* ---------- Material compare ---------- */
  function setupCompare() {
    var checks = document.querySelectorAll(".material-card input.compare-cb");
    var tableWrap = document.getElementById("compare-wrap");
    if (!checks.length || !tableWrap) return;

    function render() {
      var chosen = [];
      checks.forEach(function (c) {
        if (c.checked) chosen.push(JSON.parse(c.getAttribute("data-item")));
      });
      if (chosen.length === 0) {
        tableWrap.style.display = "none";
        return;
      }
      tableWrap.style.display = "block";
      var rows = ["name", "category", "price", "rating"];
      var labels = { name: "Material", category: "Category", price: "Price", rating: "Rating" };
      var html = '<table class="compare-table"><thead><tr><th>Spec</th>';
      chosen.forEach(function (m) { html += "<th>" + m.name + "</th>"; });
      html += "</tr></thead><tbody>";
      rows.forEach(function (r) {
        html += "<tr><td><strong>" + labels[r] + "</strong></td>";
        chosen.forEach(function (m) {
          var v = m[r];
          if (r === "price") v = "\u20B9" + v;
          html += "<td>" + v + "</td>";
        });
        html += "</tr>";
      });
      html += "</tbody></table>";
      tableWrap.querySelector(".compare-table-inner").innerHTML = html;
    }
    checks.forEach(function (c) { c.addEventListener("change", render); });
    render();
  }

  /* ---------- Smart Advisor chat ---------- */
  function setupAdvisor() {
    var form = document.getElementById("chat-form");
    var input = document.getElementById("chat-input");
    var window_el = document.getElementById("chat-window");
    if (!form || !input || !window_el) return;

    var replies = {
      cost: "For a 200 sq.ft kitchen remodel, you can expect a range of \u20B9180,000 to \u20B9340,000 depending on material quality and scope. Premium finishes (quartz counters, soft-close cabinetry) push it toward the upper end. I'd recommend trying our Cost Estimator for a detailed breakdown!",
      materials: "For bathrooms, I suggest anti-skid vitrified tiles for flooring, acrylic or engineered stone counter-tops, and a moisture-resistant PU paint on walls. Avoid laminates in wet zones. Want me to shortlist 3 vendors near you?",
      painter: "A reliable painter will have a verified trade license, 4.5+ rating with 50+ reviews, and a written quote. On Renova, just head to Find Contractors, filter by 'Painter' and toggle 'Verified only'. I can also pin your top 3 matches if you share your city.",
      default: "Great question! I can help with cost estimates, material picks, contractor matching, and renovation planning. Could you tell me a bit more about your project — room type, size, and budget range?"
    };

    function detect(q) {
      q = q.toLowerCase();
      if (q.indexOf("cost") > -1 || q.indexOf("price") > -1 || q.indexOf("how much") > -1) return "cost";
      if (q.indexOf("material") > -1 || q.indexOf("bathroom") > -1 || q.indexOf("tile") > -1) return "materials";
      if (q.indexOf("painter") > -1 || q.indexOf("contractor") > -1 || q.indexOf("reliable") > -1) return "painter";
      return "default";
    }

    function addMsg(text, who) {
      var div = document.createElement("div");
      div.className = "msg " + who;
      var ava = who === "bot"
        ? '<div class="ava"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/><path d="M4 14h16v6H4z"/></svg></div>'
        : '<div class="ava"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg></div>';
      div.innerHTML = ava + '<div class="bubble">' + escapeHtml(text) + "</div>";
      window_el.appendChild(div);
      window_el.scrollTop = window_el.scrollHeight;
    }

    function escapeHtml(s) {
      return s.replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    }

    function typingOn() {
      var t = document.createElement("div");
      t.className = "msg bot typing";
      t.id = "typing-ind";
      t.innerHTML = '<div class="ava"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/><path d="M4 14h16v6H4z"/></svg></div><div class="bubble"><span></span><span></span><span></span></div>';
      window_el.appendChild(t);
      window_el.scrollTop = window_el.scrollHeight;
    }
    function typingOff() {
      var t = document.getElementById("typing-ind");
      if (t) t.remove();
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var q = input.value.trim();
      if (!q) return;
      addMsg(q, "user");
      input.value = "";
      typingOn();

      function answer(text) {
        typingOff();
        addMsg(text, "bot");
      }

      apiCheck()
        .then(function (up) {
          if (!up) throw new Error("offline");
          return apiJSON("/api/chat", { method: "POST", body: JSON.stringify({ message: q }) });
        })
        .then(function (res) {
          if (!res.ok || !res.data.reply) throw new Error("bad response");
          setTimeout(function () { answer(res.data.reply); }, 500);
        })
        .catch(function (err) {
          if (err.message === "offline") {
            setTimeout(function () { answer(replies[detect(q)]); }, 900);
          } else {
            setTimeout(function () { answer("Sorry, the advisor service hiccuped. Try again in a moment."); }, 500);
          }
        });
    });

    // Chips
    document.querySelectorAll(".chips button").forEach(function (b) {
      b.addEventListener("click", function () {
        input.value = b.textContent;
        form.dispatchEvent(new Event("submit"));
      });
    });
  }

  /* ---------- Newsletter (persists to backend when available) ---------- */
  function setupNewsletter() {
    document.querySelectorAll("form[data-news]").forEach(function (f) {
      f.addEventListener("submit", function (e) {
        e.preventDefault();
        var inp = f.querySelector("input[type=email]");
        if (!inp || !inp.value) return;
        var btn = f.querySelector("button");
        var label = btn ? btn.textContent : "Subscribe";
        if (btn) { btn.disabled = true; btn.textContent = "\u2026"; }
        apiCheck()
          .then(function (up) {
            if (!up) throw new Error("offline");
            return apiJSON("/api/newsletter", { method: "POST", body: JSON.stringify({ email: inp.value.trim() }) });
          })
          .then(function (res) {
            if (!res.ok) throw new Error(res.data.error || "Subscription failed");
            showToast(res.data.message + " You're subscriber #" + res.data.total);
            inp.value = "";
          })
          .catch(function (err) {
            if (err.message === "offline") {
              showToast("Subscribed! Renovation tips incoming.");
              inp.value = "";
            } else {
              showToast(err.message);
            }
          })
          .then(function () {
            if (btn) { btn.disabled = false; btn.textContent = label; }
          });
      });
    });
  }

  /* ---------- Find Contractors: live data from /api/contractors ---------- */
  function setupContractorsAPI() {
    var grid = document.querySelector(".contractor-grid");
    if (!grid) return; // not on this page
    var countEl = document.querySelector(".shop-toolbar .count");

    var pinSVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    }

    function cardHTML(c) {
      var initials = c.name.split(" ").map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase();
      var stars = "\u2605".repeat(Math.round(c.rating));
      return '<article class="contractor-card">' +
        '<div class="photo"><div class="avatar-circle">' + escapeHtml(initials) + '</div>' +
        (c.verified ? '<span class="verified-pill">\u2713 Verified</span>' : '') + '</div>' +
        '<div class="body">' +
        '<span class="trade-badge">' + escapeHtml(c.trade) + '</span>' +
        '<h3>' + escapeHtml(c.name) + '</h3>' +
        '<div class="rating"><span class="stars">' + stars + '</span> ' + c.rating.toFixed(1) + ' (' + c.reviews + ' reviews)</div>' +
        '<div class="loc">' + pinSVG + escapeHtml(c.area + ", " + c.city) + '</div>' +
        '<div class="actions">' +
        '<a href="#" class="btn btn-outline btn-sm" data-toast="Profile coming soon!">View Profile</a>' +
        '<a href="#" class="btn btn-primary btn-sm" data-toast="Booking request sent to ' + escapeHtml(c.name) + '!">Book Now</a>' +
        '</div></div></article>';
    }

    function currentFilters() {
      var params = new URLSearchParams();
      var trades = [];
      document.querySelectorAll('.filters input[type="checkbox"]:checked').forEach(function (cb) {
        var lbl = cb.closest(".filter-opt");
        if (!lbl) return;
        var name = lbl.textContent.trim();
        if (name === "Verified only" || name === "Show verified pros only") params.set("verified", "1");
        else if (name === "Available this week") params.append("avail", "week");
        else if (name === "Offers site visit") params.append("avail", "visit");
        else trades.push(name);
      });
      if (trades.length) params.set("trade", trades.join(","));
      var rating = document.querySelector('.filters input[name="rating"]:checked');
      if (rating && rating.value !== "any") params.set("minRating", rating.value);
      var price = document.querySelector('.filters input[name="price"]:checked');
      if (price && price.value !== "any") params.set("price", price.value);
      var sort = document.querySelector(".shop-toolbar select");
      if (sort) params.set("sort", sort.value === "Nearest" ? "nearest" : sort.value === "Most Reviewed" ? "reviews" : "rating");
      return params;
    }

    function load() {
      var params = currentFilters();
      return apiJSON("/api/contractors?" + params.toString())
        .then(function (res) {
          if (!res.ok || !res.data.contractors) throw new Error("bad");
          grid.innerHTML = res.data.contractors.map(cardHTML).join("") ||
            '<p style="color:var(--grey-500)">No contractors match these filters. Try widening your search.</p>';
          if (countEl) {
            countEl.textContent = "Showing " + res.data.count + " of " + res.data.total + " contractors (live from API)";
          }
        })
        .catch(function () { /* static mode: leave the pre-rendered cards untouched */ });
    }

    apiCheck().then(function (up) {
      if (!up) return; // static mode
      load();
      document.querySelectorAll(".filters input").forEach(function (inp) {
        inp.addEventListener("change", load);
      });
      var sortSel = document.querySelector(".shop-toolbar select");
      if (sortSel) sortSel.addEventListener("change", load);
      var searchForm = document.querySelector(".search-bar");
      if (searchForm) {
        searchForm.addEventListener("submit", function (e) {
          e.preventDefault();
          var locInput = searchForm.querySelector("input");
          var tradeSel = searchForm.querySelector("select");
          var params = currentFilters();
          if (locInput && locInput.value.trim()) params.set("q", locInput.value.trim());
          if (tradeSel && tradeSel.value && tradeSel.value !== "All Trades") params.set("trade", tradeSel.value);
          apiJSON("/api/contractors?" + params.toString())
            .then(function (res) {
              if (!res.ok || !res.data.contractors) throw new Error("bad");
              grid.innerHTML = res.data.contractors.map(cardHTML).join("") ||
                '<p style="color:var(--grey-500)">No contractors found for that search. Try a different city or trade.</p>';
              if (countEl) {
                countEl.textContent = "Showing " + res.data.count + " of " + res.data.total + " contractors (live from API)";
              }
            })
            .catch(function () { showToast("Searching contractors near you..."); });
        });
      }
    });
  }

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    setupNav();
    setupEstimator();
    setupLogin();
    setupGallery();
    setupCompare();
    setupAdvisor();
    setupNewsletter();
    setupContractorsAPI();
    setupFooterMeta();
  });
})();
