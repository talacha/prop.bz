"""Inlines the sample photos into home.template.html as data URIs -> home.html (self-contained design reference)."""
import base64, re, pathlib
here = pathlib.Path(__file__).parent
src = (here / 'home.template.html').read_text()
def sub(m):
    p = here / 'img' / f'{m.group(1)}.jpg'
    return 'data:image/jpeg;base64,' + base64.b64encode(p.read_bytes()).decode()
out = re.sub(r'\{\{IMG:(\w+)\}\}', sub, src)
(here / 'home.html').write_text(out)
print('home.html', round(len(out) / 1024), 'KB')
