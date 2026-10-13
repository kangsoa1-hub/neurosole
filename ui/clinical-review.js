/* Verified references and documentary photographs; preserve uploaded replacements. */
(()=>{
'use strict';
const N=window.NS56;
const refs=[
 ['Cicerone et al. (2019)', '10.1016/j.apmr.2019.02.011', '체계적 문헌고찰 · 초록 확인', '뇌손상 후 주의·기억 보상·메타인지 전략을 기능 활동과 연결한다.'],
 ['INCOG 2.0 Part II / V (2023)', '10.1097/HTR.0000000000000839', 'TBI 지침 · 초록 확인', '주의 훈련은 실제 활동과 전략 사용을 중심으로 구성한다. 단순 컴퓨터 과제의 일반화 근거는 제한적이다. 기억은 개인 목표와 외적 보조도구를 활용한다. Part V DOI: 10.1097/HTR.0000000000000837. 뇌졸중 적용은 별도 검토한다.'],
 ['das Nair et al. (2016)', '10.1002/14651858.CD002293.pub3', '뇌졸중 기억재활 Cochrane · 초록 확인', '13개 연구, 514명. 단기 주관적 기억 호전은 있었으나 객관적 기억검사·기능과 장기 효과는 확실하지 않았다.'],
 ['Shi et al. (2025)', '10.3389/fneur.2025.1417364', '뇌졸중 이중과제 메타분석 · 공개 원문 확인', '인지 관련 긍정적 결과가 보고되었으나 연구 질과 이질성을 고려해야 한다. 앱의 특정 30분 구성 또는 개인 예측 정확도를 입증한 연구는 아니다.'],
 ['Gao et al. (2026)', '10.3390/geriatrics11030065', '뇌졸중 이중과제 · 공개 원문 확인', '21개 RCT, 786명. 보행·균형의 개선 신호가 있으며 운동기능 개선은 확실하지 않았다. 높은 이질성과 과제 유형 직접 비교 부족이 있다.'],
 ['Lamb et al., DAPA (2018)', '10.1136/bmj.k1675', '치매 운동 RCT · 공개 원문 확인', '중등도~고강도 운동이 경도~중등도 치매의 인지 저하를 늦추지 못했다. 신체 체력 향상을 치매 예방 또는 인지 개선으로 동일시하지 않는다.'],
 ['Demeyere et al., OCS (2015)', '10.1037/pas0000082', '뇌졸중 평가 도구 · 초록 확인', '뇌졸중의 영역별 표준 선별 도구다. 병원에서 사용할 검증된 언어판과 실시 지침을 확인한다. 앱 내부 VCS 또는 게임은 OCS·MMSE·MoCA를 대체하지 않는다.']
];
N.evidenceOpen=()=>N.modal('nsEvidence','인지 · 이중과제 치료 근거',`<div class="ns-proof"><p class="ns-muted">문헌 확인: 2026-10-13. 초록 확인과 공개 원문 확인을 구분했습니다. 기본 프로토콜은 관리자가 환자군·안전·실제 생활 목표를 검토해 배포합니다.</p>${refs.map(r=>`<article><b>${r[0]}</b><p class="ns-muted">${r[2]}</p><p>${r[3]}</p><a href="https://doi.org/${r[1]}" target="_blank" rel="noopener">논문 확인 ↗</a></article>`).join('')}<h4>30분 치료와 보조 인지 훈련</h4><p>치료사가 해당 난이도에서 오늘 수행할 운동·작업 활동을 소수 선택합니다. 단일과제 수행을 확인한 뒤 안전한 활동에 인지 과제를 결합하고, 남는 시간의 태블릿 훈련은 별도로 기록합니다. 이중과제 시간은 운동·작업 시간에 포함되어 중복 합산하지 않습니다.</p><p>운동과 인지의 수행값, 도움·오류·피로를 함께 비교하고 치료사가 난이도를 수정합니다. 표준 검사, 내부 관찰, 훈련 결과와 일상 기능을 각각 기록합니다.</p><button class="btn ghost small" onclick="NS56.photoCredits()">치료 사진 출처</button></div>`,`<button class="btn ghost small" onclick="NS56.closeModal('nsEvidence')">닫기</button>`);
N.photoCredits=()=>N.modal('nsPhotoCredits','치료 참고 사진 출처',`<p>실제 재활 현장 참고 사진이며 개별 환자의 운동 시연 지침은 아닙니다. 기존 사진 교체 기능으로 병원 사진을 넣을 수 있습니다.</p><p>U.S. Air Force / Staff Sgt. Chanceler Nardone, 2022-06-14. Wikimedia Commons에서 내려받은 공개 영역(Public domain) 사진.</p>${['7270858','7270864'].map(id=>`<p><a href="https://commons.wikimedia.org/wiki/File:Spangdahlem_physical_therapy_rehabilitates_Airmen_after_injury_(${id}).jpg" target="_blank" rel="noopener">원본 · 출처 (${id}) ↗</a></p>`).join('')}`,`<button class="btn ghost small" onclick="NS56.closeModal('nsPhotoCredits')">닫기</button>`);
const originalPhoto=resolvePhoto;
resolvePhoto=(domain,idx,pool)=>{
 const old=originalPhoto(domain,idx,pool);
 if(pool)return old;
 const builtin=old&&N.builtinPhotoSignatures.has(old.length+':'+old.slice(-64));
 if(old&&!builtin&&!old.startsWith('data:image/svg+xml'))return old;
 if(!domain)return old;
 return /bbs|gait|balance|neuro|lower/i.test(domain)?N.referencePhotos.movement:N.referencePhotos.consultation;
};
const card=therapyCardHtml;
therapyCardHtml=(key,s,start,picker)=>{
 let html=card(key,s,start,picker);
 if(!picker&&!s.poolId&&s.domainKey){const src=resolvePhoto(s.domainKey,s.idx,s.poolId);if(Object.values(N.referencePhotos).includes(src)){html=html.replace(/alt="[^"]*참고 이미지"/,'alt="실제 재활 현장 참고 사진"');html=html.replace('<span class="hint">사진교체</span>','<span class="hint">현장 참고 · 사진교체</span>');html+='<div class="ns-muted" style="margin:6px 0 12px;font-size:11px">현장 참고 사진 · 해당 운동의 시연 사진은 아님 <button class="btn ghost small" onclick="NS56.photoCredits()">출처</button></div>';}}
 return html;
};
})();
