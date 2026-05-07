import type {
  ActionAssetsDto,
  ActionDetailDto,
  CurrentSprintDto,
  CustomerSuccessQueueDto,
  DiagnosisListDto,
  GrowthSignalLatestDto
} from "@/lib/dto";

export const mockGrowthReport: GrowthSignalLatestDto = {
  customer_id: "00000000-0000-4000-9000-000000000001",
  score_id: "score_demo_001",
  score_date: "2026-05-04",
  growth_signal_score: 68,
  unlock_potential_score: 17,
  reachable_score: 85,
  data_confidence: {
    score: 78,
    grade: "B",
    message: "상권, 경쟁, 지도, 사업자, 사용행동 데이터를 기준으로 진단했습니다."
  },
  growth_leverage_score: 84,
  summary: "Growth Signal 점수 68점입니다. 전환 준비도와 리뷰 반응을 보강하면 개선 여지가 큽니다.",
  closure_risk: {
    score: 72,
    level: "danger",
    level_label: "위험",
    summary: "Risk Radar 72점으로 주의가 필요한 구간입니다. 가장 큰 신호는 ‘최근 30일 매출 하락’입니다.",
    signals: [
      {
        key: "sales_drop_30d_high",
        category: "sales",
        severity: "high",
        title: "최근 30일 매출 하락",
        description: "직전 30일 대비 최근 30일 매출이 30% 이상 감소했습니다.",
        contribution: 19,
        evidence: { salesDrop30d: 0.35 }
      },
      {
        key: "review_count_drop_medium",
        category: "review",
        severity: "medium",
        title: "리뷰 유입 감소",
        description: "최근 리뷰 수가 이전 기간 대비 감소했습니다.",
        contribution: 7,
        evidence: { reviewDropRate: 0.32 }
      }
    ],
    actions: [
      {
        key: "review_sales_drop_reason",
        title: "매출 하락 원인 분해",
        description: "요일별, 시간대별, 채널별 매출을 나눠 하락 구간을 먼저 찾으세요.",
        priority: "high",
        sourceSignalKeys: ["sales_drop_30d_high"]
      },
      {
        key: "recover_review_quality",
        title: "리뷰 품질 회복",
        description: "최근 부정 리뷰 키워드를 분류하고 반복되는 불만 항목을 먼저 개선하세요.",
        priority: "medium",
        sourceSignalKeys: ["review_count_drop_medium"]
      }
    ],
    missing_data: [
      {
        type: "cost",
        label: "고정비 데이터",
        message: "임대료, 인건비, 월 고정비를 입력하면 비용 압박 신호를 계산할 수 있습니다."
      }
    ],
    review_data_status: {
      connectedPlatformCount: 1,
      hasReviewFeature: true,
      status: "active",
      message: "연결된 리뷰 데이터가 고객 반응 신호로 반영되고 있습니다."
    },
    debug: {
      salesDrop30d: 0.35,
      salesDrop90d: 0.22,
      fixedCostRatio: null,
      reviewDropRate: 0.32,
      competitionIncreaseRate: 0.15
    },
    snapshot_date: "2026-05-04"
  },
  component_scores: {
    market_opportunity: 82,
    competition_position: 61,
    digital_discovery: 58,
    conversion_readiness: 42,
    trust_reaction: 45,
    action_velocity: 62,
    operation_basic: 88
  },
  positive_drivers: [
    {
      code: "GOOD_MARKET_SIGNAL",
      label: "상권 수요 양호",
      description: "같은 업종 기준 상권 기회가 평균 이상입니다.",
      impact: 8
    },
    {
      code: "BUSINESS_VERIFIED",
      label: "기본정보 정상",
      description: "사업자 상태와 주소/좌표 매칭이 정상입니다.",
      impact: 5
    }
  ],
  negative_drivers: [
    {
      code: "LOW_CONVERSION_READINESS",
      label: "전환 정보 부족",
      description: "메뉴, 가격, 사진 정보가 부족해 검색 고객이 방문을 결정하기 어렵습니다.",
      impact: -8
    },
    {
      code: "CATEGORY_MISMATCH",
      label: "카테고리 불일치",
      description: "지도 카테고리와 입력 업종이 일부 다릅니다.",
      impact: -5
    }
  ],
  missing_data: [
    {
      type: "revenue",
      label: "월매출 정보",
      message: "입력하면 추천 액션과 개선 우선순위가 더 정교해집니다."
    }
  ]
};

export const mockDiagnoses: DiagnosisListDto = {
  items: [
    {
      diagnosis_id: "diag_demo_001",
      diagnosis_code: "LOW_CONVERSION_READINESS",
      title: "전환 정보 부족",
      affected_score_area: "conversion_readiness",
      severity_score: 80,
      confidence_score: 82,
      impact_score: -8,
      customer_message: "검색 고객이 방문을 결정할 정보가 부족합니다.",
      recommended_action_codes: ["ADD_BUSINESS_HOURS", "ADD_STORE_PHOTOS", "ADD_MENU_OR_SERVICE"]
    },
    {
      diagnosis_id: "diag_demo_002",
      diagnosis_code: "CATEGORY_MISMATCH",
      title: "카테고리 불일치",
      affected_score_area: "digital_discovery",
      severity_score: 75,
      confidence_score: 77,
      impact_score: -5,
      customer_message: "지도 카테고리와 입력 업종이 일부 다릅니다.",
      recommended_action_codes: ["FIX_PLACE_CATEGORY"]
    },
    {
      diagnosis_id: "diag_demo_003",
      diagnosis_code: "LOW_TRUST_SIGNAL",
      title: "신뢰 신호 부족",
      affected_score_area: "trust_reaction",
      severity_score: 70,
      confidence_score: 69,
      impact_score: -4,
      customer_message: "최근 리뷰나 후기 같은 고객 반응 신호가 약합니다.",
      recommended_action_codes: ["REQUEST_REVIEWS"]
    }
  ]
};

export const mockSprint: CurrentSprintDto = {
  sprint_id: "sprint_demo_001",
  sprint_name: "이번 주 성장 스프린트",
  start_date: "2026-05-04",
  end_date: "2026-05-11",
  target_score_lift: 9,
  sprint_status: "active",
  today_mission: {
    mission_id: "mission_demo_001",
    day_number: 1,
    mission_type: "quick_win",
    action_id: "action_demo_001",
    title: "영업시간 최신화",
    expected_lift: 2,
    estimated_minutes: 5,
    status: "assigned"
  },
  weekly_missions: [
    {
      mission_id: "mission_demo_001",
      day_number: 1,
      mission_type: "quick_win",
      action_id: "action_demo_001",
      title: "영업시간 최신화",
      expected_lift: 2,
      estimated_minutes: 5,
      status: "assigned"
    },
    {
      mission_id: "mission_demo_002",
      day_number: 2,
      mission_type: "high_impact",
      action_id: "action_demo_002",
      title: "대표 메뉴/서비스 3개 등록",
      expected_lift: 4,
      estimated_minutes: 10,
      status: "assigned"
    },
    {
      mission_id: "mission_demo_003",
      day_number: 3,
      mission_type: "trust_builder",
      action_id: "action_demo_003",
      title: "방문 고객 리뷰 요청 메시지 발송",
      expected_lift: 3,
      estimated_minutes: 10,
      status: "assigned"
    }
  ]
};

export const mockActionDetail: ActionDetailDto = {
  action_id: "action_demo_003",
  customer_id: mockGrowthReport.customer_id,
  action_code: "REQUEST_REVIEWS",
  mission_type: "trust_builder",
  title: "방문 고객 리뷰 요청 메시지 발송",
  description: "실제 방문 고객에게 정중히 리뷰를 요청하세요.",
  status: "assigned",
  expected_total_lift: 3,
  expected_component_lift: {
    trust_reaction: 5,
    action_velocity: 3
  },
  estimated_minutes: 10,
  guide: {
    checklist: ["실제 방문 고객만 선택", "긍정 리뷰 강요 금지", "아래 문구 복사", "발송 후 완료 체크"],
    copy_texts: {
      sms: "안녕하세요. 오늘 방문해주셔서 감사합니다. 이용이 만족스러우셨다면 짧은 리뷰 하나 남겨주시면 큰 힘이 됩니다."
    }
  },
  safety_note: "실제 이용 고객에게만 요청하세요. 긍정 리뷰를 강요하거나 대가를 제공하면 안 됩니다."
};

export const mockAssets: ActionAssetsDto = {
  action_id: "action_demo_003",
  safety_note: "실제 이용 고객에게만 요청하세요. 긍정 리뷰를 강요하거나 대가를 제공하면 안 됩니다.",
  assets: [
    {
      asset_id: "asset_demo_001",
      asset_type: "review_request_sms",
      title: "문자용 리뷰 요청 문구",
      content_text: "안녕하세요. 오늘 방문해주셔서 감사합니다. 이용이 만족스러우셨다면 짧은 리뷰 하나 남겨주시면 큰 힘이 됩니다. 더 좋은 서비스로 보답하겠습니다."
    },
    {
      asset_id: "asset_demo_002",
      asset_type: "review_request_kakao",
      title: "카카오톡용 리뷰 요청 문구",
      content_text: "오늘 방문 감사드립니다. 괜찮으셨다면 리뷰 한 줄 부탁드려도 될까요? 더 좋은 서비스로 보답하겠습니다."
    },
    {
      asset_id: "asset_demo_003",
      asset_type: "differentiation_keywords",
      title: "추천 차별 키워드",
      content_json: {
        keywords: ["시그니처 메뉴", "포장 가능", "주차 가능", "데이트 코스", "조용한 분위기"],
        recommended_top3: ["시그니처 메뉴", "포장 가능", "주차 가능"]
      }
    }
  ]
};

export const mockCustomerSuccessQueue: CustomerSuccessQueueDto = {
  items: [
    {
      queue_id: "queue_demo_001",
      customer_id: mockGrowthReport.customer_id,
      business_name: "성수 파스타",
      industry_group: "restaurant",
      segment_code: "HIGH_LEVERAGE_LOW_CONVERSION",
      priority_score: 88,
      recommended_internal_action: "플레이스 최적화 미션 완료를 유도하세요.",
      growth_signal_score: 68,
      unlock_potential_score: 17,
      growth_leverage_score: 84,
      data_confidence_grade: "B",
      status: "open",
      created_at: "2026-05-04T09:00:00+09:00"
    },
    {
      queue_id: "queue_demo_002",
      customer_id: "00000000-0000-4000-9000-000000000002",
      business_name: "송파 헤어룸",
      industry_group: "beauty",
      segment_code: "NO_ACTION_AFTER_VIEW",
      priority_score: 76,
      recommended_internal_action: "5분짜리 첫 미션 하나만 안내하세요.",
      growth_signal_score: 61,
      unlock_potential_score: 19,
      growth_leverage_score: 73,
      data_confidence_grade: "C",
      status: "open",
      created_at: "2026-05-04T09:12:00+09:00"
    }
  ]
};
