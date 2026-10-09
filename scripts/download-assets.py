"""Fetch the exact image crops listed by the extraction; safe to rerun."""
import concurrent.futures,urllib.request,json,time,hashlib
from pathlib import Path
project=Path(__file__).resolve().parent.parent
manifest=json.loads((project/'research/assets-manifest.json').read_text())
failures=[]
def fetch(item):
 dest=project/item['path']
 if dest.exists():return
 for attempt in range(3):
  try:
   data=urllib.request.urlopen(urllib.request.Request(item['url'],headers={'User-Agent':'Mozilla/5.0','Referer':'https://thelinestudio.com/'}),timeout=60).read()
   dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data);return
  except Exception as error:
   if attempt==2:failures.append({'url':item['url'],'error':str(error)})
with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:
 for i,_ in enumerate(pool.map(fetch,manifest)):
  if i%200==0:print('assets',i,'/',len(manifest),flush=True)
(project/'research/asset-download-failures.json').write_text(json.dumps(failures,indent=2))
print('Complete;',len(failures),'failures',flush=True)
