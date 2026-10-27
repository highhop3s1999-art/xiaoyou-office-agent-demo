#!/usr/bin/env python3
"""Start or reuse the local preview without tying it to a terminal session."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import subprocess
import sys
import tempfile
import time
from urllib.error import HTTPError, URLError
from urllib.request import ProxyHandler, build_opener
import webbrowser

ROOT = Path(__file__).resolve().parent
PORT = 8771
LOCAL_HTTP = build_opener(ProxyHandler({}))


def status(port):
    try:
        with LOCAL_HTTP.open(f'http://127.0.0.1:{port}/index.html', timeout=1) as response:
            body = response.read(65536).decode('utf-8', errors='replace')
        return 'ready' if '小悠' in body and './src/app.js' in body else 'occupied'
    except HTTPError:
        return 'occupied'
    except (URLError, TimeoutError, OSError):
        return 'offline'


def ensure_server(port=PORT):
    current = status(port)
    if current == 'ready':
        return None
    if current == 'occupied':
        raise RuntimeError(f'{port} 端口正在被其他应用使用，请关闭占用该端口的应用后重试。')
    log_path = Path(tempfile.gettempdir()) / f'chengxiaoyou-preview-{port}.log'
    with log_path.open('a') as log:
        process = subprocess.Popen(
            [sys.executable, str(Path(__file__).resolve()), '--serve', '--port', str(port)],
            cwd=ROOT, stdin=subprocess.DEVNULL, stdout=log, stderr=log,
            start_new_session=True, close_fds=True,
        )
    for _ in range(40):
        if status(port) == 'ready':
            return process
        if process.poll() is not None:
            break
        time.sleep(0.1)
    if process.poll() is None:
        process.terminate()
    raise RuntimeError(f'预览服务启动失败。请查看日志：{log_path}')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--serve', action='store_true', help=argparse.SUPPRESS)
    parser.add_argument('--port', type=int, default=PORT, help=argparse.SUPPRESS)
    parser.add_argument('--no-open', action='store_true', help=argparse.SUPPRESS)
    args = parser.parse_args()
    if args.serve:
        handler = partial(SimpleHTTPRequestHandler, directory=str(ROOT))
        with ThreadingHTTPServer(('127.0.0.1', args.port), handler) as server:
            server.serve_forever()
        return
    try:
        ensure_server(args.port)
        url = f'http://127.0.0.1:{args.port}/#home'
        print(f'小悠已就绪：{url}\n可以关闭此窗口，预览服务会继续运行。')
        if not args.no_open:
            webbrowser.open(url)
    except (OSError, RuntimeError) as error:
        print(f'无法打开预览：{error}', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
