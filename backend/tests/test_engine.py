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


def test_campaign_scenarios_have_distinct_repairs_within_budget():
    import json
    from pathlib import Path
    content = json.loads((Path(__file__).resolve().parents[2] / 'shared/campaign.json').read_text())
    alternatives = {
        'A01': dict(routing=[True, True, False], capacity=4),
        'A02': dict(routing=[True, False, True], capacity=6),
        'A03': dict(routing=[True, True, False], capacity=4),
        'A04': dict(routing=[True, False, True], capacity=6),
        'B01': dict(capacity=8, queue_limit=24, balance=True),
        'B02': dict(capacity=10, queue_limit=24, balance=True),
        'B03': dict(capacity=10, queue_limit=24, balance=True),
        'S01': dict(capacity=8, queue_limit=24, balance=True, accelerated=True, retries=1, normalize_headers=True),
    }
    for m in content['missions']:
        if not m['playable']:
            continue
        config = {**content['base_architecture'], **m['starting_architecture_delta'], 'scenario': m['workload'], **alternatives[m['id']]}
        a = finish(Airport(config))
        assert a.metrics()['succeeded'] == 100, m['id']
        assert a.metrics()['p95'] <= m['completion_conditions']['p95'], m['id']
        operating_cost = config['capacity'] * sum(config['routing']) + (8 if config.get('accelerated') else 0) + (2 if config.get('balance') else 0) + (2 if config.get('normalize_headers') else 0) + (config['queue_limit']+7)//8 + config['retries']*2
        assert operating_cost <= m['completion_conditions']['max_cost'], m['id']


def test_campaign_configure_and_reset_preserve_replay_isolation():
    a = Airport()
    config = dict(online=[True]*3, routing=[True]*3, capacity=4, queue_limit=12, retries=1, breaker=False,
                  scenario=dict(interval=.03, service=[.6]*3, seed=43, transient=2))
    a.command('configure', config)
    finish(a)
    assert any(e['kind'] == 'REQUEST_RETRIED' for e in a.events)
    a.command('seek', 1)
    historical = a.view()
    a.command('live')
    a.command('configure', config)
    assert not a.running and not a.requests
    assert historical['requests']


def test_configure_rejects_malformed_workloads():
    import pytest
    a = Airport()
    original = copy.deepcopy(a.config)
    for patch in [dict(capacity=1.5), dict(scenario={'interval': -1}), dict(scenario={'service': [0, 1, 2]}), dict(scenario={'transient': 9})]:
        with pytest.raises(ValueError):
            a.command('configure', {**original, **patch})
        assert a.config == original


def test_procedural_counts_payload_integrity_and_dependency_isolation():
    config=dict(online=[True]*3,routing=[True]*3,capacity=8,queue_limit=24,retries=1,breaker=False,balance=True,accelerated=True,
                scenario=dict(count=80,interval=.04,corruption=1,dependency=2,outage_start=1.2,outage_end=2.2,seed=27))
    broken=finish(Airport(config))
    restored=finish(Airport({**config,'validate_payload':True,'isolate':True}))
    assert len(restored.requests)==80
    assert restored.metrics()['correct']==restored.metrics()['succeeded']==80
    assert broken.metrics()['correct'] < broken.metrics()['succeeded']
    assert broken.metrics()['retries'] > restored.metrics()['retries']
    assert any(e['kind']=='DEPENDENCY_UNAVAILABLE' for e in broken.events)


def test_procedural_boundaries_rejected_without_mutating_live_state():
    import pytest
    a=Airport()
    original=copy.deepcopy(a.config)
    for scenario in [dict(count=0),dict(count=161),dict(count=80.5),dict(dependency=3),dict(corruption=-1),dict(outage_start=-1)]:
        with pytest.raises(ValueError):a.command('configure',{**original,'scenario':scenario})
        assert a.config==original
