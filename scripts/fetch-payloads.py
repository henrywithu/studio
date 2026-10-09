import concurrent.futures,urllib.request,re,html
from pathlib import Path
root=Path(__file__).resolve().parent.parent/'research/reference';tasks={}
for p in (root/'pages').glob('*.html'):
 s=p.read_text()
 for u in re.findall(r'(?:href|data-src)="([^"]*(?:_payload.json|/_nuxt/)[^"]*)"',s):
  u=html.unescape(u)
  if '_payload.json' in u: dest=root/'payloads'/(p.stem+'.json')
  else: dest=root/u.lstrip('/').split('?')[0]
  if not dest.exists():tasks[u]=dest
for u in ['/fonts/DenimVF.woff2','/fonts/DenimVF.woff','/favicons/dark/favicon-32x32.png']:
 tasks[u]=Path(__file__).resolve().parent.parent/'public'/u.lstrip('/')
def fetch(item):
 u,dest=item
 try:
  data=urllib.request.urlopen('https://thelinestudio.com'+u,timeout=60).read();dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
 except Exception as e:print('FAIL',u,e)
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as ex:list(ex.map(fetch,tasks.items()))
print('Fetched',len(tasks),'payloads/resources')
