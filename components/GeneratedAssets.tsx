"use client";

import { useState } from "react";
import type { ActionAssetsDto, AssetDto } from "@/lib/dto";
import { StatusBadge } from "@/components/StatusBadge";

function renderAssetContent(asset: AssetDto) {
  if (asset.content_text) return asset.content_text;
  if (asset.content_json) return JSON.stringify(asset.content_json, null, 2);
  return "";
}

export function GeneratedAssets({ assets }: { assets: ActionAssetsDto }) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(asset: AssetDto) {
    const content = renderAssetContent(asset);
    await navigator.clipboard.writeText(content);
    setCopied(asset.asset_id);
    setTimeout(() => setCopied(null), 1400);
  }

  return (
    <section className="card">
      <h2>바로 쓸 수 있는 실행물</h2>
      <p>문구, 키워드, 체크리스트를 복사해서 바로 사용하세요.</p>
      {assets.safety_note && <StatusBadge tone="orange">{assets.safety_note}</StatusBadge>}
      <div className="asset-grid" style={{ marginTop: 15 }}>
        {assets.assets.length ? (
          assets.assets.map((asset) => (
            <article className="asset" key={asset.asset_id}>
              <div className="mission-top">
                <h3>{asset.title}</h3>
                <StatusBadge tone="brand">{asset.asset_type}</StatusBadge>
              </div>
              <pre>{renderAssetContent(asset)}</pre>
              <button className="btn primary" onClick={() => copy(asset)}>
                {copied === asset.asset_id ? "복사됨" : "복사하기"}
              </button>
            </article>
          ))
        ) : (
          <div className="empty">아직 생성된 실행물이 없습니다. 실행물 생성 API를 호출하면 여기에 표시됩니다.</div>
        )}
      </div>
    </section>
  );
}
