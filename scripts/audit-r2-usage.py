"""Read-only audit of owned R2 objects against every deployed content and code reference."""
import collections
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
site = json.loads((ROOT/'docs/evidence/r2-site-assets.json').read_text())
videos = json.loads((ROOT/'docs/evidence/r2-videos.json').read_text())
legacy = json.loads((ROOT/'workers/site/local-media.json').read_text())
mapping = {e['path']:e['key'] for e in site['entries']+legacy}
references = collections.defaultdict(set)


def scan(value, source):
    if isinstance(value, str):
        for path in re.findall(r'/(?:assets|media|audio|images)/[A-Za-z0-9/_.-]+\.(?:webp|svg|png|jpg|jpeg|mp4|mp3)', value):
            if path in mapping:
                references[mapping[path]].add(source)
        for key in re.findall(r'https://studio-media\.henrywithu\.workers\.dev/(videos/[A-Za-z0-9/_-]+\.mp4|site/(?:assets|media|audio|images)/[A-Za-z0-9/_.-]+\.(?:webp|svg|png|jpg|jpeg|mp4|mp3))', value):
            references[key].add(source)
    elif isinstance(value, dict):
        for item in value.values():
            scan(item, source)
    elif isinstance(value, list):
        for item in value:
            scan(item, source)


for path in (ROOT/'public/content').glob('*.json'):
    content = json.loads(path.read_text())
    # Provenance-only `meta` records are not rendered or consumed by the application.
    scan(content.get('sections',content) if isinstance(content,dict) else content, str(path.relative_to(ROOT)))
scan(json.loads((ROOT/'src/content/chrome.json').read_text()),'src/content/chrome.json')
for path in (ROOT/'src').rglob('*'):
    if path.is_file() and path.suffix in ['.ts','.tsx','.css']:
        scan(path.read_text(),str(path.relative_to(ROOT)))
for entry in legacy:
    references[entry['key']].add('documented legacy compatibility URL')
entries = site['entries'] + videos['entries']
active = [e for e in entries if e['key'] in references]
missing = [e['key'] for e in active if e['status'] != 'verified']
assert not missing, f'Runtime references retired/deleted media: {missing}'
unused = [e for e in entries if e['key'] not in references and e['status'] != 'deleted']
report = {
    'activeObjects':len(active), 'activeBytes':sum(e['bytes'] for e in active),
    'unusedObjects':len(unused), 'unusedBytes':sum(e['bytes'] for e in unused),
    'unused':[{k:e[k] for k in ['key','bytes','status']} for e in unused],
    'references':{key:sorted(sources) for key,sources in sorted(references.items())},
}
(ROOT/'docs/evidence/r2-usage.json').write_text(json.dumps(report,indent=2)+'\n')
print({k:v for k,v in report.items() if k not in ['unused','references']})
