"""Deterministic discrete-event airport. No wall-clock time enters outcomes."""
import copy
import heapq
import math

TERMINAL = {'succeeded', 'http_error', 'timed_out', 'cancelled'}


class Airport:
    def __init__(self, config=None):
        self.config = copy.deepcopy(config or {
            'online': [True, True, False], 'routing': [True, True, True],
            'capacity': 4, 'queue_limit': 12, 'retries': 0, 'breaker': False,
        })
        self.time = 0.0
        self.running = False
        self.requests = {}
        self.events = []
        self.heap = []
        self.sequence = 0
        self.active = [0, 0, 0]
        self.queues = [[], [], []]
        self.failures = [0, 0, 0]
        self.open_circuits = [False, False, False]
        self.history = []
        self.replaying = None
        self.replay_playing = False
        self.baseline = None
        # A recorded traffic fixture, not an outcome fixture: 27 visits to gate C.
        self.manifest = [0, 1, 2] * 27 + [0, 1] * 9 + [0]
        for i, gate in enumerate(self.manifest):
            self.schedule(i * .12, 'create', i, gate)
        self.record()

    def schedule(self, when, kind, rid, gate=None):
        self.sequence += 1
        heapq.heappush(self.heap, (round(when, 5), self.sequence, kind, rid, gate))

    def emit(self, kind, r, **data):
        event = {'version': 1, 'seq': len(self.events), 'time': round(self.time, 3),
                 'kind': kind, 'id': r['id'], **data}
        self.events.append(event)
        r['trace'].append(event)

    def finish(self, r, status, code=None):
        if r['status'] in TERMINAL:
            return
        r.update(status=status, code=code, ended=self.time)
        self.emit('REQUEST_COMPLETED' if code else 'REQUEST_TIMED_OUT', r, status=status, code=code)

    def route(self, r):
        eligible = [i for i in range(3) if self.config['routing'][i] and not self.open_circuits[i]]
        if not eligible:
            self.schedule(self.time + .2, 'timeout', r['n'])
            return
        gate = r['preferred'] if r['preferred'] in eligible else eligible[r['n'] % len(eligible)]
        r.update(gate=gate, status='routing', stage_at=self.time)
        self.emit('SERVICE_SELECTED', r, gate=gate)
        self.schedule(self.time + .5, 'queue', r['n'], gate)

    def start(self, r, gate):
        self.active[gate] += 1
        r.update(status='processing', stage_at=self.time, started=self.time)
        self.emit('REQUEST_STARTED', r, gate=gate)
        self.schedule(self.time + .6 + (r['n'] % 4) * .08, 'complete', r['n'], gate)

    def process(self, kind, rid, gate):
        if kind == 'create':
            r = {'n': rid, 'id': f'REQ-{rid + 1:03}', 'status': 'created', 'preferred': gate,
                 'gate': None, 'created': self.time, 'stage_at': self.time, 'attempt': 0,
                 'method': 'GET', 'destination': '/api/departures', 'trace': [], 'code': None}
            self.requests[rid] = r
            self.emit('REQUEST_CREATED', r)
            self.schedule(self.time + .25, 'dns', rid)
            return
        r = self.requests[rid]
        if r['status'] in TERMINAL:
            return
        if kind == 'dns':
            r.update(status='security', stage_at=self.time)
            self.emit('DNS_RESOLVED', r)
            self.schedule(self.time + .25, 'tls', rid)
        elif kind == 'tls':
            self.emit('TLS_ESTABLISHED', r)
            self.route(r)
        elif kind == 'queue':
            if not self.config['online'][gate]:
                r.update(status='waiting', stage_at=self.time)
                self.emit('CONNECTION_PENDING', r, gate=gate)
                self.schedule(self.time + 2, 'timeout', rid, gate)
            elif self.active[gate] < self.config['capacity']:
                self.start(r, gate)
            elif len(self.queues[gate]) < self.config['queue_limit']:
                self.queues[gate].append(rid)
                r.update(status='queued', stage_at=self.time)
                self.emit('REQUEST_QUEUED', r, gate=gate)
            else:
                self.finish(r, 'http_error', 503)
        elif kind == 'complete':
            self.active[gate] -= 1
            if self.config['online'][gate]:
                self.finish(r, 'succeeded', 200)
            else:
                self.schedule(self.time + 2, 'timeout', rid, gate)
                r.update(status='waiting', stage_at=self.time)
            if self.queues[gate]:
                self.schedule(self.time, 'queue', self.queues[gate].pop(0), gate)
        elif kind == 'timeout':
            if gate is not None:
                self.failures[gate] += 1
                if self.config['breaker'] and self.failures[gate] >= 3 and not self.open_circuits[gate]:
                    self.open_circuits[gate] = True
                    self.emit('CIRCUIT_OPENED', r, gate=gate)
            if r['attempt'] < self.config['retries']:
                r['attempt'] += 1
                r.update(status='retrying', stage_at=self.time)
                self.emit('REQUEST_RETRIED', r)
                self.schedule(self.time + .4 * 2 ** (r['attempt'] - 1), 'retry', rid)
            else:
                self.finish(r, 'timed_out')
        elif kind == 'retry':
            self.route(r)

    def advance(self, dt=.1):
        target = round(self.time + dt, 5)
        while self.heap and self.heap[0][0] <= target:
            self.time, _, kind, rid, gate = heapq.heappop(self.heap)
            self.process(kind, rid, gate)
        self.time = target
        if not self.heap:
            self.running = False
        self.record()

    def metrics(self):
        rows = list(self.requests.values())
        latencies = sorted((r['ended'] - r['created']) * 1000 for r in rows if 'ended' in r)
        percentile = lambda p: round(latencies[min(len(latencies) - 1, math.ceil(len(latencies) * p) - 1)]) if latencies else 0
        return {'created': len(rows), 'succeeded': sum(r['status'] == 'succeeded' for r in rows),
                'http_errors': sum(r['status'] == 'http_error' for r in rows),
                'transport_failures': sum(r['status'] == 'timed_out' for r in rows),
                'active': sum(r['status'] not in TERMINAL for r in rows),
                'queue': sum(map(len, self.queues)), 'retries': sum(r['attempt'] for r in rows),
                'rps': sum(r['created'] > self.time - 1 for r in rows),
                'p50': percentile(.5), 'p95': percentile(.95), 'p99': percentile(.99)}

    def state(self):
        return {'version': 1, 'time': round(self.time, 2), 'running': self.running,
                'done': not self.heap, 'requests': list(self.requests.values()),
                'events': self.events[-80:], 'metrics': self.metrics(), 'config': self.config,
                'gates': [{'id': i, 'online': self.config['online'][i], 'active': self.active[i],
                           'queue': len(self.queues[i]), 'failures': self.failures[i],
                           'circuit': self.open_circuits[i]} for i in range(3)]}

    def record(self):
        self.history.append(copy.deepcopy(self.state()))

    def view(self):
        s = copy.deepcopy(self.history[self.replaying]) if self.replaying is not None else self.state()
        s.update(replay=self.replaying, replayPlaying=self.replay_playing, frames=len(self.history), baseline=self.baseline)
        return s

    def tick(self):
        if self.replaying is not None:
            if self.replay_playing:
                self.replaying = min(self.replaying + 1, len(self.history) - 1)
                if self.replaying == len(self.history) - 1:
                    self.replay_playing = False
        elif self.running:
            self.advance()

    def command(self, action, value=None):
        if action == 'seek':
            self.running = False
            self.replay_playing = False
            self.replaying = max(0, min(int(value), len(self.history) - 1))
        elif action == 'live':
            self.replaying = None
            self.replay_playing = False
        elif action == 'play_replay':
            self.replay_playing = self.replaying is not None
        elif action == 'pause_replay':
            self.replay_playing = False
        elif action in {'reset', 'rerun'}:
            config = copy.deepcopy(self.config) if action == 'rerun' else None
            baseline = self.metrics() if action == 'rerun' else None
            self.__init__(config)
            self.baseline = baseline
            self.running = True
        elif self.replaying is not None:
            raise ValueError('Return to live before changing the simulation.')
        elif action == 'play':
            self.running = bool(self.heap)
        elif action == 'pause':
            self.running = False
        elif action == 'step':
            self.running = False
            if self.heap:
                self.time, _, kind, rid, gate = heapq.heappop(self.heap)
                self.process(kind, rid, gate)
                self.record()
        elif action in {'online', 'routing'}:
            gate, enabled = value
            if gate not in range(3) or not isinstance(enabled, bool):
                raise ValueError('Invalid gate setting')
            self.config[action][gate] = enabled
        elif action == 'retries':
            self.config['retries'] = max(0, min(3, int(value)))
        elif action == 'breaker':
            self.config['breaker'] = bool(value)
        else:
            raise ValueError('Unknown action')
