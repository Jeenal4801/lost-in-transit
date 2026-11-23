"""Generate browser conformance fixtures from the authoritative Python engine."""
import copy
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from engine import Airport
scenarios = {
 'missing27': [], 'restored': [('online', [2, True])],
 'rerouted': [('routing', [2, False])],
 'resilient': [('retries', 2), ('breaker', True)],
 'no_routes': [('routing', [i, False]) for i in range(3)],
}
fixtures=[]
for name, commands in scenarios.items():
 a=Airport()
 for action,value in commands: a.command(action,value)
 a.command('play')
 frames=[]
 while a.heap:
  a.tick()
  frames.append(copy.deepcopy(a.view()))
 fixtures.append(dict(name=name, commands=commands, frames=frames))
out=Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).resolve().parents[2]/'frontend/tests/parity.json'
out.write_text(json.dumps(fixtures,separators=(',',':')))
print(f'Generated {len(fixtures)} scenarios: {out.name}')

# Compact, canonical frame hashes retain full-frame conformance without shipping
# hundreds of megabytes of repeated trace snapshots. Never used by gameplay.
import hashlib
content=json.loads((Path(__file__).resolve().parents[2]/'shared/campaign.json').read_text())
def canonical(value):
 if isinstance(value,float) and value.is_integer(): return int(value)
 if isinstance(value,dict): return {k:canonical(v) for k,v in value.items()}
 if isinstance(value,list): return [canonical(v) for v in value]
 return value
campaign=[]
for m in content['missions']:
 if not m['playable']:continue
 for label,patch in [
  ('incident',{}),
  ('capacity',{'capacity':6,'queue_limit':24,'balance':True,'accelerated':True,'retries':1,'normalize_headers':True,'online':[True]*3}),
  ('headroom',{'capacity':8,'queue_limit':24,'balance':True,'accelerated':True,'retries':1,'normalize_headers':True,'online':[True]*3}),
  ('routing',{'capacity':8,'queue_limit':24,'balance':True,'routing':[True,False,True],'retries':1,'online':[True]*3})]:
  config={**content['base_architecture'],**m['starting_architecture_delta'],'scenario':m['workload'],**patch}
  a=Airport(config);a.command('play');hashes=[]
  while a.heap:
   a.tick()
   encoded=json.dumps(canonical(a.view()),sort_keys=True,separators=(',',':')).encode()
   hashes.append(hashlib.sha256(encoded).hexdigest())
  campaign.append({'id':m['id'],'label':label,'config':config,'hashes':hashes,'metrics':a.metrics()})
(out.parent/'campaign-parity.json').write_text(json.dumps(campaign,separators=(',',':')))
print(f'Generated {len(campaign)} campaign conformance runs')
