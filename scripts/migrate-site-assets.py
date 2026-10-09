"""Upload byte-identical local media to a temporary, authenticated R2 importer."""
import concurrent.futures
import json
import os
import subprocess
import tempfile
import time
from pathlib import Path

manifest = Path('docs/evidence/r2-site-assets.json')
data = json.loads(manifest.read_text())
token = Path(os.environ['STUDIO_IMPORT_TOKEN_FILE']).read_text().strip()
origin = os.environ.get('STUDIO_IMPORT_URL', 'https://studio-asset-import.henrywithu.workers.dev')

def upload(item):
    if item['status'] == 'verified':
        return item
    # Keep credentials out of argv, logs and the repository.
    with tempfile.NamedTemporaryFile(mode='w', prefix='studio-upload-', dir='/tmp') as config:
        config.write('header = "Authorization: Bearer ' + token + '"\n')
        config.flush()
        for attempt in range(4):
            result = subprocess.run(['curl', '--silent', '--show-error', '--fail-with-body',
                '--max-time', '120', '--config', config.name, '--request', 'PUT',
                '--header', 'Content-Type: '+item['contentType'],
                '--header', 'X-Content-MD5: '+item['md5'],
                '--data-binary', '@public'+item['path'], origin+'/'+item['key']],
                capture_output=True, text=True)
            try:
                meta = json.loads(result.stdout)
                assert result.returncode == 0 and meta['bytes'] == item['bytes'] and meta['etag'] == item['md5']
                return {**item, 'status':'verified', 'etag':meta['etag']}
            except (ValueError, AssertionError, KeyError):
                if attempt == 3:
                    raise RuntimeError(item['path']+': '+result.stdout[:200]+' '+result.stderr[:200])
                time.sleep(attempt+1)

try:
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
        futures = {pool.submit(upload, item): i for i,item in enumerate(data['entries'])}
        done = 0
        for future in concurrent.futures.as_completed(futures):
            data['entries'][futures[future]] = future.result()
            done += 1
            if done % 100 == 0:
                manifest.write_text(json.dumps(data,indent=2)+'\n')
                print('Verified uploads:',done,'/',len(futures),flush=True)
finally:
    manifest.write_text(json.dumps(data,indent=2)+'\n')
print('All objects uploaded with matching size and MD5.',flush=True)
