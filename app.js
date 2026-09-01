(function () {
  "use strict";

  var presets = { games: [] };
  var lastResult = null;
  var acceptedLog = [];

  function $(id) { return document.getElementById(id); }

  function newSeed() {
    var s = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
    if (s < 1000) s += 20260000;
    setVal("seed", s);
    return s;
  }

  function num(id, fallback) {
    var el = $(id);
    if (!el || el.value === "") return fallback;
    var n = Number(el.value);
    return isFinite(n) ? n : fallback;
  }

  function val(id) {
    var el = $(id);
    return el ? el.value : "";
  }

  function setVal(id, v) {
    var el = $(id);
    if (el) el.value = v == null ? "" : v;
  }

  function fmt(n, d) {
    if (n == null || !isFinite(n)) return "—";
    return Number(n).toFixed(d);
  }

  function fmtPct(n) {
    if (n == null || !isFinite(n)) return "—";
    return (n * 100).toFixed(1) + "%";
  }

  function loadPresets() {
    return fetch("presets.json")
      .then(function (r) { return r.json(); })
      .then(function (j) {
        presets = j;
        var sel = $("preset");
        sel.innerHTML = '<option value="">— blank ticket —</option>';
        j.games.forEach(function (g) {
          var o = document.createElement("option");
          o.value = g.id;
          o.textContent = g.label;
          sel.appendChild(o);
        });
      })
      .catch(function () {
        $("status").textContent = "presets.json not loaded. Type the ticket yourself.";
      });
  }

  function applyPreset(id) {
    var g = presets.games.find(function (x) { return x.id === id; });
    if (!g) return;
    setVal("home", g.home);
    setVal("away", g.away);
    setVal("site", g.site || "home");
    setVal("qlen", g.clock === "60:00" ? "15" : "10");
    ["q1", "q2", "q3", "q4"].forEach(function (k, i) {
      setVal("home_" + k, g.home_q[i]);
      setVal("away_" + k, g.away_q[i]);
    });
    var p = g.pins || {};
    setVal("home_plays", p.home_plays);
    setVal("away_plays", p.away_plays);
    setVal("home_top", p.home_top);
    setVal("away_top", p.away_top);
    setVal("home_to", p.home_to);
    setVal("away_to", p.away_to);
    setVal("home_nonoff_td", p.home_nonoff_td);
    setVal("away_nonoff_td", p.away_nonoff_td);
    setVal("home_nonoff_pts", p.home_nonoff_pts);
    setVal("away_nonoff_pts", p.away_nonoff_pts);
    setVal("home_ypp", p.home_ypp);
    setVal("away_ypp", p.away_ypp);
    $("flags").innerHTML = "";
    (g.flags || []).forEach(function (f) {
      var li = document.createElement("li");
      li.textContent = f;
      $("flags").appendChild(li);
    });
    var tag = $("preset-tag");
    tag.className = "tag " + (g.tag === "OPERATED" ? "operated" : g.tag === "EA_SIM" ? "ea" : "shadow");
    tag.textContent = g.tag || "SHADOW";
    if (/ANOMALY/.test(g.label)) {
      tag.className = "tag anomaly";
      tag.textContent = "ANOMALY";
    }
    newSeed();
    lastResult = null;
    $("accept").disabled = true;
    $("status").textContent = "Preset loaded. New seed rolled. Hit RUN POSTERIOR.";
  }

  function readTicket() {
    function q(prefix) {
      return [num(prefix + "_q1", 0), num(prefix + "_q2", 0), num(prefix + "_q3", 0), num(prefix + "_q4", 0)];
    }
    function optNum(id) {
      return val(id) === "" ? null : num(id);
    }
    return {
      home: val("home") || "Home",
      away: val("away") || "Away",
      site: val("site"),
      home_q: q("home"),
      away_q: q("away"),
      qLen: Number(val("qlen") || 10),
      draws: num("draws", 800),
      seed: num("seed", Date.now()),
      calibration: $("calibration").checked,
      pins: {
        home_plays: optNum("home_plays"),
        away_plays: optNum("away_plays"),
        home_top: val("home_top") || null,
        away_top: val("away_top") || null,
        home_to: optNum("home_to"),
        away_to: optNum("away_to"),
        home_nonoff_td: optNum("home_nonoff_td"),
        away_nonoff_td: optNum("away_nonoff_td"),
        home_nonoff_pts: optNum("home_nonoff_pts"),
        away_nonoff_pts: optNum("away_nonoff_pts"),
        home_ypp: optNum("home_ypp"),
        away_ypp: optNum("away_ypp")
      }
    };
  }

  function renderSide(name, sm) {
    var rows = [
      ["Off plays", sm.plays, 0, sm.pin_plays ? "PIN" : "GEN"],
      ["Drives", sm.drives, 1, "GEN"],
      ["Yards / play", sm.ypp, 2, "GEN"],
      ["EPA / play", sm.epa, 3, "GEN"],
      ["Success rate", sm.sr, "pct", "GEN"],
      ["Explosive 15+", sm.expl, "pct", "GEN"],
      ["Off pts / drive", sm.ppd_off, 2, "USE THIS"],
      ["Printed pts / drive", sm.ppd_print, 2, "do not hang if non-off"],
      ["Total yards", sm.yards, 0, "GEN"]
    ];
    var html = rows.map(function (r) {
      var band = r[1];
      var p10 = r[2] === "pct" ? fmtPct(band.p10) : fmt(band.p10, r[2]);
      var p50 = r[2] === "pct" ? fmtPct(band.p50) : fmt(band.p50, r[2]);
      var p90 = r[2] === "pct" ? fmtPct(band.p90) : fmt(band.p90, r[2]);
      return "<tr><td>" + r[0] + "</td><td>" + p10 + "</td><td><b>" + p50 + "</b></td><td>" + p90 + "</td><td>" + r[3] + "</td></tr>";
    }).join("");
    var offNote = sm.pts_off !== sm.pts_print
      ? " · off " + sm.pts_off + " / printed " + sm.pts_print
      : " · " + sm.pts_print + " pts";
    return (
      '<div class="panel" style="margin-bottom:12px">' +
        "<h2>" + name + offNote +
          (sm.pin_top ? " · TOP " + ScriptSim.fmtClock(sm.top) : "") +
          (sm.sec_per_play ? " · " + fmt(sm.sec_per_play, 1) + " s/play" : "") +
        "</h2>" +
        "<table><thead><tr><th>Metric</th><th>p10</th><th>p50</th><th>p90</th><th></th></tr></thead>" +
        "<tbody>" + html + "</tbody></table></div>"
    );
  }

  function run() {
    var ticket = readTicket();
    $("status").textContent = "sampling…";
    $("out").innerHTML = "";
    $("accept").disabled = true;
    requestAnimationFrame(function () {
      var t0 = performance.now();
      var res = ScriptSim.run(ticket);
      lastResult = { ticket: ticket, result: res };
      var ms = Math.round(performance.now() - t0);
      var warn = res.accepted < ticket.draws ? " · short sample — loosen calibration pins or raise draws" : "";
      $("status").textContent =
        "accepted " + res.accepted + " / tries " + res.tries +
        " · seed " + res.seed +
        " · " + ms + " ms · " + res.qLen + ":00 quarters (" + (res.clockSec / 60) + ":00 game)" +
        (res.calibration ? " · CALIBRATION ON" : "") +
        " · SHADOW" + warn;
      $("scoreline").innerHTML =
        '<div><div class="team">' + ticket.away + '</div><div class="muted">' + ticket.away_q.join("-") + "</div></div>" +
        '<div class="pts">' + res.awayPrint + " – " + res.homePrint + "</div>" +
        '<div style="text-align:right"><div class="team">' + ticket.home + '</div><div class="muted">' + ticket.home_q.join("-") + "</div></div>";
      $("kpis").innerHTML =
        kpi("Seed", res.seed) +
        kpi("Clock", res.qLen + ":00 Q · " + (res.clockSec / 60) + ":00") +
        kpi("Off pts", res.awayOff + " – " + res.homeOff) +
        kpi("Calib", res.calibration ? "ON" : "off");
      $("out").innerHTML = renderSide(ticket.away, res.away) + renderSide(ticket.home, res.home);
      $("json-out").textContent = JSON.stringify(lastResult, null, 2);
      $("accept").disabled = res.accepted === 0;
    });
  }

  function kpi(k, v) {
    return '<div class="kpi"><div class="k">' + k + '</div><div class="v">' + v + "</div></div>";
  }

  function accept() {
    if (!lastResult) return;
    acceptedLog.push({
      at: new Date().toISOString(),
      seed: lastResult.result.seed,
      away: lastResult.ticket.away,
      home: lastResult.ticket.home,
      score: lastResult.result.awayPrint + "-" + lastResult.result.homePrint,
      off: lastResult.result.awayOff + "-" + lastResult.result.homeOff
    });
    $("accept-log").textContent = acceptedLog.map(function (x) {
      return x.at.slice(11, 19) + "  seed " + x.seed + "  " + x.away + " " + x.score.split("-")[0] + " " + x.home + " " + x.score.split("-")[1] + "  off " + x.off;
    }).join("\n");
    var old = lastResult.result.seed;
    newSeed();
    $("status").textContent = "Accepted seed " + old + ". New seed rolled for the next run. Ticket unchanged.";
    $("accept").disabled = true;
    lastResult = null;
  }

  function exportJson() {
    var blob = new Blob([$("json-out").textContent || "{}"], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "script_sim_ticket.json";
    a.click();
  }

  function clearTicket() {
    ["home", "away", "home_plays", "away_plays", "home_top", "away_top", "home_to", "away_to",
      "home_nonoff_td", "away_nonoff_td", "home_nonoff_pts", "away_nonoff_pts", "home_ypp", "away_ypp"].forEach(function (id) {
      setVal(id, "");
    });
    ["home_q1", "home_q2", "home_q3", "home_q4", "away_q1", "away_q2", "away_q3", "away_q4"].forEach(function (id) {
      setVal(id, 0);
    });
    $("flags").innerHTML = "";
    $("preset").value = "";
    $("preset-tag").textContent = "SHADOW";
    $("preset-tag").className = "tag shadow";
    $("calibration").checked = false;
    lastResult = null;
    $("accept").disabled = true;
    newSeed();
    $("status").textContent = "Ticket cleared. New seed rolled.";
  }

  document.addEventListener("DOMContentLoaded", function () {
    newSeed();
    loadPresets().then(function () {
      $("preset").addEventListener("change", function () {
        if (this.value) applyPreset(this.value);
        else newSeed();
      });
    });
    $("run").addEventListener("click", run);
    $("accept").addEventListener("click", accept);
    $("export").addEventListener("click", exportJson);
    $("clear").addEventListener("click", clearTicket);
    $("help-toggle").addEventListener("click", function () {
      $("howto").classList.toggle("open");
    });
  });
})();
