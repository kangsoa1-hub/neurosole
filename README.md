# NeuroSole V56

중앙 Node.js 서버와 태블릿 브라우저/PWA로 사용하는 재활 치료 기록 앱입니다. 기존 화면 구성을 유지하면서 디자인, 로그인 복원, 환자 휠 이동, 관리자 프로토콜, 실제 치료 선택 기록과 연구용 인지 데이터 파이프라인을 추가했습니다.

## 실행

Node.js 18 이상에서 다음을 실행합니다. 별도 npm 설치는 필요하지 않습니다.

```sh
cd server
node server.js
```

서버가 출력하는 병원 내부망 주소로 태블릿에서 접속합니다. 기존 설치를 갱신할 때는 `server.js`, `clinical.js`, `learning.js`, `public/`을 함께 교체하고 기존 `server/data/`를 보존합니다.

[단일 HTML](neurosole_app.html)은 로컬 화면 확인용입니다. 여러 기기의 공유 기록과 신규 API 기능은 서버로 접속해야 사용할 수 있습니다. GitHub 파일 화면의 **Raw → Download raw file** 또는 저장소의 **Code → Download ZIP**으로 받을 수 있습니다.

## 개발 및 검증

```sh
python3 tools/build_app.py
node --test tests/clinical.test.js tests/learning.test.js
python3 tests/browser_pipeline.py
```

브라우저 검사는 Python Playwright와 Chromium이 필요합니다. 현재 자동 테스트 10개와 브라우저/API 점검 20개를 통과했습니다. `python3 tools/package_release.py`는 실제 DB·토큰·백업을 제외한 검토 패키지를 생성합니다.

## 구현 범위

치료사별 개인화는 형식·수정·선택 이력 기반이며 자유문장 생성 LLM은 연결되지 않았습니다. 월간 인지 예측은 고정된 기준검사·계획량을 사용하는 연구용 모델이며 임상 정확도와 치매 예방 효과가 검증된 모델은 아닙니다. 기본 프로토콜은 관리자 임상 검토 전 비배포 초안입니다. 피그마 파일은 접근 거부로 직접 확인하지 못했습니다.

[상세 사용 안내](README_V56_KO.txt), [서버 설치 안내](server/README.md), [사진·문헌 근거와 적용 한계](docs/DESIGN_AND_CLINICAL_REVIEW_KO.md)를 참고하세요.
