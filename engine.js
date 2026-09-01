/* SYTHALAX Script-Sim engine v0.5 */
(function (root) {
  "use strict";
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(rng) {
    var u = Math.max(rng(), 1e-12), v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function clip(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  function parseClock(s) {
    if (s == null || s === "") return null;
    if (typeof s === "number") return s;
    var m = String(s).trim().match(/^(\d+):(\d{2})$/);
    if (!m) return null;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  }
  function fmtClock(sec) {
    if (sec == null || !isFinite(sec)) return "—";
    sec = Math.round(sec);
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ":" + String(s).padStart(2, "0");
  }
  function epFirst(yl) {
    yl = clip(yl, 1, 99);
    if (yl <= 20) return -0.2 + 0.03 * yl;
    if (yl <= 50) return 0.4 + 0.042 * (yl - 20);
    if (yl <= 80) return 1.66 + 0.05 * (yl - 50);
    return 3.16 + 0.12 * (yl - 80);
  }
  function epState(yl, down, dist) {
    var base = epFirst(yl), adj = 0;
    if (down === 2) adj = dist <= 7 ? -0.12 : -0.4;
    else if (down === 3) adj = dist <= 3 ? -0.25 : dist <= 7 ? -0.75 : -1.2;
    else if (down === 4) adj = dist <= 2 ? -0.25 : -2.0;
    return base + adj;
  }
  function partitionQuarter(pts) {
    var ev = [], left = pts;
    while (left >= 8 && ev.length < 6) { ev.push("TD"); left -= 7; }
    if (left === 6) { ev.push("TD6"); left = 0; }
    while (left >= 3 && ev.length < 8) { ev.push("FG"); left -= 3; }
    if (left === 2) ev.push("SAFETY");
    if (!ev.length && pts === 0) return [];
    if (!ev.length) ev.push("FG");
    return ev;
  }
  function eventsFromQuarters(q) {
    var out = [];
    for (var i = 0; i < 4; i++) {
      partitionQuarter(q[i] || 0).forEach(function (e) { out.push({ q: i + 1, type: e }); });
    }
    return out;
  }
  function priorPlays(pts, qLen, rng) {
    var mu, sd, lo, hi;
    if (pts >= 35) { mu = 72; sd = 8; lo = 52; hi = 105; }
    else if (pts >= 24) { mu = 66; sd = 8; lo = 48; hi = 95; }
    else if (pts >= 14) { mu = 60; sd = 7; lo = 42; hi = 85; }
    else { mu = 52; sd = 7; lo = 36; hi = 75; }
    if (qLen === 15) { mu = Math.round(mu * 1.5); lo = Math.round(lo * 1.4); hi = Math.round(hi * 1.45); sd = Math.round(sd * 1.3); }
    return clip(Math.round(mu + sd * gauss(rng)), lo, hi);
  }
  function splitPlays(nPlays, nDrives, rng) {
    var base = [], i;
    for (i = 0; i < nDrives; i++) base.push(1);
    var left = nPlays - nDrives;
    while (left > 0) {
      var open = [];
      for (i = 0; i < nDrives; i++) if (base[i] < 14) open.push(i);
      if (!open.length) break;
      base[open[Math.floor(rng() * open.length)]] += 1;
      left--;
    }
    return base;
  }
  function genGains(n, need, rng) {
    if (n <= 1) return [need];
    var raw = [], i;
    for (i = 0; i < n; i++) {
      var u = rng(), g;
      if (u < 0.12) g = [-4, -2, -1, 0, 0][Math.floor(rng() * 5)];
      else if (u < 0.8) g = Math.max(-3, 4.8 + 3.2 * gauss(rng));
      else if (u < 0.93) g = Math.max(8, 13 + 4 * gauss(rng));
      else g = Math.max(16, 26 + 9 * gauss(rng));
      raw.push(g);
    }
    raw[Math.floor(rng() * n)] += need - raw.reduce(function (a, b) { return a + b; }, 0);
    for (i = 0; i < n; i++) raw[i] = clip(raw[i], -12, 70);
    raw[n - 1] += need - raw.reduce(function (a, b) { return a + b; }, 0);
    return raw;
  }
  function drivePlays(outcome, n, start, rng) {
    var yl = start, down = 1, dist = 10, gains;
    if (outcome === "TD" || outcome === "TD6" || outcome === "TD2") {
      gains = genGains(n, 100 - start + 0.4, rng);
      var run = start;
      for (var i = 0; i < gains.length - 1; i++) {
        if (run + gains[i] >= 99) gains[i] = Math.max(0, 98 - run);
        run += gains[i];
      }
      gains[gains.length - 1] = 100 - run + 0.3;
    } else if (outcome === "FG") {
      gains = genGains(n, 75 + rng() * 16 - start, rng);
    } else if (outcome === "SAFETY") {
      gains = genGains(Math.max(1, n), 6 - start, rng);
    } else {
      var end = clip(start + Math.max(-4, 11 + 11 * gauss(rng)), 1, 99);
      if (end > 60) end = 32 + rng() * 23;
      gains = genGains(n, end - start, rng);
    }
    var plays = [];
    for (var j = 0; j < gains.length; j++) {
      var g = gains[j], ep0 = epState(yl, down, dist), last = j === gains.length - 1, ep1, success, expl = g >= 15;
      if ((outcome === "TD" || outcome === "TD6" || outcome === "TD2") && last) {
        ep1 = outcome === "TD2" ? 7.85 : outcome === "TD6" ? 6.0 : 6.95; success = true;
      } else if (outcome === "FG" && last) {
        ep1 = 3.0; success = true;
      } else if (outcome === "SAFETY" && last) {
        ep1 = 2.0; success = false; expl = false;
      } else {
        if (g >= dist) { down = 1; dist = 10; yl = clip(yl + g, 1, 99); }
        else { down = Math.min(4, down + 1); dist = Math.max(0.5, dist - g); yl = clip(yl + g, 1, 99); }
        ep1 = epState(yl, down, dist); success = g >= 4;
      }
      plays.push({ g: g, success: success, expl: expl, epa: ep1 - ep0 });
    }
    return plays;
  }
  function simulateSide(ptsOff, events, nPlays, nDrives, rng) {
    var slots = events.slice();
    while (slots.length < nDrives) slots.push({ q: 1 + Math.floor(rng() * 4), type: "PUNT" });
    var nList = splitPlays(nPlays, nDrives, rng), all = [];
    for (var i = 0; i < nDrives; i++) {
      all = all.concat(drivePlays(slots[i].type, nList[i], clip(27 + 8 * gauss(rng), 8, 55), rng));
    }
    while (all.length < nPlays) all.push({ g: 3, success: false, expl: false, epa: -0.15 });
    all = all.slice(0, nPlays);
    var yards = 0, epa = 0, sr = 0, expl = 0;
    for (var k = 0; k < all.length; k++) {
      yards += all[k].g; epa += all[k].epa;
      if (all[k].success) sr += 1;
      if (all[k].expl) expl += 1;
    }
    return { plays: nPlays, drives: nDrives, yards: yards, ypp: yards / nPlays, epa: epa / nPlays, sr: sr / nPlays, expl: expl / nPlays, ppd_off: ptsOff / nDrives, ppd_print: null };
  }
  function quantile(xs, p) {
    if (!xs.length) return NaN;
    var ys = xs.slice().sort(function (a, b) { return a - b; });
    var i = (ys.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i);
    if (lo === hi) return ys[lo];
    return ys[lo] * (hi - i) + ys[hi] * (i - lo);
  }
  function summarize(rows, key) {
    var xs = rows.map(function (r) { return r[key]; }).filter(function (x) { return x != null && isFinite(x); });
    if (!xs.length) return { p10: NaN, p50: NaN, p90: NaN, mean: NaN };
    return { p10: quantile(xs, 0.1), p50: quantile(xs, 0.5), p90: quantile(xs, 0.9), mean: xs.reduce(function (a, b) { return a + b; }, 0) / xs.length };
  }
  function offPoints(printed, pins, side) {
    var nonTd = (pins && pins[side + "_nonoff_td"]) || 0;
    var nonPts = (pins && pins[side + "_nonoff_pts"]) || 0;
    if (nonTd < 0) nonTd = 0;
    if (nonPts < 0) nonPts = 0;
    if (nonPts) return Math.max(0, printed - nonPts);
    if (nonTd) return Math.max(0, printed - 6 * nonTd);
    return printed;
  }
  function calibOk(row, obs) {
    if (!obs) return true;
    if (obs.ypp != null && Math.abs(row.ypp - obs.ypp) > (obs.ypp_tol || 0.85)) return false;
    if (obs.plays != null && Math.abs(row.plays - obs.plays) > (obs.plays_tol || 6)) return false;
    return true;
  }
  function run(input) {
    var seed = input.seed == null ? Date.now() : input.seed;
    var rng = mulberry32(seed >>> 0);
    var nAccept = input.draws || 800;
    var qLen = input.qLen === 15 ? 15 : 10;
    var clockSec = qLen * 4 * 60;
    var pins = input.pins || {};
    var homePrint = (input.home_q || [0, 0, 0, 0]).reduce(function (a, b) { return a + b; }, 0);
    var awayPrint = (input.away_q || [0, 0, 0, 0]).reduce(function (a, b) { return a + b; }, 0);
    var homeOff = offPoints(homePrint, pins, "home");
    var awayOff = offPoints(awayPrint, pins, "away");
    var homeEv = eventsFromQuarters(input.home_q);
    var awayEv = eventsFromQuarters(input.away_q);
    var pinHP = pins.home_plays, pinAP = pins.away_plays;
    var pinHT = parseClock(pins.home_top), pinAT = parseClock(pins.away_top);
    var obsH = { ypp: pins.home_ypp, plays: pinHP };
    var obsA = { ypp: pins.away_ypp, plays: pinAP };
    var calib = !!input.calibration;
    var accH = [], accA = [], tries = 0, maxTry = nAccept * 30;
    while (accH.length < nAccept && tries < maxTry) {
      tries += 1;
      var hp = pinHP || priorPlays(homeOff, qLen, rng);
      var ap = pinAP || priorPlays(awayOff, qLen, rng);
      var hd = Math.max(homeEv.length + 2, 8 + Math.floor(rng() * 6));
      var ad = Math.max(awayEv.length + 2, 8 + Math.floor(rng() * 6));
      var h = simulateSide(homeOff, homeEv, hp, hd, rng);
      var a = simulateSide(awayOff, awayEv, ap, ad, rng);
      h.ppd_print = homePrint / h.drives; a.ppd_print = awayPrint / a.drives;
      if (h.ypp < 3.0 || h.ypp > 9.4 || a.ypp < 3.0 || a.ypp > 9.4) continue;
      if (calib && (!calibOk(h, obsH) || !calibOk(a, obsA))) continue;
      accH.push(h); accA.push(a);
    }
    function pack(rows, printed, off, pinPlays, pinTop) {
      var sm = {
        plays: summarize(rows, "plays"), drives: summarize(rows, "drives"),
        ypp: summarize(rows, "ypp"), epa: summarize(rows, "epa"),
        sr: summarize(rows, "sr"), expl: summarize(rows, "expl"),
        ppd_off: summarize(rows, "ppd_off"), ppd_print: summarize(rows, "ppd_print"),
        yards: summarize(rows, "yards")
      };
      var playsP50 = sm.plays.p50;
      sm.top = pinTop;
      sm.sec_per_play = pinTop && playsP50 ? pinTop / playsP50 : null;
      sm.pts_print = printed; sm.pts_off = off;
      sm.pin_plays = pinPlays || null; sm.pin_top = pinTop || null;
      return sm;
    }
    return {
      accepted: accH.length, tries: tries, seed: seed, qLen: qLen, clockSec: clockSec, calibration: calib,
      home: pack(accH, homePrint, homeOff, pinHP, pinHT),
      away: pack(accA, awayPrint, awayOff, pinAP, pinAT),
      homePrint: homePrint, awayPrint: awayPrint, homeOff: homeOff, awayOff: awayOff
    };
  }
  root.ScriptSim = { run: run, parseClock: parseClock, fmtClock: fmtClock, version: "0.5" };
})(window);
