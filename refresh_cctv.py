#!/usr/bin/env python3
"""
아산 AI 통합관제 — CCTV URL 자동 갱신
맥북 (한국 IP)에서 실행 → ITS API → cctv_live.json → GitHub push

사용법:
  python3 refresh_cctv.py

자동화 (10분마다):
  crontab -e
  */10 * * * * cd ~/lunch-vote && python3 refresh_cctv.py >> logs/cctv_refresh.log 2>&1
"""

import json, urllib.request, ssl, os, base64, datetime

# ── 설정 ──
ITS_API_KEY = '60653e75c4064928a18f2fc5813c437b'
GITHUB_TOKEN = os.environ.get('GITHUB_TOKEN', '')
GITHUB_OWNER = 'LEESUNGHO-AI'
GITHUB_REPO = 'lunch-vote'
GITHUB_BRANCH = 'main'

# 도고 OASIS 중심
CENTER_LAT = 36.763
CENTER_LNG = 126.887
SEARCH_RANGE = 0.15  # 약 17km
MAX_CCTVS = 6

# GitHub 토큰 파일 (없으면 환경변수 사용)
TOKEN_FILE = os.path.expanduser('~/.github_token')


def get_token():
    """GitHub 토큰 가져오기"""
    if GITHUB_TOKEN:
        return GITHUB_TOKEN
    if os.path.exists(TOKEN_FILE):
        return open(TOKEN_FILE).read().strip()
    # git config에서 가져오기
    try:
        import subprocess
        result = subprocess.run(['git', 'config', '--get', 'credential.helper'], 
                              capture_output=True, text=True)
    except:
        pass
    print('❌ GITHUB_TOKEN 미설정. 환경변수 또는 ~/.github_token 파일 필요')
    return ''


def fetch_its_cctvs():
    """ITS API에서 도고 인근 CCTV 목록 가져오기"""
    min_x = CENTER_LNG - SEARCH_RANGE
    max_x = CENTER_LNG + SEARCH_RANGE
    min_y = CENTER_LAT - SEARCH_RANGE
    max_y = CENTER_LAT + SEARCH_RANGE
    
    url = (f'https://openapi.its.go.kr:9443/cctvInfo'
           f'?apiKey={ITS_API_KEY}'
           f'&type=its&cctvType=1'
           f'&minX={min_x}&maxX={max_x}'
           f'&minY={min_y}&maxY={max_y}'
           f'&getType=json')
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    req = urllib.request.Request(url)
    req.add_header('User-Agent', 'AsanSmartCity/1.0')
    
    try:
        with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            cctvs = data.get('response', {}).get('data', [])
            print(f'  📹 ITS API: {len(cctvs)}대 수신')
            return cctvs
    except Exception as e:
        print(f'  ❌ ITS API 실패: {e}')
        return []


def select_nearest(cctvs, max_count=MAX_CCTVS):
    """도고 OASIS에서 가장 가까운 CCTV 선택"""
    import math
    result = []
    for c in cctvs:
        lat = float(c.get('coordy', 0))
        lng = float(c.get('coordx', 0))
        if lat == 0 or lng == 0:
            continue
        dist = math.sqrt(
            ((lat - CENTER_LAT) * 111) ** 2 + 
            ((lng - CENTER_LNG) * 88) ** 2
        )
        result.append({
            'name': c.get('cctvname', ''),
            'url': c.get('cctvurl', ''),
            'lat': lat,
            'lng': lng,
            'type': 'ITS 국도',
            'dist': round(dist, 1)
        })
    
    result.sort(key=lambda x: x['dist'])
    return result[:max_count]


def build_json(selected, total_count):
    """cctv_live.json 생성"""
    now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S KST')
    return {
        'updated': now,
        'refreshInterval': '10분',
        'source': 'ITS API (한국 IP)',
        'center': {'lat': CENTER_LAT, 'lng': CENTER_LNG, 'name': '도고 디지털 OASIS'},
        'total': total_count,
        'displayed': len(selected),
        'cctvs': [
            {
                'id': f'CCTV-{str(i+1).zfill(2)}',
                'name': c['name'],
                'url': c['url'],
                'lat': c['lat'],
                'lng': c['lng'],
                'distance': c['dist'],
                'status': 'live' if c['url'] else 'offline',
                'type': c['type'],
            }
            for i, c in enumerate(selected)
        ]
    }


def push_to_github(token, content, path='data/cctv_live.json'):
    """GitHub에 파일 push"""
    api_url = f'https://api.github.com/repos/{GITHUB_OWNER}/{GITHUB_REPO}/contents/{path}'
    headers = {
        'Authorization': f'Bearer {token}',
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'AsanAI-CCTV',
        'Content-Type': 'application/json'
    }
    
    # 기존 파일 SHA 조회
    sha = ''
    try:
        req = urllib.request.Request(f'{api_url}?ref={GITHUB_BRANCH}', headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            sha = json.loads(resp.read())['sha']
    except:
        pass
    
    # Push
    now = datetime.datetime.now().strftime('%m-%d %H:%M')
    payload = {
        'message': f'📹 CCTV {now}',
        'content': base64.b64encode(content.encode('utf-8')).decode('ascii'),
        'branch': GITHUB_BRANCH
    }
    if sha:
        payload['sha'] = sha
    
    try:
        req = urllib.request.Request(api_url, 
            data=json.dumps(payload).encode('utf-8'),
            headers=headers, method='PUT')
        with urllib.request.urlopen(req, timeout=15) as resp:
            code = resp.getcode()
            if code in (200, 201):
                print(f'  ✅ GitHub push 성공')
                return True
            else:
                print(f'  ❌ GitHub push 실패: HTTP {code}')
                return False
    except Exception as e:
        print(f'  ❌ GitHub push 오류: {e}')
        return False


def save_local(content, path='data/cctv_live.json'):
    """로컬 파일로도 저장"""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'  💾 로컬 저장: {path}')


def main():
    now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f'═══ CCTV URL 갱신: {now} ═══')
    
    # 1. ITS API 호출
    cctvs = fetch_its_cctvs()
    if not cctvs:
        print('  ⚠️ CCTV 데이터 없음 — 종료')
        return
    
    # 2. 가장 가까운 6대 선택
    selected = select_nearest(cctvs)
    print(f'  📹 도고 인근 {len(selected)}대 선택:')
    for i, c in enumerate(selected):
        status = '✅' if c['url'] else '❌'
        print(f'    {i+1}. {c["name"]} ({c["dist"]}km) {status}')
    
    # 3. JSON 생성
    result = build_json(selected, len(cctvs))
    content = json.dumps(result, ensure_ascii=False, indent=2)
    
    # 4. 로컬 저장
    save_local(content)
    
    # 5. GitHub push
    token = get_token()
    if token:
        push_to_github(token, content)
    else:
        print('  ⚠️ GitHub 토큰 없음 — 로컬만 저장')
    
    print(f'═══ 완료 ═══\n')


if __name__ == '__main__':
    main()
