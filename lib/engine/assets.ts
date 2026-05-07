import { db } from "@/lib/db/repositories";

export function generatedAssetsForAction(customer: any, profile: any, action: any) {
  const industry = customer.industry_group ?? "default";
  const assets: Array<Record<string, unknown>> = [];

  if (["REQUEST_REVIEWS", "CREATE_REVIEW_QR"].includes(action.action_code)) {
    const sms = industry === "restaurant" || industry === "cafe"
      ? "안녕하세요. 오늘 방문해주셔서 감사합니다. 식사가 만족스러우셨다면 짧은 리뷰 하나 남겨주시면 큰 힘이 됩니다. 더 좋은 맛과 서비스로 보답하겠습니다."
      : industry === "beauty" || industry === "hair"
        ? "오늘 시술이 마음에 드셨다면 리뷰를 남겨주세요. 고객님의 후기가 다른 고객분들께 큰 도움이 됩니다. 앞으로도 더 만족스러운 시술로 보답하겠습니다."
        : industry === "academy" || industry === "education"
          ? "상담이나 수업이 도움이 되셨다면 간단한 후기를 부탁드립니다. 더 좋은 수업을 준비하는 데 큰 도움이 됩니다."
          : "안녕하세요. 이용해주셔서 감사합니다. 만족스러우셨다면 짧은 리뷰 하나 남겨주시면 큰 힘이 됩니다. 더 좋은 서비스로 보답하겠습니다.";
    assets.push({ asset_type: "review_request_sms", title: "문자용 리뷰 요청 문구", content_text: sms, content_json: {} });
    assets.push({ asset_type: "review_request_kakao", title: "카카오톡용 리뷰 요청 문구", content_text: sms, content_json: {} });
  }

  if (["SET_DIFFERENTIATION_KEYWORDS", "ADD_SIGNATURE_ITEM", "ADD_SIGNATURE_MESSAGE", "ADD_MENU_OR_SERVICE"].includes(action.action_code)) {
    const map: Record<string, string[]> = {
      restaurant: ["시그니처 메뉴", "포장 가능", "주차 가능", "단체 가능", "혼밥 가능", "데이트 코스"],
      cafe: ["조용한 분위기", "디저트 맛집", "작업하기 좋은", "반려동물 동반", "포장 가능"],
      beauty: ["1:1 맞춤 상담", "손상모 케어", "예약 우선", "시술 전후 사진", "디자이너 지정 가능"],
      academy: ["소수정예", "개별 피드백", "기초반 운영", "입시 대비", "상담 가능", "성과 사례"]
    };
    const keywords = profile?.differentiation_keywords?.length ? profile.differentiation_keywords : (map[industry] ?? ["예약 가능", "상담 가능", "주차 가능", "대표 서비스", "친절한 응대"]);
    assets.push({
      asset_type: "differentiation_keywords",
      title: "추천 차별 키워드",
      content_text: null,
      content_json: { keywords: keywords.slice(0, 5), recommended_top3: keywords.slice(0, 3) }
    });
  }

  if (["ADD_MENU_OR_SERVICE", "ADD_PRICE_INFO", "ADD_STORE_PHOTOS"].includes(action.action_code)) {
    assets.push({
      asset_type: "menu_template",
      title: "대표 메뉴/서비스 작성 템플릿",
      content_text: null,
      content_json: { fields: ["이름", "가격", "한 줄 설명", "추천 사진"] }
    });
  }

  const region = (customer.address ?? customer.road_address ?? "우리 지역").split(" ").slice(0, 2).join(" ") || "우리 지역";
  const mainProducts = profile?.main_products ?? "대표 상품/서비스";
  const industryName = customer.industry_name ?? customer.industry_group ?? "매장";
  const keywords = profile?.differentiation_keywords ?? ["편안한 이용", "정성 있는 서비스", "친절한 응대"];
  assets.push({
    asset_type: "store_intro",
    title: "가게 소개문 초안",
    content_text: `저희 매장은 ${region}에서 ${mainProducts}를 제공하는 ${industryName}입니다. ${keywords[0]}, ${keywords[1] ?? "정성 있는 서비스"}, ${keywords[2] ?? "친절한 응대"}를 중요하게 생각하며, 처음 방문하시는 고객도 편하게 이용하실 수 있도록 운영하고 있습니다.`,
    content_json: {}
  });

  return assets;
}

export async function saveAssets(customer: any, profile: any, actions: any[]) {
  const all = [];
  for (const action of actions) {
    const assets = generatedAssetsForAction(customer, profile, action);
    for (const asset of assets) {
      const payload = {
        customer_id: customer.customer_id,
        action_id: action.action_id,
        asset_type: asset.asset_type,
        industry_group: customer.industry_group ?? "default",
        title: asset.title,
        content_text: asset.content_text ?? null,
        content_json: asset.content_json ?? {},
        copy_variant: null,
        language_code: "ko",
        created_by: "engine"
      };
      const { data, error } = await db().from("generated_asset").insert(payload).select("*").single();
      if (!error && data) all.push(data);
    }
  }
  return all;
}
