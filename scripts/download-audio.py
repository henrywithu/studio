"""Fetch original podcast preview audio without changing encoding."""
from pathlib import Path
import json,hashlib,urllib.request,concurrent.futures
root=Path(__file__).resolve().parent.parent
urls=[]
def walk(n):
 if not isinstance(n,dict):return
 if n.get('attrs',{}).get('data-audio','').startswith('https://'):urls.append(n['attrs']['data-audio'])
 for c in n.get('children',[]):walk(c)
for section in json.loads((root/'public/content/podcast.json').read_text())['sections']:walk(section)
aliases=json.loads((root/'research/audio-aliases.json').read_text()) if (root/'research/audio-aliases.json').exists() else {}
def fetch(url):
 dest=root/'public/audio'/(hashlib.sha256(url.encode()).hexdigest()[:16]+'.mp3');dest.parent.mkdir(exist_ok=True)
 try:
  if not dest.exists():dest.write_bytes(urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Referer':'https://thelinestudio.com/'}),timeout=60).read())
  aliases[url]='/audio/'+dest.name
 except Exception as e:print('FAIL',url,str(e))
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:list(pool.map(fetch,set(urls)))
(root/'research/audio-aliases.json').write_text(json.dumps(aliases,indent=2));print('Downloaded',len(aliases),'audio previews')
