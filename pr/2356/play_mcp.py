"""Capture real MCP messages and the host's rendered output. Run from repo root.

Build both binaries first. Live mode reads the same two Firebase secret
environment variables as the host; no credentials go in the capture.
"""
import argparse
import importlib.util
import json
import select
import tempfile
import time
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--inference', choices=['mock', 'live'], default='mock')
parser.add_argument('--out', type=Path, required=True)
args = parser.parse_args()
args.out.mkdir(parents=True, exist_ok=True)
root = Path.cwd()
spec = importlib.util.spec_from_file_location('session_test', root / 'tools/linux-host/test_mcp_session.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
origin = time.monotonic()
frames = []
wire = (args.out / 'mcp.jsonl').open('w')

class CaptureClient(module.Client):
    def __init__(self, save):
        super().__init__(save, inference=args.inference)
        self.last_revision = None
        self.rpc('initialize', {'protocolVersion': '2025-06-18', 'capabilities': {},
                 'clientInfo': {'name': 'rundale-evidence', 'version': '1'}})
        notice = {'jsonrpc': '2.0', 'method': 'notifications/initialized'}
        self.process.stdin.write((json.dumps(notice) + '\n').encode())
        self.process.stdin.flush()
        self.record('request', notice)

    def record(self, direction, message):
        wire.write(json.dumps({'seconds': round(time.monotonic()-origin, 3),
                   'direction': direction, 'message': message}, ensure_ascii=False) + '\n')
        wire.flush()

    def rpc(self, method, params):
        self.sequence += 1
        request = {'jsonrpc': '2.0', 'id': self.sequence, 'method': method, 'params': params}
        self.record('request', request)
        self.process.stdin.write((json.dumps(request, ensure_ascii=False) + '\n').encode())
        self.process.stdin.flush()
        if not select.select([self.process.stdout], [], [], 65)[0]:
            raise RuntimeError('MCP request timed out')
        response = json.loads(self.process.stdout.readline())
        self.record('response', response)
        if 'error' in response:
            raise RuntimeError('MCP protocol error; see capture')
        return response['result']

    def call(self, name, **arguments):
        result = self.rpc('tools/call', {'name': 'limerick_' + name, 'arguments': arguments})
        state = result.get('structuredContent')
        if state and (name != 'session_presentation' or state['presentation']['revision'] != self.last_revision):
            self.last_revision = state['presentation']['revision']
            frames.append({'seconds': round(time.monotonic()-origin, 3), 'tool': name,
                           'inference': args.inference, **state})
            print('\n### ' + name + '\n\n' + state['markdown'], flush=True)
        return result

    def settled(self):
        return self.wait_for(lambda state: not state['presentation'].get('isStreaming')
                            and not state['presentation'].get('controlPending'), timeout=90)

client = None
try:
    with tempfile.TemporaryDirectory(prefix='rundale-pr-evidence-') as directory:
        save = Path(directory)
        client = CaptureClient(save)
        client.action('new_game')
        client.action('submit_input', text='go to Connolly Cottage')
        client.settled()
        client.action('submit_input', text='Róisín, how is the spinning going?')
        client.settled()
        if args.inference == 'mock':
            client.action('submit_input', text='Róisín, what news? slow')
            client.wait_for(lambda state: any(item['isProvisional'] for item in state['presentation'].get('transcript', [])))
            client.action('stop')
            client.settled()
            client.action('submit_input', text='Róisín, offline once, what news?')
            client.settled()
            client.action('retry')
            client.settled()
            client.action('submit_input', text='ask Connolly about the household')
            question = client.settled()['presentation']['clarification']
            assert isinstance(question, dict), 'Expected deterministic clarification'
            client.action('answer_clarification', questionID=question['questionID'], choiceID=question['options'][1]['choiceID'])
            client.settled()
        else:
            for line in ['Róisín, what keeps the household busy today?', 'Róisín, thank you for speaking with me.']:
                client.action('submit_input', text=line)
                state = client.settled()
                assert not state['presentation'].get('failure'), 'Live turn failed'
        saved = client.action('persist_session')
        assert saved['presentation']['persistence']['status'] == 'saved'
        semantic = lambda items: [{key: value for key, value in item.items() if key != 'id'}
                                 for item in items if item['state'] in ('accepted', 'committed')]
        expected = semantic(saved['presentation']['transcript'])
        assert any(item['kind'] == 'npc_dialogue' for item in expected), 'No committed dialogue'
        assert any(item['isProvisional'] for frame in frames for history in frame['history']
                   for item in history.get('transcript', [])), 'No streaming observed'
        client.action('close_session')
        client.eof()
        client = None
        client = CaptureClient(save)
        restored = client.action('resume_session')
        assert semantic(restored['presentation']['transcript']) == expected
        client.action('close_session')
        client.eof()
        client = None
        print('PASS: committed transcript preserved across fresh MCP/host processes.', flush=True)
finally:
    if client is not None:
        client.eof()
    wire.close()
    (args.out / 'frames.json').write_text(json.dumps(frames, ensure_ascii=False, indent=2))
    (args.out / 'frames.md').write_text('\n\n'.join(frame['markdown'] for frame in frames))
