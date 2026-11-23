import copy
from engine import Airport, TERMINAL
from fastapi.testclient import TestClient
from main import app


def finish(a):
    while a.heap:
        a.advance(.1)
    return a


def test_missing_27_is_caused_by_gate_fault():
    a = finish(Airport())
    assert a.metrics()['succeeded'] == 73
    assert a.metrics()['transport_failures'] == 27
    assert a.metrics()['http_errors'] == 0
    assert all(r['status'] in TERMINAL for r in a.requests.values())
    assert all(r['gate'] == 2 for r in a.requests.values() if r['status'] == 'timed_out')


def test_repair_and_reroute_both_recover():
    for action in ('online', 'routing'):
        a = Airport()
        a.command(action, [2, action == 'online'])
        finish(a)
        assert a.metrics()['succeeded'] == 100


def test_reproducible_event_order_and_replay():
    a, b = finish(Airport()), finish(Airport())
    assert a.events == b.events
    assert [e['time'] for e in a.events] == sorted(e['time'] for e in a.events)
    snapshot = copy.deepcopy(a.history[20])
    a.command('seek', 20)
    assert a.view()['requests'] == snapshot['requests']
    a.command('live')
    assert a.view()['done']


def test_retries_and_breaker():
    a = Airport()
    a.command('retries', 2)
    a.command('breaker', True)
    finish(a)
    assert any(e['kind'] == 'CIRCUIT_OPENED' for e in a.events)
    assert a.metrics()['retries'] > 0
    assert a.metrics()['succeeded'] == 100
    assert max(r['attempt'] for r in a.requests.values()) <= 2


def test_queue_overload_is_http_response():
    a = Airport()
    a.config.update(capacity=1, queue_limit=0, online=[True]*3, routing=[True, False, False])
    finish(a)
    assert a.metrics()['http_errors'] > 0
    assert a.metrics()['transport_failures'] == 0
    assert all(r['code'] == 503 for r in a.requests.values() if r['status'] == 'http_error')


def test_api_validation_and_websocket_resync():
    with TestClient(app) as c:
        assert c.post('/api/command', json={'action':'nonsense'}).status_code == 400
        assert c.post('/api/command', json={'action':'online','value':[7,True]}).status_code == 400
        assert c.get('/api/state').json()['version'] == 1
        with c.websocket_connect('/ws') as ws:
            assert ws.receive_json()['version'] == 1


def test_pause_step_and_baseline():
    a = Airport()
    a.command('step')
    assert len(a.requests) == 1
    assert not a.running
    finish(a)
    a.command('online', [2, True])
    a.command('rerun')
    assert a.baseline['succeeded'] == 73
    finish(a)
    assert a.metrics()['succeeded'] == 100


def test_replay_playback_does_not_mutate_live_outcome():
    a = finish(Airport())
    outcome = a.metrics()
    a.command('seek', 0)
    a.command('play_replay')
    a.tick()
    assert a.replaying == 1
    assert a.metrics() == outcome
    a.command('pause_replay')
    a.tick()
    assert a.replaying == 1
    a.command('live')
    assert a.view()['metrics'] == outcome


def test_step_consumes_exactly_one_scheduled_event_at_equal_timestamps():
    a = Airport()
    a.schedule(0, 'create', 101, 1)
    a.command('step')
    assert len(a.requests) == 1
    a.command('step')
    assert len(a.requests) == 2
    assert a.time == 0
    assert not a.running
