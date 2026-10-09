import xml.etree.ElementTree as ET,urllib.request,concurrent.futures,json
from pathlib import Path
root=Path(__file__).resolve().parent.parent/'research/reference'
urls=[x.text for x in ET.parse(root/'sitemap.xml').iter() if x.tag.endswith('}loc')]
def fetch(url):
 name=url.removeprefix('https://thelinestudio.com/').replace('/','__') or 'home'
 p=root/'pages'/f'{name}.html';p.parent.mkdir(exist_ok=True)
 if p.exists():return
 try:p.write_bytes(urllib.request.urlopen(url,timeout=60).read())
 except Exception as e:print('FAIL',url,e)
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as e:list(e.map(fetch,urls))
(root/'routes.json').write_text(json.dumps(urls,indent=2));print('Fetched',len(urls),'routes')
