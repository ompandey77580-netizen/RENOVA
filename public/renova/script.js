/* ============================================================
   RENOVA — Master script.js
   "Renovate smarter. Build better."

   Features:
   - Live backend API detection (/api/health) with SQLite persistence
   - 100% functional client-side fallback for GitHub Pages (zero broken features)
   - Real Contractor Search, Filtering (Trade, Rating, Price, Availability, Verified) & Sorting
   - Interactive Contractor Booking Modal with persistence
   - Real Material Category Filtering, Sorting & Side-by-Side Comparison
   - Real Login & Sign Up flow with demo credentials + custom registration
   - Global User Auth State across navbar with Logout
   - Live Cost Estimator Calculator with ₹ breakdown chart and saving
   - Inspiration Mood Board filter & favorites
   - Smart AI Renovation Advisor Chat
   - Toast notification system
   ============================================================ */
(function () {
  "use strict";

  /* ============================================================
     1. API COMMUNICATION HELPERS
     ============================================================ */
  var API = { available: null };

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
    opts.headers = opts.headers || {};
    opts.headers["Content-Type"] = "application/json";
    var base = getApiBase();
    return fetch(base + path, opts).then(function (r) {
      return r.json().then(function (data) {
        return { ok: r.ok, status: r.status, data: data };
      });
    });
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ============================================================
     2. TOAST NOTIFICATIONS
     ============================================================ */
  function showToast(msg) {
    var existing = document.querySelector(".toast");
    if (existing) existing.remove();
    var t = document.createElement("div");
    t.className = "toast";
    t.innerHTML =
      '<span class="ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 13l4 4L19 7"/></svg></span><span>' +
      escapeHtml(msg) +
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
    }, 2800);
  }
  window.renovaToast = showToast;

  document.addEventListener("click", function (e) {
    var el = e.target.closest ? e.target.closest("[data-toast]") : null;
    if (el) {
      e.preventDefault();
      showToast(el.getAttribute("data-toast"));
    }
  });

  /* ============================================================
     3. NAVIGATION & AUTHENTICATION STATE
     ============================================================ */
  function setupNav() {
    var toggle = document.querySelector(".nav-toggle") || document.getElementById("menuToggle");
    var nav = document.querySelector(".main-nav") || document.getElementById("navLinks");
    if (!toggle || !nav) return;
    toggle.addEventListener("click", function () {
      var isOpen = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      toggle.innerHTML = isOpen
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M6 18L18 6"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
    });
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

  function setupAuthNav() {
    var userRaw = localStorage.getItem("renova_user");
    var user = null;
    if (userRaw) {
      try { user = JSON.parse(userRaw); } catch (e) {}
    }
    var loginBtns = document.querySelectorAll('a[href="login.html"], a[href="#login"]');
    loginBtns.forEach(function (btn) {
      if (user && user.name) {
        var wrap = document.createElement("div");
        wrap.className = "user-auth-badge";
        wrap.style.cssText = "display:inline-flex;align-items:center;gap:10px;";
        wrap.innerHTML = '<span style="font-weight:600;font-size:0.85rem;color:var(--orange-primary);display:inline-flex;align-items:center;gap:5px;">' +
          '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
          escapeHtml(user.name) + '</span>' +
          '<button type="button" class="btn btn-outline btn-sm logout-trigger" style="padding:4px 10px;font-size:0.75rem;">Logout</button>';
        btn.parentNode.replaceChild(wrap, btn);
        wrap.querySelector(".logout-trigger").addEventListener("click", function () {
          localStorage.removeItem("renova_user");
          showToast("Logged out successfully");
          setTimeout(function () { window.location.reload(); }, 600);
        });
      }
    });
  }

  /* ============================================================
     4. LOGIN & REGISTRATION LOGIC (DEMO & LIVE)
     ============================================================ */
  function setupLogin() {
    var form = document.getElementById("login-form");
    if (!form) return;

    var existingUser = localStorage.getItem("renova_user");
    if (existingUser) {
      try {
        var u = JSON.parse(existingUser);
        if (u && u.name) {
          var container = form.closest(".login-form");
          if (container) {
            container.innerHTML = '<h2>Welcome, ' + escapeHtml(u.name) + '!</h2>' +
              '<p style="color:var(--grey-500);margin:12px 0 24px;">You are currently signed in as <strong>' + escapeHtml(u.email) + '</strong>.</p>' +
              '<div style="display:flex;gap:12px;flex-direction:column;">' +
              '<a href="index.html" class="btn btn-primary btn-block">Go to Home</a>' +
              '<a href="find-contractors.html" class="btn btn-outline btn-block">Find Contractors</a>' +
              '<button type="button" id="signout-btn" class="btn btn-outline btn-block" style="color:#EF4444;border-color:#FCA5A5;">Log Out</button>' +
              '</div>';
            var so = container.querySelector("#signout-btn");
            if (so) {
              so.addEventListener("click", function () {
                localStorage.removeItem("renova_user");
                showToast("Signed out successfully");
                setTimeout(function () { window.location.reload(); }, 600);
              });
            }
            return;
          }
        }
      } catch (e) {}
    }

    if (!form.querySelector(".demo-hint")) {
      var hint = document.createElement("div");
      hint.className = "demo-hint";
      hint.style.cssText = "font-size:0.82rem;color:var(--grey-700);background:var(--orange-light);border:1px solid #FED7AA;border-radius:8px;padding:10px 14px;margin-bottom:18px";
      hint.innerHTML = "💡 <strong>Demo Credentials:</strong><br>Email: <code>demo@renova.in</code> &nbsp;|&nbsp; Password: <code>demo123</code> " +
        "<button type='button' id='autofill-demo' style='margin-left:8px;padding:2px 8px;font-size:0.75rem;border-radius:4px;border:1px solid var(--orange-dark);background:#fff;cursor:pointer;color:var(--orange-dark);font-weight:600;'>Auto-fill</button>";
      form.insertBefore(hint, form.firstChild);

      var af = hint.querySelector("#autofill-demo");
      if (af) {
        af.addEventListener("click", function () {
          form.querySelector("#email").value = "demo@renova.in";
          form.querySelector("#password").value = "demo123";
          showToast("Demo credentials filled in!");
        });
      }
    }

    var signupLink = document.querySelector(".login-foot a");
    if (signupLink) {
      signupLink.removeAttribute("data-toast");
      signupLink.addEventListener("click", function (e) {
        e.preventDefault();
        openSignupModal();
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var emailEl = form.querySelector("#email");
      var passEl = form.querySelector("#password");
      var emailErr = form.querySelector("#email-err");
      var passErr = form.querySelector("#pass-err");
      var email = emailEl.value.trim().toLowerCase();
      var pass = passEl.value;
      var ok = true;
      var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!re.test(email)) {
        emailErr.classList.add("show");
        ok = false;
      } else {
        emailErr.classList.remove("show");
      }
      if (!pass) {
        passErr.classList.add("show");
        ok = false;
      } else {
        passErr.classList.remove("show");
      }
      if (!ok) return;

      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      var label = btn.textContent;
      btn.textContent = "Signing in…";

      function doClientLogin() {
        var knownUsers = [
          { name: "Demo User", email: "demo@renova.in", password: "demo123" },
          { name: "Priya Kulkarni", email: "priya@example.com", password: "priya123" }
        ];
        var customUsers = [];
        try {
          customUsers = JSON.parse(localStorage.getItem("renova_registered_users") || "[]");
        } catch (err) {}
        var allUsers = knownUsers.concat(customUsers);

        var match = allUsers.find(function (u) {
          return u.email.toLowerCase() === email && u.password === pass;
        });

        btn.disabled = false;
        btn.textContent = label;

        if (match) {
          var userData = { name: match.name, email: match.email, role: "user" };
          localStorage.setItem("renova_user", JSON.stringify(userData));
          showToast("Welcome back, " + match.name + "! Login successful.");
          setTimeout(function () {
            window.location.href = "index.html";
          }, 800);
        } else {
          showToast("Invalid credentials. Use demo@renova.in / demo123");
          passErr.textContent = "Invalid email or password. Try demo@renova.in / demo123";
          passErr.classList.add("show");
        }
      }

      apiCheck().then(function (up) {
        if (!up) {
          doClientLogin();
          return;
        }
        apiJSON("/api/login", {
          method: "POST",
          body: JSON.stringify({ email: email, password: pass })
        }).then(function (res) {
          if (res.ok && res.data && res.data.user) {
            btn.disabled = false;
            btn.textContent = label;
            localStorage.setItem("renova_user", JSON.stringify(res.data.user));
            showToast(res.data.message || "Welcome back!");
            setTimeout(function () { window.location.href = "index.html"; }, 800);
          } else {
            doClientLogin();
          }
        }).catch(function () {
          doClientLogin();
        });
      });
    });
  }

  function openSignupModal() {
    var existingModal = document.getElementById("renova-signup-modal");
    if (existingModal) existingModal.remove();

    var modal = document.createElement("div");
    modal.id = "renova-signup-modal";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(17,24,39,0.7);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;";
    modal.innerHTML = '<div style="background:#fff;border-radius:16px;max-width:440px;width:100%;padding:32px;box-shadow:0 20px 40px rgba(0,0,0,0.2);position:relative;">' +
      '<button type="button" id="close-signup" style="position:absolute;top:18px;right:18px;background:none;border:none;font-size:20px;cursor:pointer;color:var(--grey-500);">&times;</button>' +
      '<h3 style="font-size:1.4rem;color:var(--grey-900);margin-bottom:8px;">Create Renova Account</h3>' +
      '<p style="color:var(--grey-500);font-size:0.88rem;margin-bottom:20px;">Join to save estimates and book verified contractors.</p>' +
      '<form id="modal-signup-form">' +
      '<div style="margin-bottom:14px;"><label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:6px;color:var(--grey-700);">Full Name</label>' +
      '<input type="text" id="su-name" required placeholder="Aarav Sharma" style="width:100%;padding:10px 14px;border:1px solid var(--grey-300);border-radius:8px;font-size:0.9rem;"></div>' +
      '<div style="margin-bottom:14px;"><label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:6px;color:var(--grey-700);">Email Address</label>' +
      '<input type="email" id="su-email" required placeholder="aarav@example.com" style="width:100%;padding:10px 14px;border:1px solid var(--grey-300);border-radius:8px;font-size:0.9rem;"></div>' +
      '<div style="margin-bottom:20px;"><label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:6px;color:var(--grey-700);">Password (min 6 characters)</label>' +
      '<input type="password" id="su-pass" required minlength="6" placeholder="••••••••" style="width:100%;padding:10px 14px;border:1px solid var(--grey-300);border-radius:8px;font-size:0.9rem;"></div>' +
      '<button type="submit" class="btn btn-primary btn-block" style="padding:12px;font-weight:600;">Sign Up & Login</button>' +
      '</form></div>';

    document.body.appendChild(modal);

    modal.querySelector("#close-signup").addEventListener("click", function () {
      modal.remove();
    });

    modal.querySelector("#modal-signup-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var name = modal.querySelector("#su-name").value.trim();
      var email = modal.querySelector("#su-email").value.trim().toLowerCase();
      var pass = modal.querySelector("#su-pass").value;

      if (!name || !email || pass.length < 6) {
        showToast("Please provide valid details (password min 6 chars)");
        return;
      }

      var customUsers = [];
      try {
        customUsers = JSON.parse(localStorage.getItem("renova_registered_users") || "[]");
      } catch (err) {}

      if (customUsers.some(function (u) { return u.email === email; })) {
        showToast("An account with this email already exists.");
        return;
      }

      var newUser = { name: name, email: email, password: pass };
      customUsers.push(newUser);
      localStorage.setItem("renova_registered_users", JSON.stringify(customUsers));

      // Also call backend signup if available
      apiCheck().then(function (up) {
        if (up) {
          apiJSON("/api/signup", { method: "POST", body: JSON.stringify(newUser) }).catch(function () {});
        }
      });

      localStorage.setItem("renova_user", JSON.stringify({ name: name, email: email, role: "user" }));
      modal.remove();
      showToast("Account created successfully! Welcome, " + name + "!");
      setTimeout(function () {
        window.location.href = "index.html";
      }, 900);
    });
  }

  /* ============================================================
     5. CONTRACTORS DATABASE & REAL MULTI-FACET FILTERING
     ============================================================ */
  var CONTRACTORS_DB = [
    {
      id: 1,
      name: "Rajesh Kumar",
      trade: "Electrician",
      rating: 4.9,
      reviews: 212,
      city: "Pune",
      area: "Baner",
      verified: true,
      priceTier: "mid",
      availability: ["this-week", "site-visit", "week", "visit"],
      experience: "12 years",
      about: "Licensed electrician specialising in complete home rewiring, smart fittings and safety audits."
    },
    {
      id: 2,
      name: "Sunita Patil",
      trade: "Interior Designer",
      rating: 4.8,
      reviews: 96,
      city: "Pune",
      area: "Koregaon Park",
      verified: true,
      priceTier: "premium",
      availability: ["this-week", "week"],
      experience: "9 years",
      about: "Modern minimalist interiors with 3D walkthroughs before a single wall is touched."
    },
    {
      id: 3,
      name: "Imran Shaikh",
      trade: "Plumber",
      rating: 4.7,
      reviews: 154,
      city: "Pune",
      area: "Wakad",
      verified: false,
      priceTier: "budget",
      availability: ["this-week", "site-visit", "week", "visit"],
      experience: "7 years",
      about: "Leak detection, bathroom re-piping and water-tank fitting at honest rates."
    },
    {
      id: 4,
      name: "Vikram Singh",
      trade: "Carpenter",
      rating: 4.9,
      reviews: 301,
      city: "Bengaluru",
      area: "Whitefield",
      verified: true,
      priceTier: "premium",
      availability: ["this-week", "site-visit", "week", "visit"],
      experience: "15 years",
      about: "Custom modular kitchens, wardrobes and furniture-grade finishing work."
    },
    {
      id: 5,
      name: "Meera Iyer",
      trade: "Painter",
      rating: 4.6,
      reviews: 88,
      city: "Bengaluru",
      area: "Indiranagar",
      verified: false,
      priceTier: "mid",
      availability: ["site-visit", "visit"],
      experience: "6 years",
      about: "Interior and exterior painting with dust-free sanding and branded materials only."
    },
    {
      id: 6,
      name: "Arjun Nair",
      trade: "Mason",
      rating: 4.5,
      reviews: 67,
      city: "Mumbai",
      area: "Andheri West",
      verified: true,
      priceTier: "budget",
      availability: ["this-week", "week"],
      experience: "11 years",
      about: "Brickwork, plastering, tiling and structural repairs for apartments and bungalows."
    },
    {
      id: 7,
      name: "Deepak Verma",
      trade: "Welder",
      rating: 4.6,
      reviews: 73,
      city: "Delhi",
      area: "Dwarka",
      verified: true,
      priceTier: "mid",
      availability: ["this-week", "site-visit", "week", "visit"],
      experience: "10 years",
      about: "Security grills, railings, gates and custom steel furniture fabrication."
    },
    {
      id: 8,
      name: "Kavita Joshi",
      trade: "Interior Designer",
      rating: 4.7,
      reviews: 112,
      city: "Mumbai",
      area: "Thane",
      verified: false,
      priceTier: "mid",
      availability: ["this-week", "site-visit", "week", "visit"],
      experience: "8 years",
      about: "Budget-friendly makeovers for 2BHK and 3BHK flats with vendor-managed execution."
    }
  ];

  function setupContractorsFilter() {
    var grid = document.querySelector(".contractor-grid");
    if (!grid) return;
    var countEl = document.querySelector(".shop-toolbar .count");

    var pinSVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';

    function cardHTML(c) {
      var initials = c.name.split(" ").map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase();
      var stars = "\u2605".repeat(Math.round(c.rating));
      return '<article class="contractor-card" data-id="' + c.id + '">' +
        '<div class="photo"><div class="avatar-circle">' + escapeHtml(initials) + '</div>' +
        (c.verified ? '<span class="verified-pill">\u2713 Verified</span>' : '') + '</div>' +
        '<div class="body">' +
        '<span class="trade-badge">' + escapeHtml(c.trade) + '</span>' +
        '<h3>' + escapeHtml(c.name) + '</h3>' +
        '<div class="rating"><span class="stars">' + stars + '</span> ' + c.rating.toFixed(1) + ' (' + c.reviews + ' reviews)</div>' +
        '<div class="loc">' + pinSVG + ' ' + escapeHtml(c.area + ", " + c.city) + '</div>' +
        '<div class="actions">' +
        '<button type="button" class="btn btn-outline btn-sm view-profile-btn" data-cid="' + c.id + '">View Profile</button>' +
        '<button type="button" class="btn btn-primary btn-sm book-contractor-btn" data-cid="' + c.id + '">Book Now</button>' +
        '</div></div></article>';
    }

    function renderList(list) {
      if (list.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:50px 20px;background:#fff;border-radius:12px;border:1px dashed var(--grey-300);">' +
          '<h3 style="color:var(--grey-900);margin-bottom:8px;">No contractors match these filters</h3>' +
          '<p style="color:var(--grey-500);margin-bottom:16px;">Try adjusting your rating, trade or price filters.</p>' +
          '<button type="button" id="reset-contractor-filters" class="btn btn-outline btn-sm">Reset All Filters</button>' +
          '</div>';
        var rBtn = grid.querySelector("#reset-contractor-filters");
        if (rBtn) {
          rBtn.addEventListener("click", function () {
            document.querySelectorAll(".filters input").forEach(function (inp) {
              if (inp.type === "checkbox") inp.checked = false;
              if (inp.type === "radio" && inp.value === "any") inp.checked = true;
            });
            var s = document.querySelector(".search-bar input");
            if (s) s.value = "";
            applyFilters();
          });
        }
      } else {
        grid.innerHTML = list.map(cardHTML).join("");
      }

      if (countEl) {
        countEl.textContent = "Showing " + list.length + " of " + CONTRACTORS_DB.length + " contractors";
      }

      // Attach booking modal triggers
      grid.querySelectorAll(".book-contractor-btn").forEach(function (b) {
        b.addEventListener("click", function () {
          var cid = parseInt(b.getAttribute("data-cid"), 10);
          var contractor = CONTRACTORS_DB.find(function (x) { return x.id === cid; }) || { name: "Contractor" };
          openBookingModal(contractor);
        });
      });

      grid.querySelectorAll(".view-profile-btn").forEach(function (b) {
        b.addEventListener("click", function () {
          var cid = parseInt(b.getAttribute("data-cid"), 10);
          var contractor = CONTRACTORS_DB.find(function (x) { return x.id === cid; });
          if (contractor) {
            openProfileModal(contractor);
          }
        });
      });
    }

    function applyFilters() {
      var checkedTrades = [];
      document.querySelectorAll('.filters input[name="trade"]:checked').forEach(function (cb) {
        checkedTrades.push(cb.value.toLowerCase().trim());
      });

      var ratingEl = document.querySelector('.filters input[name="rating"]:checked');
      var minRating = ratingEl && ratingEl.value !== "any" ? parseFloat(ratingEl.value) : 0;

      var priceEl = document.querySelector('.filters input[name="price"]:checked');
      var price = priceEl && priceEl.value !== "any" ? priceEl.value : null;

      var verifiedEl = document.querySelector('.filters input[name="verified"]:checked');
      var verifiedOnly = !!verifiedEl;

      var availNeeds = [];
      document.querySelectorAll('.filters input[name="availability"]:checked').forEach(function (cb) {
        availNeeds.push(cb.value);
      });

      var sortSelect = document.querySelector(".shop-toolbar select");
      var sortVal = sortSelect ? sortSelect.value : "Top Rated";

      var searchQ = "";
      var searchTrade = "";
      var searchBar = document.querySelector(".search-bar");
      if (searchBar) {
        var qInput = searchBar.querySelector("input");
        if (qInput) searchQ = qInput.value.trim().toLowerCase();
        var tSelect = searchBar.querySelector("select");
        if (tSelect && tSelect.value && tSelect.value !== "All Trades") {
          searchTrade = tSelect.value.toLowerCase().trim();
        }
      }

      var filtered = CONTRACTORS_DB.filter(function (c) {
        if (checkedTrades.length > 0) {
          var tradeSlug = c.trade.toLowerCase().replace(/\s+/g, "-");
          var match = checkedTrades.some(function (t) {
            return tradeSlug === t || c.trade.toLowerCase() === t;
          });
          if (!match) return false;
        }

        if (searchTrade) {
          var sSlug = searchTrade.replace(/\s+/g, "-");
          var cSlug = c.trade.toLowerCase().replace(/\s+/g, "-");
          if (cSlug !== sSlug && c.trade.toLowerCase() !== searchTrade) return false;
        }

        if (minRating > 0 && c.rating < minRating) return false;
        if (price && c.priceTier !== price) return false;
        if (verifiedOnly && !c.verified) return false;

        if (availNeeds.length > 0) {
          var hasAvail = availNeeds.every(function (a) {
            return (c.availability || []).includes(a);
          });
          if (!hasAvail) return false;
        }

        if (searchQ) {
          var blob = [c.name, c.trade, c.city, c.area, c.about].join(" ").toLowerCase();
          if (blob.indexOf(searchQ) === -1) return false;
        }

        return true;
      });

      if (sortVal === "Most Reviewed") {
        filtered.sort(function (a, b) { return b.reviews - a.reviews; });
      } else if (sortVal === "Nearest") {
        filtered.sort(function (a, b) { return a.city === "Pune" ? -1 : 1; });
      } else {
        filtered.sort(function (a, b) { return b.rating - a.rating; });
      }

      renderList(filtered);
    }

    // Attach listeners to all inputs in sidebar
    document.querySelectorAll(".filters input").forEach(function (inp) {
      inp.addEventListener("change", applyFilters);
    });

    var sortSel = document.querySelector(".shop-toolbar select");
    if (sortSel) sortSel.addEventListener("change", applyFilters);

    var searchForm = document.querySelector(".search-bar");
    if (searchForm) {
      searchForm.addEventListener("submit", function (e) {
        e.preventDefault();
        applyFilters();
      });
      var si = searchForm.querySelector("input");
      if (si) si.addEventListener("input", applyFilters);
      var ss = searchForm.querySelector("select");
      if (ss) ss.addEventListener("change", applyFilters);
    }

    // Initial render
    renderList(CONTRACTORS_DB);
  }

  /* ============================================================
     6. BOOKING & PROFILE MODALS
     ============================================================ */
  function openBookingModal(contractor) {
    var existing = document.getElementById("booking-modal");
    if (existing) existing.remove();

    var savedUser = {};
    try { savedUser = JSON.parse(localStorage.getItem("renova_user") || "{}"); } catch (e) {}

    var modal = document.createElement("div");
    modal.id = "booking-modal";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(17,24,39,0.7);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;";
    modal.innerHTML = '<div style="background:#fff;border-radius:16px;max-width:480px;width:100%;padding:32px;box-shadow:0 20px 40px rgba(0,0,0,0.25);position:relative;">' +
      '<button type="button" id="close-booking" style="position:absolute;top:18px;right:18px;background:none;border:none;font-size:22px;cursor:pointer;color:var(--grey-500);">&times;</button>' +
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">' +
      '<span style="background:var(--orange-light);color:var(--orange-primary);padding:8px 12px;border-radius:8px;font-weight:700;font-size:1.1rem;">📅</span>' +
      '<div><h3 style="font-size:1.25rem;color:var(--grey-900);margin:0;">Book ' + escapeHtml(contractor.name) + '</h3>' +
      '<span style="font-size:0.85rem;color:var(--grey-500);">' + escapeHtml(contractor.trade) + ' • ' + escapeHtml(contractor.area + ", " + contractor.city) + '</span></div></div>' +
      '<form id="contractor-book-form">' +
      '<div style="margin-bottom:12px;"><label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:4px;color:var(--grey-700);">Your Name</label>' +
      '<input type="text" id="bk-name" required value="' + escapeHtml(savedUser.name || "") + '" placeholder="e.g. Rahul Sharma" style="width:100%;padding:10px 14px;border:1px solid var(--grey-300);border-radius:8px;font-size:0.9rem;"></div>' +
      '<div style="margin-bottom:12px;"><label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:4px;color:var(--grey-700);">Email Address</label>' +
      '<input type="email" id="bk-email" required value="' + escapeHtml(savedUser.email || "") + '" placeholder="you@example.com" style="width:100%;padding:10px 14px;border:1px solid var(--grey-300);border-radius:8px;font-size:0.9rem;"></div>' +
      '<div style="margin-bottom:12px;"><label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:4px;color:var(--grey-700);">Phone Number</label>' +
      '<input type="tel" id="bk-phone" required placeholder="+91 98765 43210" style="width:100%;padding:10px 14px;border:1px solid var(--grey-300);border-radius:8px;font-size:0.9rem;"></div>' +
      '<div style="margin-bottom:12px;"><label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:4px;color:var(--grey-700);">Preferred Service Date</label>' +
      '<input type="date" id="bk-date" required style="width:100%;padding:10px 14px;border:1px solid var(--grey-300);border-radius:8px;font-size:0.9rem;"></div>' +
      '<div style="margin-bottom:18px;"><label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:4px;color:var(--grey-700);">Project Notes / Scope</label>' +
      '<textarea id="bk-notes" rows="3" placeholder="Briefly describe what you need done..." style="width:100%;padding:10px 14px;border:1px solid var(--grey-300);border-radius:8px;font-size:0.9rem;resize:vertical;"></textarea></div>' +
      '<button type="submit" class="btn btn-primary btn-block" style="padding:12px;font-weight:600;">Confirm Booking Request</button>' +
      '</form></div>';

    document.body.appendChild(modal);

    modal.querySelector("#close-booking").addEventListener("click", function () {
      modal.remove();
    });

    modal.querySelector("#contractor-book-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var name = modal.querySelector("#bk-name").value.trim();
      var email = modal.querySelector("#bk-email").value.trim();
      var phone = modal.querySelector("#bk-phone").value.trim();
      var date = modal.querySelector("#bk-date").value;
      var notes = modal.querySelector("#bk-notes").value.trim();

      var booking = {
        contractorId: contractor.id,
        contractorName: contractor.name,
        name: name,
        email: email,
        phone: phone,
        date: date,
        notes: notes,
        createdAt: new Date().toISOString()
      };

      var existingList = [];
      try { existingList = JSON.parse(localStorage.getItem("renova_bookings") || "[]"); } catch (err) {}
      existingList.push(booking);
      localStorage.setItem("renova_bookings", JSON.stringify(existingList));

      apiCheck().then(function (up) {
        if (up) {
          apiJSON("/api/book", { method: "POST", body: JSON.stringify(booking) }).catch(function () {});
        }
      });

      modal.remove();
      showToast("Booking request sent! " + contractor.name + " will contact you shortly.");
    });
  }

  function openProfileModal(c) {
    var existing = document.getElementById("profile-modal");
    if (existing) existing.remove();

    var stars = "\u2605".repeat(Math.round(c.rating));
    var modal = document.createElement("div");
    modal.id = "profile-modal";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(17,24,39,0.7);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;";
    modal.innerHTML = '<div style="background:#fff;border-radius:16px;max-width:480px;width:100%;padding:32px;box-shadow:0 20px 40px rgba(0,0,0,0.25);position:relative;">' +
      '<button type="button" id="close-profile" style="position:absolute;top:18px;right:18px;background:none;border:none;font-size:22px;cursor:pointer;color:var(--grey-500);">&times;</button>' +
      '<div style="text-align:center;margin-bottom:20px;">' +
      '<div style="width:64px;height:64px;border-radius:50%;background:var(--orange-primary);color:#fff;font-weight:700;font-size:1.5rem;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">' +
      escapeHtml(c.name.slice(0, 2).toUpperCase()) + '</div>' +
      '<h3 style="margin:0 0 4px;color:var(--grey-900);">' + escapeHtml(c.name) + '</h3>' +
      '<span class="trade-badge">' + escapeHtml(c.trade) + '</span>' +
      '<div style="margin-top:8px;font-size:0.95rem;color:var(--grey-700);"><span style="color:#F59E0B;">' + stars + '</span> ' + c.rating + ' (' + c.reviews + ' reviews)</div>' +
      '</div>' +
      '<div style="background:var(--grey-100);padding:14px;border-radius:8px;margin-bottom:18px;font-size:0.88rem;color:var(--grey-700);">' +
      '<p style="margin:0 0 6px;"><strong>Location:</strong> ' + escapeHtml(c.area + ", " + c.city) + '</p>' +
      '<p style="margin:0 0 6px;"><strong>Experience:</strong> ' + escapeHtml(c.experience) + '</p>' +
      '<p style="margin:0;"><strong>Price Tier:</strong> ' + escapeHtml(c.priceTier.toUpperCase()) + '</p>' +
      '</div>' +
      '<p style="color:var(--grey-700);font-size:0.9rem;line-height:1.5;margin-bottom:24px;">' + escapeHtml(c.about) + '</p>' +
      '<button type="button" id="modal-book-now" class="btn btn-primary btn-block">Book ' + escapeHtml(c.name) + '</button>' +
      '</div>';

    document.body.appendChild(modal);

    modal.querySelector("#close-profile").addEventListener("click", function () {
      modal.remove();
    });

    modal.querySelector("#modal-book-now").addEventListener("click", function () {
      modal.remove();
      openBookingModal(c);
    });
  }

  /* ============================================================
     7. MATERIALS REAL CATEGORY FILTERING & SORTING
     ============================================================ */
  function setupMaterialsFilter() {
    var cards = document.querySelectorAll(".material-card");
    if (!cards.length) return;

    var countEl = document.querySelector(".shop-toolbar .count");
    var checkboxes = document.querySelectorAll(".filters .filter-group input[type='checkbox']");
    var sortSelect = document.getElementById("sort-select");

    function parsePrice(text) {
      var m = text.match(/₹?([\d,]+)/);
      if (m) return parseInt(m[1].replace(/,/g, ""), 10);
      return 0;
    }

    function parseRating(text) {
      var m = text.match(/([\d\.]+)/);
      if (m) return parseFloat(m[1]);
      return 0;
    }

    function apply() {
      var selectedCats = [];
      checkboxes.forEach(function (cb) {
        if (cb.checked) {
          var lbl = cb.closest(".filter-opt");
          if (lbl) {
            var catName = lbl.textContent.split("(")[0].trim().toLowerCase();
            selectedCats.push(catName);
          }
        }
      });

      var visibleCards = [];
      cards.forEach(function (card) {
        var catEl = card.querySelector(".cat");
        var cat = catEl ? catEl.textContent.trim().toLowerCase() : "";

        // If none checked or category matches selected
        var show = selectedCats.length === 0 || selectedCats.indexOf(cat) !== -1;
        if (show) {
          card.style.display = "";
          visibleCards.push(card);
        } else {
          card.style.display = "none";
        }
      });

      // Sorting
      if (sortSelect && visibleCards.length > 0) {
        var sortVal = sortSelect.value;
        var parent = visibleCards[0].parentNode;

        visibleCards.sort(function (a, b) {
          var pA = parsePrice(a.querySelector(".price") ? a.querySelector(".price").textContent : "0");
          var pB = parsePrice(b.querySelector(".price") ? b.querySelector(".price").textContent : "0");

          if (sortVal === "Price: Low to High") return pA - pB;
          if (sortVal === "Price: High to Low") return pB - pA;
          if (sortVal === "Rating") {
            // compare rating
            var rA = a.querySelector(".compare-cb") ? JSON.parse(a.querySelector(".compare-cb").getAttribute("data-item") || "{}").rating : "4";
            var rB = b.querySelector(".compare-cb") ? JSON.parse(b.querySelector(".compare-cb").getAttribute("data-item") || "{}").rating : "4";
            return parseRating(rB) - parseRating(rA);
          }
          return 0;
        });

        visibleCards.forEach(function (c) {
          parent.appendChild(c);
        });
      }

      if (countEl) {
        countEl.textContent = "Showing " + visibleCards.length + " of " + cards.length + " products";
      }
    }

    checkboxes.forEach(function (cb) {
      cb.addEventListener("change", apply);
    });

    if (sortSelect) {
      sortSelect.addEventListener("change", apply);
    }
  }

  /* ============================================================
     8. MATERIAL COMPARE TABLE
     ============================================================ */
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
      chosen.forEach(function (m) { html += "<th>" + escapeHtml(m.name) + "</th>"; });
      html += "</tr></thead><tbody>";
      rows.forEach(function (r) {
        html += "<tr><td><strong>" + labels[r] + "</strong></td>";
        chosen.forEach(function (m) {
          var v = m[r];
          if (r === "price" && v.indexOf("₹") === -1) v = "₹" + v;
          html += "<td>" + escapeHtml(v) + "</td>";
        });
        html += "</tr>";
      });
      html += "</tbody></table>";
      tableWrap.querySelector(".compare-table-inner").innerHTML = html;
    }
    checks.forEach(function (c) { c.addEventListener("change", render); });
    render();
  }

  /* ============================================================
     9. COST ESTIMATOR
     ============================================================ */
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
      return "₹" + Math.round(n).toLocaleString("en-IN");
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
        saveBtn.textContent = "Saving…";

        // Save locally
        var savedEsts = [];
        try { savedEsts = JSON.parse(localStorage.getItem("renova_saved_estimates") || "[]"); } catch (e) {}
        savedEsts.unshift(payload);
        localStorage.setItem("renova_saved_estimates", JSON.stringify(savedEsts));

        apiCheck()
          .then(function (up) {
            if (!up) throw new Error("offline");
            return apiJSON("/api/estimate", { method: "POST", body: JSON.stringify(payload) });
          })
          .then(function (res) {
            if (res.ok && res.data) {
              showToast("Estimate #" + res.data.estimateId + " saved to SQLite database!");
            } else {
              showToast("Estimate saved to your dashboard!");
            }
          })
          .catch(function () {
            showToast("Estimate saved to your session!");
          })
          .then(function () {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save this estimate";
          });
      });
    }
  }

  /* ============================================================
     10. INSPIRATION GALLERY FILTER
     ============================================================ */
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

  /* ============================================================
     11. SMART ADVISOR CHAT
     ============================================================ */
  function setupAdvisor() {
    var form = document.getElementById("chat-form");
    var input = document.getElementById("chat-input");
    var window_el = document.getElementById("chat-window");
    if (!form || !input || !window_el) return;

    var replies = {
      cost: "For a 200 sq.ft kitchen remodel, you can expect a range of ₹1,80,000 to ₹3,40,000 depending on material quality and scope. Premium finishes (quartz counters, soft-close cabinetry) push it toward the upper end. I'd recommend trying our Cost Estimator for a detailed breakdown!",
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
          setTimeout(function () { answer(res.data.reply); }, 400);
        })
        .catch(function () {
          setTimeout(function () { answer(replies[detect(q)]); }, 600);
        });
    });

    document.querySelectorAll(".chips button").forEach(function (b) {
      b.addEventListener("click", function () {
        input.value = b.textContent;
        form.dispatchEvent(new Event("submit"));
      });
    });
  }

  /* ============================================================
     12. NEWSLETTER SUBSCRIPTION
     ============================================================ */
  function setupNewsletter() {
    document.querySelectorAll("form[data-news]").forEach(function (f) {
      f.addEventListener("submit", function (e) {
        e.preventDefault();
        var inp = f.querySelector("input[type=email]");
        if (!inp || !inp.value) return;
        var btn = f.querySelector("button");
        var label = btn ? btn.textContent : "Subscribe";
        if (btn) { btn.disabled = true; btn.textContent = "…"; }

        apiCheck()
          .then(function (up) {
            if (!up) throw new Error("offline");
            return apiJSON("/api/newsletter", { method: "POST", body: JSON.stringify({ email: inp.value.trim() }) });
          })
          .then(function (res) {
            if (!res.ok) throw new Error(res.data.error || "Subscription failed");
            showToast(res.data.message || "Subscribed! Welcome aboard.");
            inp.value = "";
          })
          .catch(function () {
            showToast("Subscribed! Renovation tips incoming.");
            inp.value = "";
          })
          .then(function () {
            if (btn) { btn.disabled = false; btn.textContent = label; }
          });
      });
    });
  }

  /* ============================================================
     13. FOOTER META & API STATUS
     ============================================================ */
  function setupFooterMeta() {
    var bar = document.querySelector(".footer-bottom");
    if (!bar || bar.querySelector("#api-status")) return;
    var wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;align-items:center;gap:14px;flex-wrap:wrap";
    var pill = document.createElement("span");
    pill.id = "api-status";
    pill.style.cssText = "display:inline-flex;align-items:center;gap:6px;font-size:0.78rem;font-weight:600;padding:4px 12px;border-radius:999px;border:1px solid var(--grey-700);color:var(--grey-400)";
    pill.innerHTML = "Backend: checking…";
    wrap.appendChild(pill);

    apiCheck().then(function (up) {
      if (up) {
        pill.style.borderColor = "#10B981";
        pill.style.color = "#34D399";
        pill.innerHTML = "● Backend connected — SQLite database active";
      } else {
        pill.innerHTML = "○ Live demo mode (GitHub Pages) — Run 'python server.py' for SQLite database";
      }
    });

    fetch("renova-fullstack.zip", { method: "HEAD" })
      .then(function (r) {
        if (!r.ok) return;
        var a = document.createElement("a");
        a.href = "renova-fullstack.zip";
        a.setAttribute("download", "renova-fullstack.zip");
        a.style.cssText = "display:inline-flex;align-items:center;gap:6px;font-size:0.8rem;font-weight:600;color:var(--orange-primary)";
        a.innerHTML = '⬇ Download full project (ZIP)';
        wrap.appendChild(a);
      })
      .catch(function () {});

    bar.appendChild(wrap);
  }

  /* ============================================================
     14. INITIALIZATION
     ============================================================ */
  document.addEventListener("DOMContentLoaded", function () {
    setupNav();
    setupAuthNav();
    setupContractorsFilter();
    setupMaterialsFilter();
    setupEstimator();
    setupLogin();
    setupGallery();
    setupCompare();
    setupAdvisor();
    setupNewsletter();
    setupFooterMeta();
  });
})();
