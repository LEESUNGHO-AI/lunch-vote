#!/usr/bin/env python3
"""
아산 AI 통합관제 — CCTV 실시간 스크린샷 + URL 자동 갱신
맥북 (한국 IP) → ITS API → ffmpeg 캡처 → base64 썸네일 → GitHub push

사전 설치: brew install ffmpeg
자동화: crontab -e → */10 * * * * cd ~/lunch-vote && python3 refresh_cctv.py >> logs/cctv_refresh.log 2>&1
"""
import json, urllib.request, ssl, os, base64, datetime, subprocess, tempfile, math

ITS_API_KEY = '60653e75c4064928a18f2fc5813c437b'
GITHUB_OWNER = 'LEESUNGHO-AI'
GITHUB_REPO = 'lunch-vote'
GITHUB_BRANCH = 'main'
CENTER_LAT, CENTER_LNG = 36.763, 126.887
SEARCH_RANGE = 0.15
MAX_CCTVS = 6
TOKEN_FILE = os.path.expanduser('~/.github_token')

def get_token():
    t = os.environ.get('GITHUB_TOKEN','')
    if t: return t
    if os.path.exists(TOKEN_FILE): return open(TOKEN_FILE).read().strip()
    return ''

def fetch_its():
    url = (f'https://openapi.its.go.kr:9443/cctvInfo?apiKey={ITS_API_KEY}'
           f'&type=its&cctvType=1&minX={CENTER_LNG-SEARCH_RANGE}&maxX={CENTER_LNG+SEARCH_RANGE}'
           f'&minY={CENTER_LAT-SEARCH_RANGE}&maxY={CENTER_LAT+SEARCH_RANGE}&getType=json')
    ctx = ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE
    req = urllib.request.Request(url, headers={'User-Agent':'AsanSmartCity/1.0'})
    try:
        with urllib.request.urlopen(req, timeout=15, context=ctx) as r:
            d = json.loads(r.read().decode('utf-8'))
            cctvs = d.get('response',{}).get('data',[])
            print(f'  📹 ITS: {len(cctvs)}대')
            return cctvs
    except Exception as e:
        print(f'  ❌ ITS 실패: {e}'); return []

def nearest(cctvs):
    res = []
    for c in cctvs:
        lat,lng = float(c.get('coordy',0)), float(c.get('coordx',0))
        if lat==0: continue
        d = math.sqrt(((lat-CENTER_LAT)*111)**2+((lng-CENTER_LNG)*88)**2)
        res.append({'name':c.get('cctvname',''),'url':c.get('cctvurl',''),'lat':lat,'lng':lng,'dist':round(d,1)})
    res.sort(key=lambda x:x['dist'])
    return res[:MAX_CCTVS]

def capture(url, timeout=10):
    if not url: return ''
    try: subprocess.run(['ffmpeg','-version'],capture_output=True,timeout=3)
    except: print('    ⚠️ ffmpeg 없음'); return ''
    tmp = tempfile.mktemp(suffix='.jpg')
    try:
        subprocess.run(['ffmpeg','-y','-i',url,'-frames:v','1','-q:v','10',
                       '-vf','scale=320:-1','-f','image2',tmp],
                      capture_output=True,timeout=timeout)
        if os.path.exists(tmp) and os.path.getsize(tmp)>500:
            with open(tmp,'rb') as f: b=base64.b64encode(f.read()).decode()
            return f'data:image/jpeg;base64,{b}'
        return ''
    except: return ''
    finally:
        try: os.unlink(tmp)
        except: pass

def push(token, content):
    path='data/cctv_live.json'
    api=f'https://api.github.com/repos/{GITHUB_OWNER}/{GITHUB_REPO}/contents/{path}'
    h={'Authorization':f'Bearer {token}','Accept':'application/vnd.github.v3+json',
       'User-Agent':'AsanAI','Content-Type':'application/json'}
    sha=''
    try:
        req=urllib.request.Request(f'{api}?ref={GITHUB_BRANCH}',headers=h)
        with urllib.request.urlopen(req,timeout=10) as r: sha=json.loads(r.read())['sha']
    except: pass
    now=datetime.datetime.now().strftime('%m-%d %H:%M')
    p={'message':f'📹 {now}','content':base64.b64encode(content.encode()).decode(),'branch':GITHUB_BRANCH}
    if sha: p['sha']=sha
    try:
        req=urllib.request.Request(api,data=json.dumps(p).encode(),headers=h,method='PUT')
        with urllib.request.urlopen(req,timeout=30) as r: return r.getcode() in (200,201)
    except Exception as e: print(f'  ❌ push: {e}'); return False

def main():
    now=datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f'═══ CCTV 갱신: {now} ═══')
    cctvs=fetch_its()
    if not cctvs: return
    sel=nearest(cctvs)
    print(f'  📹 {len(sel)}대 선택')
    
    print(f'  📸 캡처...')
    thumbs=[]
    for i,c in enumerate(sel):
        t=capture(c['url'])
        kb=len(t)*3/4/1024 if t else 0
        print(f'    {i+1}. {c["name"][:20]} {"✅ "+str(int(kb))+"KB" if t else "⚠️ 실패"}')
        thumbs.append(t)
    
    ts=datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S KST')
    result={'updated':ts,'source':'ITS+ffmpeg','total':len(cctvs),'displayed':len(sel),
            'center':{'lat':CENTER_LAT,'lng':CENTER_LNG},
            'cctvs':[{'id':f'CCTV-{i+1:02d}','name':c['name'],'url':c['url'],
                      'lat':c['lat'],'lng':c['lng'],'distance':c['dist'],
                      'status':'live' if thumbs[i] else 'url_only',
                      'thumbnail':thumbs[i]} for i,c in enumerate(sel)]}
    
    content=json.dumps(result,ensure_ascii=False)
    print(f'  📦 {len(content)/1024:.0f}KB')
    
    os.makedirs('data',exist_ok=True)
    with open('data/cctv_live.json','w') as f: f.write(content)
    print(f'  💾 저장')
    
    token=get_token()
    if token:
        if push(token,content): print(f'  ✅ push 성공')
        else: print(f'  ❌ push 실패')
    print(f'═══ 완료 ═══\n')

if __name__=='__main__': main()
