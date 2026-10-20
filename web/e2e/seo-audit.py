import re, sys, json, struct, urllib.request, html as H
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:3100'
PAGES = ['/', '/en', '/es', '/en/stays', '/es/estancias', '/en/rentals', '/es/rentas', '/en/sale', '/es/venta',
         '/en/stays/solea-5', '/es/estancias/solea-5', '/en/sale/sample-casa-venta', '/en/info/privacy', '/es/info/terms']
def get(url, raw=False, headers=None):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 seo-audit', **(headers or {})})
    with urllib.request.urlopen(req, timeout=30) as r:
        return (r.read() if raw else r.read().decode('utf-8', 'replace')), r.headers, r.geturl()
def jpeg_size(b):
    i = 2
    while i < len(b):
        if b[i] != 0xFF: i += 1; continue
        m = b[i + 1]
        if m in (0xC0, 0xC1, 0xC2): h, w = struct.unpack('>HH', b[i + 5:i + 9]); return w, h
        i += 2 + struct.unpack('>H', b[i + 2:i + 4])[0]
    return None
def meta(h, attr, name):
    m = re.search(r'<meta[^>]*%s="%s"[^>]*content="([^"]*)"' % (attr, re.escape(name)), h) or re.search(r'<meta[^>]*content="([^"]*)"[^>]*%s="%s"' % (attr, re.escape(name)), h)
    return H.unescape(m.group(1)) if m else None
total_issues = 0
for p in PAGES:
    issues = []
    try: h, hdr, final = get(BASE + p)
    except Exception as e: print(f'{p}: FETCH FAILED {e}'); continue
    t = H.unescape((re.search(r'<title>(.*?)</title>', h, re.S) or [None, ''])[1])
    d = meta(h, 'name', 'description'); canon = (re.search(r'rel="canonical" href="([^"]*)"', h) or [None, None])[1]
    ogt, ogd, ogu, ogi = (meta(h, 'property', k) for k in ('og:title', 'og:description', 'og:url', 'og:image'))
    tw = meta(h, 'name', 'twitter:card'); twi = meta(h, 'name', 'twitter:image'); robots = meta(h, 'name', 'robots')
    hl = re.findall(r'hrefLang="([^"]*)" href="([^"]*)"', h) or re.findall(r'hreflang="([^"]*)" href="([^"]*)"', h)
    h1 = re.findall(r'<h1[^>]*>(.*?)</h1>', h, re.S)
    lang = (re.search(r'<html[^>]*lang="([^"]*)"', h) or [None, None])[1]
    ld = []
    for b in re.findall(r'<script type="application/ld\+json">(.*?)</script>', h, re.S):
        try:
            x = json.loads(b.replace('\\u003c', '<')); ld += [i.get('@type') for i in (x if isinstance(x, list) else [x])]
        except Exception: issues.append('invalid JSON-LD')
    imgs = re.findall(r'<img[^>]*>', h); noalt = [i for i in imgs if ' alt=' not in i]
    # checks
    if not t: issues.append('no <title>')
    elif len(t) > 75: issues.append(f'title {len(t)} chars (>75)')
    elif len(t) < 15: issues.append(f'title short {len(t)}')
    if not d: issues.append('no meta description')
    elif not 70 <= len(d) <= 165: issues.append(f'description {len(d)} chars (want 70-165)')
    if not canon or not canon.startswith('https://'): issues.append(f'canonical missing/relative: {canon}')
    if not (ogt and ogd and ogu and ogi): issues.append(f'incomplete OG (title={bool(ogt)}, desc={bool(ogd)}, url={bool(ogu)}, image={bool(ogi)})')
    if tw != 'summary_large_image': issues.append(f'twitter:card={tw}')
    if not twi: issues.append('no twitter:image (relies on og:image fallback)')
    if len(h1) != 1: issues.append(f'{len(h1)} <h1> elements')
    if not hl or not any(k == 'x-default' for k, _ in hl) or any(not u.startswith('https://') for _, u in hl): issues.append(f'hreflang problem: {hl}')
    if not lang: issues.append('no html lang')
    if noalt: issues.append(f'{len(noalt)} <img> without alt')
    if canon and p != '/' and not canon.endswith(p.rstrip('/')): issues.append(f'canonical differs from path: {canon}')
    img_info = ''
    if ogi:
        try:
            b, ih, _ = get(ogi.replace('https://www.prop.bz', BASE), raw=True)  # audit the images of the site being tested
            ct = ih.get('content-type'); sz = jpeg_size(b) if b[:2] == b'\xff\xd8' else None
            img_info = f'{ct} {sz} {len(b)//1024}KB'
            if not ct or not ct.startswith('image/'): issues.append(f'og:image not an image ({ct})')
            if sz and sz != (1200, 630): issues.append(f'og:image size {sz}, want 1200x630')
            if len(b) > 300 * 1024: issues.append(f'og:image {len(b)//1024}KB (>300KB)')
            if (meta(h, 'property', 'og:image:width'), meta(h, 'property', 'og:image:height')) != ('1200', '630'): issues.append('og:image width/height tags missing')
            if not meta(h, 'property', 'og:image:alt'): issues.append('no og:image:alt')
        except Exception as e: issues.append(f'og:image fetch failed: {e}')
    total_issues += len(issues)
    print(f'\n{p}  [{final.replace(BASE, "") or "/"}]  robots={robots or "default"} jsonld={ld}')
    print(f'  title ({len(t)}): {t}'); print(f'  desc  ({len(d or "")}): {d}'); print(f'  og:image: {img_info}')
    print('  ISSUES: ' + ('none' if not issues else ''))
    for i in issues: print('   -', i)
print("\nTOTAL ISSUES", total_issues)
sys.exit(1 if total_issues else 0)
