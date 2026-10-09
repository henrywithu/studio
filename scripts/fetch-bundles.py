import concurrent.futures,urllib.request,re,json
from pathlib import Path
from html.parser import HTMLParser
root=Path(__file__).resolve().parent.parent/'research/reference';base='https://thelinestudio.com'
class Parser(HTMLParser):
 def __init__(self):super().__init__();self.links=[];self.styles=[];self.mode='';self.body=False;self.text=[]
 def handle_starttag(self,t,a):
  d=dict(a)
  if t=='link' and d.get('href','').startswith('/_nuxt/'): self.links.append(d['href'])
  if t=='script' and d.get('src','').startswith('/_nuxt/'): self.links.append(d['src'])
  if t=='style':self.mode='style'
 def handle_endtag(self,t):
  if t=='style':self.mode=''
 def handle_data(self,d):
  if self.mode=='style':self.styles.append(d)
p=Parser();p.feed((root/'home.html').read_text());(root/'inline.css').write_text('\n'.join(p.styles))
seen=set();todo=set(p.links)
def fetch(u):
 try:
  data=urllib.request.urlopen(base+u,timeout=45).read();path=root/u.lstrip('/');path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data);return u,data.decode(errors='replace')
 except Exception as e:print('FAIL',u,str(e));return u,''
while todo:
 seen.update(todo)
 with concurrent.futures.ThreadPoolExecutor(max_workers=10) as ex:results=list(ex.map(fetch,todo))
 todo=set()
 for u,d in results:
  if u.endswith('.js'):
   todo.update('/_nuxt/'+x for x in re.findall(r'["\'](?:\./)?([^"\'/]+\.(?:js|css))["\']',d) if '/_nuxt/'+x not in seen)
 print('downloaded',len(seen),'next',len(todo))
(root/'bundle-inventory.json').write_text(json.dumps(sorted(seen),indent=2))
