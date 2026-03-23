#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════
아산 스마트시티 — CCTV 실시간 프록시 서버
맥북에서 실행 → http://localhost:8080 에서 대시보드 + 실시간 CCTV
═══════════════════════════════════════════════════════

사용법:
  cd ~/lunch-vote
  python3 cctv_server.py

  브라우저에서 http://localhost:8080 접속
  → 대시보드 + 실시간 CCTV 영상 표시

원리:
  1. ITS API에서 최신 CCTV URL 발급 (10분마다 자동 갱신)
  2. /proxy/cctv/1 ~ /proxy/cctv/6 → ITS 서버에서 이미지 가져와서 전달
  3. 대시보드는 localhost에서 로드 → Mixed Content 문제 없음
  4. 대시보드 img 태그가 2초마다 프록시 URL 갱신 → 실시간 영상 효과
"""

import json
import urllib.request
import ssl
import math
import threading
import time
import os
from http.server import HTTPServer, SimpleHTTPRequestHandler
from datetime import datetime

# ── 설정 ──
PORT = 8080
ITS_API_KEY = '60653e75c4064928a18f2fc5813c437b'
ITS_URL = 'https://openapi.its.go.kr:9443/cctvInfo'
BBOX = {'minX': '126.70', 'maxX': '127.10', 'minY': '36.65', 'maxY': '36.90'}
PARADISE_LAT = 36.7661
PARADISE_LNG = 126.8862
MAX_CCTV = 6
REFRESH_INTERVAL = 600  # 10분마다 URL 갱신

# 글로벌 CCTV 데이터
cctv_list = []
last_refresh = 0


def fetch_cctv_urls():
    """ITS API에서 최신 CCTV URL 발급"""
    global cctv_list, last_refresh
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    params = (f'?apiKey={ITS_API_KEY}&type=its&cctvType=2'
              f'&minX={BBOX["minX"]}&maxX={BBOX["maxX"]}'
              f'&minY={BBOX["minY"]}&maxY={BBOX["maxY"]}&getType=json')
    try:
        req = urllib.request.Request(ITS_URL + params,
            headers={'User-Agent': 'AsanSmartCity/2.0'})
        with urllib.request.urlopen(req, timeout=30, context=ctx) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            items = data.get('response', {}).get('data', [])
            if not isinstance(items, list):
                items = [items] if items else []

            cctvs = []
            for it in items:
                cctvs.append({
                    'name': it.get('cctvname', ''),
                    'url': it.get('cctvurl', ''),
                    'lat': float(it.get('coordy', 0)),
                    'lng': float(it.get('coordx', 0)),
                    'typeLabel': '고속도로' if it.get('cctvtype') == '1' else '국도',
                })

            # 파라다이스 인근 정렬
            dist = lambda c: math.sqrt((c['lat']-PARADISE_LAT)**2 + (c['lng']-PARADISE_LNG)**2)
            cctvs.sort(key=dist)
            cctv_list = cctvs
            last_refresh = time.time()
            now = datetime.now().strftime('%H:%M:%S')
            print(f'  [{now}] 📹 ITS CCTV {len(cctvs)}개 URL 갱신 완료')
            return True
    except Exception as e:
        print(f'  ❌ ITS API 실패: {e}')
        return False


def refresh_loop():
    """10분마다 CCTV URL 자동 갱신"""
    while True:
        fetch_cctv_urls()
        time.sleep(REFRESH_INTERVAL)


def proxy_cctv_image(index):
    """CCTV 이미지를 ITS 서버에서 가져와서 반환"""
    if index < 0 or index >= len(cctv_list):
        return None, 'Index out of range'
    
    url = cctv_list[index]['url']
    if not url:
        return None, 'No URL'

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        })
        with urllib.request.urlopen(req, timeout=8, context=ctx) as resp:
            data = resp.read()
            ct = resp.headers.get('Content-Type', 'image/jpeg')
            return (data, ct), None
    except Exception as e:
        return None, str(e)


class CCTVHandler(SimpleHTTPRequestHandler):
    """대시보드 파일 서빙 + CCTV 프록시"""

    def do_GET(self):
        # /proxy/cctv/0 ~ /proxy/cctv/5 → CCTV 이미지 프록시
        if self.path.startswith('/proxy/cctv/'):
            try:
                idx = int(self.path.split('/')[-1].split('?')[0])
            except:
                self.send_error(400, 'Invalid index')
                return

            result, err = proxy_cctv_image(idx)
            if result:
                data, ct = result
                self.send_response(200)
                self.send_header('Content-Type', ct)
                self.send_header('Content-Length', len(data))
                self.send_header('Cache-Control', 'no-cache, no-store')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(data)
            else:
                self.send_error(502, f'CCTV error: {err}')
            return

        # /api/cctv → CCTV 목록 JSON
        if self.path.startswith('/api/cctv'):
            data = json.dumps({
                'updated': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'total': len(cctv_list),
                'cctvs': [{
                    'name': c['name'],
                    'lat': c['lat'],
                    'lng': c['lng'],
                    'typeLabel': c['typeLabel'],
                    'proxyUrl': f'/proxy/cctv/{i}',
                    'dist_km': round(math.sqrt((c['lat']-PARADISE_LAT)**2 + (c['lng']-PARADISE_LNG)**2) * 111, 2),
                } for i, c in enumerate(cctv_list[:MAX_CCTV])]
            }, ensure_ascii=False).encode('utf-8')

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(data)
            return

        # 나머지 → 정적 파일 서빙 (대시보드)
        super().do_GET()

    def log_message(self, format, *args):
        # 프록시 요청 로그 간소화
        if '/proxy/cctv/' in str(args[0]):
            return  # CCTV 프록시는 로그 생략
        super().log_message(format, *args)


def main():
    print()
    print('═══════════════════════════════════════════════')
    print(' 아산 스마트시티 — CCTV 실시간 프록시 서버')
    print('═══════════════════════════════════════════════')
    print()

    # 현재 디렉토리를 레포 루트로 설정
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    print(f'  📂 서빙 디렉토리: {script_dir}')

    # 초기 CCTV URL 발급
    print(f'  🌐 ITS API 연결 중...')
    if not fetch_cctv_urls():
        print('  ⚠️ ITS API 연결 실패 — CCTV 없이 시작')

    # 백그라운드 URL 갱신 스레드
    t = threading.Thread(target=refresh_loop, daemon=True)
    t.start()

    # HTTP 서버 시작
    server = HTTPServer(('0.0.0.0', PORT), CCTVHandler)
    print()
    print(f'  🚀 서버 시작: http://localhost:{PORT}')
    print(f'  📹 CCTV 프록시: http://localhost:{PORT}/proxy/cctv/0')
    print(f'  📋 CCTV API: http://localhost:{PORT}/api/cctv')
    print()
    print(f'  브라우저에서 http://localhost:{PORT} 접속하세요!')
    print(f'  종료: Ctrl+C')
    print()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n  🛑 서버 종료')
        server.shutdown()


if __name__ == '__main__':
    main()
