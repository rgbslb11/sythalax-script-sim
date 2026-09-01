(function () {
  var KEY = "sythalax_boxpad_v1";
  var QLAB = ["Q1", "Q2", "Q3", "Q4", "OT", "T"];
  var state = { games: [], active: null, aim: { side: "away", q: 0 } };

  function uid() { return "G" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function blankPins() {
    return {
      away_plays: null, home_plays: null,
      away_to: null, home_to: null,
      away_pass_td: 0, away_rush_td: 0, away_fg: 0,
      home_pass_td: 0, home_rush_td: 0, home_fg: 0,
      away_nonoff_td: 0, home_nonoff_td: 0
    };
  }
  function newGame() {
    return {
      id: uid(),
      away: "",
      home: "",
      site: "home",
      qlen: "10",
      away_q: [0, 0, 0, 0, 0],
      home_q: [0, 0, 0, 0, 0],
      away_top: "",
      home_top: "",
      away_nonoff_pts: "",
      home_nonoff_pts: "",
      pins: blankPins(),
      log: [],
      updated: Date.now()
    };
  }
  function sum(arr) { return arr.reduce(function (a, b) { return a + (Number(b) || 0); }, 0); }
  function g() {
    return state.games.find(function (x) { return x.id === state.active; });
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ games: state.games, active: state.active })); } catch (e) {}
  }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return;
      var j = JSON.parse(raw);
      state.games = j.games || [];
      state.active = j.active;
    } catch (e) {}
  }
  function $(id) { return document.getElementById(id); }
  function show(msg) { $("status").textContent = msg || ""; }

  function ticketJSON(game) {
    var p = game.pins;
    function opt(v) { return v === null || v === "" ? null : v; }
    return {
      home: game.home || "Home",
      away: game.away || "Away",
      site: game.site,
      home_q: game.home_q.slice(0, 4),
      away_q: game.away_q.slice(0, 4),
      home_ot: game.home_q[4] || 0,
      away_ot: game.away_q[4] || 0,
      qLen: Number(game.qlen || 10),
      printed: { away: sum(game.away_q), home: sum(game.home_q) },
      construction: {
        away: { pass_td: p.away_pass_td || 0, rush_td: p.away_rush_td || 0, fg: p.away_fg || 0 },
        home: { pass_td: p.home_pass_td || 0, rush_td: p.home_rush_td || 0, fg: p.home_fg || 0 }
      },
      pins: {
        home_plays: opt(p.home_plays),
        away_plays: opt(p.away_plays),
        home_top: game.home_top || null,
        away_top: game.away_top || null,
        home_to: opt(p.home_to),
        away_to: opt(p.away_to),
        home_nonoff_td: opt(p.home_nonoff_td),
        away_nonoff_td: opt(p.away_nonoff_td),
        home_nonoff_pts: game.home_nonoff_pts === "" ? null : Number(game.home_nonoff_pts),
        away_nonoff_pts: game.away_nonoff_pts === "" ? null : Number(game.away_nonoff_pts)
      },
      log: game.log
    };
  }

  function line(game) {
    var a = game.away || "AWAY";
    var h = game.home || "HOME";
    var aq = game.away_q;
    var hq = game.home_q;
    var at = sum(aq), ht = sum(hq);
    var pathA = aq.slice(0, 4).join("-") + (aq[4] ? "+" + aq[4] : "");
    var pathH = hq.slice(0, 4).join("-") + (hq[4] ? "+" + hq[4] : "");
    return a + " " + at + " (" + pathA + ")  " + h + " " + ht + " (" + pathH + ")";
  }

  function renderChips() {
    var el = $("chips");
    el.innerHTML = "";
    if (!state.games.length) {
      el.innerHTML = '<span class="chip">no games yet</span>';
      return;
    }
    state.games.forEach(function (game) {
      var b = document.createElement("button");
      b.className = "chip" + (game.id === state.active ? " on" : "");
      var a = game.away || "AWY";
      var h = game.home || "HME";
      b.textContent = a.slice(0, 6) + " " + sum(game.away_q) + "\u2013" + sum(game.home_q) + " " + h.slice(0, 6);
      b.onclick = function () { state.active = game.id; save(); render(); };
      el.appendChild(b);
    });
  }

  function renderGrid(game) {
    var el = $("grid");
    el.innerHTML = "";
    [""].concat(QLAB).forEach(function (lab) {
      var d = document.createElement("div");
      d.className = "ghead";
      d.textContent = lab;
      el.appendChild(d);
    });
    ["away", "home"].forEach(function (side) {
      var lab = document.createElement("div");
      lab.className = "glab " + side;
      lab.textContent = side === "away" ? "AWY" : "HME";
      el.appendChild(lab);
      for (var i = 0; i < 5; i++) {
        (function (side, i) {
          var c = document.createElement("button");
          c.className = "gcell";
          if (state.aim.side === side && state.aim.q === i) c.classList.add("on");
          c.textContent = game[side + "_q"][i] || 0;
          c.onclick = function () { state.aim = { side: side, q: i }; render(); };
          el.appendChild(c);
        })(side, i);
      }
      var t = document.createElement("div");
      t.className = "gtot";
      t.textContent = sum(game[side + "_q"]);
      el.appendChild(t);
    });
  }

  function pinLabel(v) { return v == null ? "\u2014" : String(v); }

  function render() {
    var game = g();
    if (!game) {
      game = newGame();
      state.games.unshift(game);
      state.active = game.id;
      save();
    }
    $("away").value = game.away;
    $("home").value = game.home;
    $("site").value = game.site;
    $("qlen").value = game.qlen;
    $("away_top").value = game.away_top;
    $("home_top").value = game.home_top;
    $("away_nonoff_pts").value = game.away_nonoff_pts;
    $("home_nonoff_pts").value = game.home_nonoff_pts;
    $("away-nm").textContent = game.away || "AWAY";
    $("home-nm").textContent = game.home || "HOME";
    $("away-pt").textContent = sum(game.away_q);
    $("home-pt").textContent = sum(game.home_q);
    ["away_plays", "home_plays", "away_to", "home_to",
     "away_pass_td", "away_rush_td", "away_fg",
     "home_pass_td", "home_rush_td", "home_fg",
     "away_nonoff_td", "home_nonoff_td"].forEach(function (k) {
      $(k).textContent = pinLabel(game.pins[k]);
    });
    renderChips();
    renderGrid(game);
    var log = $("log");
    if (!game.log.length) log.textContent = "No scores yet.";
    else log.innerHTML = game.log.slice().reverse().map(function (x) {
      return "<div>" + x.q + " " + x.side.toUpperCase() + " +" + x.pts + " " + x.tag + " \u2192 " + x.after + "</div>";
    }).join("");
  }

  function bindFields() {
    ["away", "home", "site", "qlen", "away_top", "home_top", "away_nonoff_pts", "home_nonoff_pts"].forEach(function (id) {
      $(id).addEventListener("input", function () {
        var game = g(); if (!game) return;
        game[id] = $(id).value;
        game.updated = Date.now();
        save(); renderChips();
        $("away-nm").textContent = game.away || "AWAY";
        $("home-nm").textContent = game.home || "HOME";
      });
    });
  }

  function addPts(pts, tag) {
    var game = g(); if (!game) return;
    var side = state.aim.side;
    var qi = state.aim.q;
    game[side + "_q"][qi] += pts;
    var after = sum(game[side + "_q"]);
    game.log.push({
      t: Date.now(),
      side: side,
      q: QLAB[qi],
      pts: pts,
      tag: tag,
      after: after
    });
    if (tag === "FG") game.pins[side + "_fg"] = (game.pins[side + "_fg"] || 0) + 1;
    game.updated = Date.now();
    save();
    render();
    show(QLAB[qi] + " " + (side === "away" ? (game.away || "AWAY") : (game.home || "HOME")) + " +" + pts);
  }

  document.querySelectorAll("[data-add]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      addPts(Number(btn.getAttribute("data-add")), btn.getAttribute("data-tag"));
    });
  });

  $("undo").onclick = function () {
    var game = g(); if (!game || !game.log.length) return;
    var last = game.log.pop();
    var qi = QLAB.indexOf(last.q);
    if (qi >= 0 && qi < 5) {
      game[last.side + "_q"][qi] = Math.max(0, game[last.side + "_q"][qi] - last.pts);
    }
    if (last.tag === "FG") {
      var k = last.side + "_fg";
      game.pins[k] = Math.max(0, (game.pins[k] || 0) - 1);
    }
    save(); render(); show("Undid +" + last.pts);
  };

  $("zero-q").onclick = function () {
    var game = g(); if (!game) return;
    var side = state.aim.side;
    var qi = state.aim.q;
    var old = game[side + "_q"][qi];
    game[side + "_q"][qi] = 0;
    game.log.push({ t: Date.now(), side: side, q: QLAB[qi], pts: -old, tag: "ZERO", after: sum(game[side + "_q"]) });
    save(); render();
  };

  document.querySelectorAll("[data-step]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var game = g(); if (!game) return;
      var k = btn.getAttribute("data-step");
      var d = Number(btn.getAttribute("data-d"));
      var cur = game.pins[k];
      if (cur == null) cur = 0;
      cur = Math.max(0, cur + d);
      game.pins[k] = cur;
      save(); render();
    });
  });

  $("new-game").onclick = function () {
    var game = newGame();
    state.games.unshift(game);
    state.active = game.id;
    state.aim = { side: "away", q: 0 };
    save(); render(); show("New blank 6x2.");
  };
  $("dup").onclick = function () {
    var cur = g(); if (!cur) return;
    var copy = JSON.parse(JSON.stringify(cur));
    copy.id = uid();
    copy.away = (cur.away || "AWAY") + " copy";
    copy.updated = Date.now();
    state.games.unshift(copy);
    state.active = copy.id;
    save(); render();
  };
  $("del").onclick = function () {
    if (!confirm("Delete this game from the phone?")) return;
    state.games = state.games.filter(function (x) { return x.id !== state.active; });
    state.active = state.games[0] ? state.games[0].id : null;
    save(); render();
  };

  function clipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    var ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    return Promise.resolve();
  }
  $("copy").onclick = function () {
    var game = g(); if (!game) return;
    clipboard(line(game)).then(function () { show("Copied scoreline."); });
  };
  $("json").onclick = function () {
    var game = g(); if (!game) return;
    clipboard(JSON.stringify(ticketJSON(game), null, 2)).then(function () { show("Copied ticket JSON."); });
  };
  $("dl").onclick = function () {
    var game = g(); if (!game) return;
    var blob = new Blob([JSON.stringify(ticketJSON(game), null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (game.away || "away") + "_" + (game.home || "home") + "_box.json";
    a.click();
  };
  $("share").onclick = function () {
    var game = g(); if (!game) return;
    var text = line(game);
    if (navigator.share) navigator.share({ text: text }).catch(function () {});
    else clipboard(text).then(function () { show("Copied."); });
  };

  $("hide-install").onclick = function () {
    $("install").classList.add("hidden");
    try { localStorage.setItem("sythalax_boxpad_hideinstall", "1"); } catch (e) {}
  };
  if (localStorage.getItem("sythalax_boxpad_hideinstall")) $("install").classList.add("hidden");

  bindFields();
  load();
  if (!state.games.length) {
    var game = newGame();
    state.games = [game];
    state.active = game.id;
    save();
  }
  render();
})();
