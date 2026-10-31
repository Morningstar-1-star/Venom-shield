// ==UserScript==
// @name         Venom Core – Link Cleaner & Redirect Skipper
// @namespace    venom.core
// @version      1.0.0
// @description  Skips tracking redirect wrappers (Google, Bing, DuckDuckGo, Facebook, Instagram, YouTube, Steam, LinkedIn, Reddit, VK, Disqus, Slack, Outlook SafeLinks, LinkSynergy), strips tracking parameters, cleans links before you tap them.
// @match        http://*/*
// @match        https://*/*
// @run-at       document-start
// @noframes
// @grant        none
// (ugibypass handles these hosts itself; skipped here so scripts do not fight each other)
// @exclude      /^https?:\/\/([^/]*\.)?(exe\.io|exey\.io|exey\.app|exeygo\.com|exey\.go|exe-links\.com|exeo\.app|exego\.app|cuty\.io|cuttty\.com|ouo\.io|ouo\.press|uii\.io|ouo\.today|bc\.vc|bcvc\.xyz|bcvc\.live|bcvcgo\.xyz|tpi\.li|oii\.la|tei\.ai|tii\.ai|iir\.ai|oko\.sh)(:\d+)?\//i
// ==/UserScript==

(function () {
  'use strict';
  const host = h => h.replace(/^www\./, '').toLowerCase();
  const http = s => /^https?:\/\//i.test(s || '');
  const b64u = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return decodeURIComponent(escape(atob(s))); };

  // ---------- tracking parameter cleaner ----------
  const GLOBAL = /^(utm_[a-z0-9_]+|fbclid|gclid|gclsrc|dclid|gbraid|wbraid|msclkid|yclid|twclid|ttclid|igshid|mc_cid|mc_eid|_hsenc|_hsmi|mkt_tok|vero_id|oly_enc_id|oly_anon_id|ref_src|srsltid|wickedid|rb_clickid|_ga|_gl|__s|s_kwcid|ef_id)$/i;
  const SITE = [
    [/(^|\.)(youtube\.com|youtu\.be|spotify\.com)$/, /^(si|pp|feature)$/i],
    [/(^|\.)(x\.com|twitter\.com)$/, /^(s|t|ref_url)$/i],
    [/(^|\.)instagram\.com$/, /^igsh$/i],
    [/(^|\.)tiktok\.com$/, /^(_r|_t|is_from_webapp|sender_device|sender_web_id|checksum|refer|share_[a-z_]+)$/i],
    [/(^|\.)amazon\.[a-z.]+$/, /^(pf_rd_[a-z]+|pd_rd_[a-z]+|ascsubtag|linkcode|linkid|content-id|qid|sr|crid|sprefix|dib|dib_tag|th|psc|ref_|_encoding)$/i],
    [/(^|\.)reddit\.com$/, /^(\$deep_link|correlation_id|ref_campaign|ref_source|share_id|rdt|context)$/i],
    [/(^|\.)(facebook\.com|messenger\.com)$/, /^(ref|fref|__tn__|__cft__\[0\]|__cft__|comment_tracking|eid|hc_ref|mibextid|rdid|share_url)$/i],
    [/(^|\.)linkedin\.com$/, /^(trk|trkinfo|lipi|midtoken|midsig|trackingid|refid|originalsubdomain)$/i],
    [/(^|\.)aliexpress\.[a-z.]+$/, /^(spm|scm|scm_id|scm-url|pvid|algo_pvid|algo_exp_id|aff_[a-z_]+|sk|gps-id|cv|cn|dp|aff_fcid)$/i],
    [/(^|\.)google\.[a-z.]+$/, /^(ved|ei|sa|sxsrf|source|uact|sclient|oq|gs_lcrp|gs_lp|aqs|rlz|bih|biw|dpr|client)$/i]
  ];
  function clean(href) {
    let u; try { u = new URL(href, location.href); } catch (e) { return href; }
    if (!/^https?:$/.test(u.protocol) || !u.search) return href;
    const h = host(u.hostname), extra = (SITE.find(s => s[0].test(h)) || [])[1];
    if (/(^|\.)google\.[a-z.]+$/.test(h) && u.pathname === '/search') return href; // don't touch search itself
    let changed = false;
    for (const k of [...u.searchParams.keys()]) if (GLOBAL.test(k) || (extra && extra.test(k))) { u.searchParams.delete(k); changed = true; }
    return changed ? u.href : href;
  }

  // ---------- redirect wrapper unwrapping ----------
  const P = (u, k) => u.searchParams.get(k);
  const RULES = [
    [/^google\.[a-z.]+$/, u => u.pathname === '/url' && (P(u, 'q') || P(u, 'url'))],
    [/^bing\.com$/, u => { const a = u.pathname === '/ck/a' && P(u, 'u'); return a && /^a1/.test(a) ? b64u(a.slice(2)) : null; }],
    [/^duckduckgo\.com$/, u => u.pathname.startsWith('/l/') && P(u, 'uddg')],
    [/^(l|lm)\.facebook\.com$/, u => u.pathname === '/l.php' && P(u, 'u')],
    [/^l\.instagram\.com$/, u => P(u, 'u')],
    [/^youtube\.com$/, u => u.pathname === '/redirect' && P(u, 'q')],
    [/^steamcommunity\.com$/, u => u.pathname.startsWith('/linkfilter') && (P(u, 'u') || P(u, 'url'))],
    [/^linkedin\.com$/, u => u.pathname.startsWith('/safety/go') && P(u, 'url')],
    [/^vk\.com$/, u => u.pathname === '/away.php' && P(u, 'to')],
    [/^out\.reddit\.com$/, u => P(u, 'url')],
    [/^slack-redir\.net$/, u => P(u, 'url')],
    [/(^|\.)safelinks\.protection\.outlook\.com$/, u => P(u, 'url')],
    [/^click\.linksynergy\.com$/, u => P(u, 'murl')],
    [/^disq\.us$/, u => { let t = P(u, 'url'); if (!t) return null; const i = t.lastIndexOf(':'); if (i > 8 && !/[\/]/.test(t.slice(i + 1)) && t.length - i > 10) t = t.slice(0, i); return t; }]
  ];
  function unwrap(href) {
    let u; try { u = new URL(href, location.href); } catch (e) { return null; }
    if (!/^https?:$/.test(u.protocol)) return null;
    const h = host(u.hostname);
    for (const [re, fn] of RULES) {
      if (!re.test(h)) continue;
      let t; try { t = fn(u); } catch (e) { t = null; }
      if (t && http(t) && host(new URL(t).hostname) !== h) return t;
    }
    return null;
  }
  const fix = href => { const t = unwrap(href); return clean(t || href); };

  // ---------- 1. we landed on a wrapper page: skip it ----------
  const dest = unwrap(location.href);
  if (dest) { location.replace(clean(dest)); return; }

  // ---------- 2. clean the address bar ----------
  try { const c = clean(location.href); if (c !== location.href) history.replaceState(history.state, '', c); } catch (e) {}

  // ---------- 3. fix links just before they are used ----------
  function handle(e) {
    const a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    if (a.hasAttribute('ping')) a.removeAttribute('ping');
    const h = a.href;
    if (!http(h)) return;
    const f = fix(h);
    if (f !== h) a.href = f;
  }
  ['touchstart', 'mousedown', 'click', 'auxclick', 'contextmenu', 'keydown'].forEach(ev => document.addEventListener(ev, handle, true));

  if (window.__VENOM_TEST) window.__venomCore = { clean, unwrap };
})();
