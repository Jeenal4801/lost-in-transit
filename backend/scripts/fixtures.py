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
