import json,urllib.request,concurrent.futures,hashlib
from pathlib import Path
root=Path(__file__).resolve().parent.parent;data=json.loads((root/'public/content/home.json').read_text());sources=[]
def walk(n):
 if not isinstance(n,dict):return
 if n.get('tag')=='video' and n['attrs'].get('width')!='1':
  for key in ['data-src','data-src-small']:
   s=n['attrs'].get(key)
   if s and s.startswith('https://'):sources.append(s)
 for child in n.get('children',[]):walk(child)
for section in data['sections']:walk(section)
manifest=json.loads((root/'research/video-aliases.json').read_text()) if (root/'research/video-aliases.json').exists() else {}
def download(url):
 path='public/media/'+hashlib.sha256(url.encode()).hexdigest()[:16]+'.mp4';dest=root/path
 try:
  response=urllib.request.urlopen(url,timeout=60);size=int(response.headers.get('Content-Length',0))
  if size>48000000:print('STREAM large',size);return
  dest.parent.mkdir(exist_ok=True)
  total=0
  with dest.open('wb') as file:
   while chunk:=response.read(1024*1024):
    total+=len(chunk)
    if total>48000000:file.close();dest.unlink();return
    file.write(chunk)
  manifest[url]='/'+path.removeprefix('public/');print('video',dest.name,total,flush=True)
 except Exception as e:print('FAIL',str(e)[:100])
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(download,set(sources)))
(root/'research/video-aliases.json').write_text(json.dumps(manifest,indent=2))
