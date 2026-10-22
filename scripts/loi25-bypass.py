#!/usr/bin/env python3
"""
Loi 25 — temporary tracking bypass for testing (reversible).

  python3 scripts/loi25-bypass.py on  [YYYY-MM-DD]   # force analytics + ads tracking ON (tests)
  python3 scripts/loi25-bypass.py off                # restore normal consent gating (DEFAULT / compliant)
  python3 scripts/loi25-bypass.py status

While ON, every spot is tagged TEMP-BYPASS-LOI25 so it can be found and removed.
The giveaway server-side lead (hashed e-mail/phone) stays tied to the REAL consent in both modes.
After running, commit + push, wait for the Vercel deploy, then Cloudflare > Purge Everything.
"""
import glob, re, sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
MARK = "TEMP-BYPASS-LOI25"
JS_CONSENT = "assets/js/skines-consent.js"
ADS_REAL = ("    try { var c = window.skinesConsent && window.skinesConsent.get(); return !!(c && c.ads); }\n"
            "    catch (e) { return false; }\n")
ADS_FILES = ["assets/js/skines-meta-pixel.js", "assets/js/skines-capi.js",
             "assets/js/skines-tiktok-capi.js", "assets/js/skines-tiktok-pixel.js"]
VERS = ["skines-consent.js", "skines-meta-pixel.js", "skines-tiktok-pixel.js", "skines-capi.js", "skines-tiktok-capi.js"]
CONSENT_BLOCK = re.compile(r"(/\* TEMP-BYPASS-LOI25[^*]*\*/ )?gtag\('consent', 'default', \{.*?\}\);", re.S)
KEYS = r"(ad_storage|ad_user_data|ad_personalization|analytics_storage)"

def rd(p): return open(p, encoding="utf-8").read()
def wr(p, s): open(p, "w", encoding="utf-8").write(s)

def is_on():
    return MARK in rd(JS_CONSENT)

def bump(s):
    for name in VERS:
        s = re.sub(r"(%s\?v=)(\d+)" % re.escape(name), lambda m: m.group(1) + str(int(m.group(2)) + 1), s)
    return s

def html_files():
    return [f for f in sorted(glob.glob("*.html")) if "gtag('consent', 'default'" in rd(f)]

def turn_on(date):
    for f in html_files():
        s = rd(f)
        m = CONSENT_BLOCK.search(s)
        blk = re.sub(KEYS + r": 'denied'", r"\1: 'granted'", m.group(0))
        blk = re.sub(r"^/\* TEMP-BYPASS-LOI25[^*]*\*/ ", "", blk)
        s = s.replace(m.group(0), "/* %s (jusqu'au %s) : remettre 'denied' */ %s" % (MARK, date, blk), 1)
        wr(f, bump(s))
    s = rd(JS_CONSENT)
    anchor = "  function apply(c) {\n"
    assert anchor in s
    s = s.replace(anchor, anchor + "    // %s (jusqu'au %s) : tout est forcé à « accordé » — retirer ces 2 lignes\n"
                  "    c = Object.assign({}, c, { analytics: true, ads: true });\n" % (MARK, date), 1)
    wr(JS_CONSENT, s)
    for p in ADS_FILES:
        s = rd(p)
        a = "  function adsConsented() {\n"
        assert a in s
        s = s.replace(a, a + "    return true; // %s (jusqu'au %s) : retirer cette ligne\n" % (MARK, date), 1)
        wr(p, s)

def turn_off():
    for f in html_files():
        s = rd(f)
        m = CONSENT_BLOCK.search(s)
        blk = re.sub(KEYS + r": 'granted'", r"\1: 'denied'", m.group(0))
        blk = re.sub(r"^/\* TEMP-BYPASS-LOI25[^*]*\*/ ", "", blk)
        wr(f, bump(s.replace(m.group(0), blk, 1)))
    s = rd(JS_CONSENT)
    s = re.sub(r"    // TEMP-BYPASS-LOI25[^\n]*\n    c = Object\.assign\(\{\}, c, \{ analytics: true, ads: true \}\);\n", "", s, 1)
    wr(JS_CONSENT, s)
    for p in ADS_FILES:
        s = rd(p)
        s = re.sub(r"    return true; // TEMP-BYPASS-LOI25[^\n]*\n", "", s, 1)
        wr(p, s)

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "status"
    if cmd == "status":
        print("BYPASS ON (tracking forced)" if is_on() else "bypass OFF (consent gating active)")
    elif cmd == "on":
        if is_on(): sys.exit("already ON")
        import datetime
        date = sys.argv[2] if len(sys.argv) > 2 else (datetime.date.today() + datetime.timedelta(days=2)).isoformat()
        turn_on(date); print("bypass ON until", date, "— commit, push, wait deploy, purge Cloudflare")
    elif cmd == "off":
        if not is_on(): sys.exit("already OFF")
        turn_off(); print("bypass OFF — commit, push, wait deploy, purge Cloudflare")
    else:
        sys.exit(__doc__)
