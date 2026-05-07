-- Extra seeds for Supabase/Node cloud version

INSERT INTO diagnosis_code_master (
  diagnosis_code,
  affected_score_area,
  default_severity,
  title,
  customer_message_template,
  internal_message_template,
  recommended_action_codes
)
VALUES
('LOW_DISCOVERABILITY','digital_discovery',80,'지도/검색 발견성 낮음','지도/검색에서 매장이 충분히 발견되지 않습니다.','장소 등록/상호/카테고리 확인 필요',ARRAY['CONNECT_PLACE_URL','FIX_PLACE_NAME','FIX_PLACE_CATEGORY'])
ON CONFLICT (diagnosis_code) DO UPDATE SET
  affected_score_area = EXCLUDED.affected_score_area,
  default_severity = EXCLUDED.default_severity,
  title = EXCLUDED.title,
  customer_message_template = EXCLUDED.customer_message_template,
  internal_message_template = EXCLUDED.internal_message_template,
  recommended_action_codes = EXCLUDED.recommended_action_codes,
  updated_at = now();

INSERT INTO action_template (
  action_code,
  industry_group,
  title,
  description,
  default_mission_type,
  difficulty_score,
  estimated_minutes,
  expected_lift_area,
  expected_lift_min,
  expected_lift_max,
  required_evidence_type,
  guide_json,
  safety_note
)
VALUES
('ADD_TESTIMONIAL','default','후기/사례 등록','고객 후기 또는 이용 사례를 소개문이나 상세정보에 정리하세요.','trust_builder',45,15,'trust_reaction',2,4,'text','{"fields":["고객 유형","이용 서비스","좋았던 점","한 줄 후기"]}'::jsonb,'실제 이용 경험을 바탕으로 작성하세요.'),
('ADD_SIGNATURE_ITEM','default','대표 상품/메뉴 등록','고객이 기억할 대표 상품 또는 대표 메뉴를 하나 이상 정리하세요.','high_impact',45,10,'competition_position',2,5,'text_or_url','{"fields":["대표 상품/메뉴명","가격","추천 이유","사진"]}'::jsonb,NULL),
('ADD_SIGNATURE_MESSAGE','default','대표 강점 문구 작성','주변 경쟁점 대비 고객이 기억할 만한 대표 강점 문구를 작성하세요.','high_impact',50,10,'competition_position',2,4,'text','{"examples":["성수동 데이트에 어울리는 시그니처 파스타","1:1 맞춤 상담 중심 미용실","소수정예 개별 피드백 학원"]}'::jsonb,NULL)
ON CONFLICT (action_code, industry_group) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  default_mission_type = EXCLUDED.default_mission_type,
  difficulty_score = EXCLUDED.difficulty_score,
  estimated_minutes = EXCLUDED.estimated_minutes,
  expected_lift_area = EXCLUDED.expected_lift_area,
  expected_lift_min = EXCLUDED.expected_lift_min,
  expected_lift_max = EXCLUDED.expected_lift_max,
  required_evidence_type = EXCLUDED.required_evidence_type,
  guide_json = EXCLUDED.guide_json,
  safety_note = EXCLUDED.safety_note,
  updated_at = now();
