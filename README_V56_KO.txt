NeuroSole V56 검토용 코드

1. neurosole_app.html: 화면 확인 또는 로컬 모드. 공유 기능은 아래 서버로 접속.
2. 서버 실행: Node.js 18+에서 server 폴더로 이동하고 node server.js.
3. 기존 서버 업데이트: 서버를 종료하고 server.js, clinical.js, learning.js, public 폴더를 함께 교체한 뒤 재시작. 기존 server/data는 보존. HTML만 교체하면 새 API 기능은 동작하지 않음.
4. 태블릿은 같은 병원 네트워크에서 서버 주소로 접속. 실제 계정의 로그인 세션과 마지막 화면을 복원함.
5. 소스 재빌드: Python 3에서 python tools/build_app.py. UI 원본은 ui/에 있음.
6. 검사: node --test tests/clinical.test.js tests/learning.test.js. 브라우저 검사는 Python Playwright와 Chromium이 설치된 환경에서 python tests/browser_pipeline.py.

포함: UI 정리, 선택적 휠 환자 이동, 로그인/화면 복원, 관리자 인지 프로토콜, 실제 치료 선택 기록, 계정/난이도별 선택 이력 추천, 계정별 기록 형식 및 수정 이력, 이중과제 DTC, 표준 검사 기록, 고정 월간 연구 예측 및 대조, 수동 모델 조절/후보 회귀.

현재 예측은 연구용이며 임상 정확도를 검증한 모델이 아님. 문체 학습은 명시적 형식/선택 이력 기반으로, 자유 문장 생성 LLM은 미연결. 뇌손상/치매와 검사판을 구분함. 공개 원문 3편 및 관련 초록을 확인했으며 실제 재활 현장 사진 2장을 포함함. 출처와 적용 한계는 앱의 근거 안내 및 docs에 기록. 피그마 정형외과 UI는 해당 주소 접근 거부로 미확인. 인지 프로토콜 기본안은 임상 검토 전 비배포 초안.

실제 서버의 DB, 로그인 토큰, 백업, 테스트 런타임 데이터는 이 패키지에 포함하지 않음.
