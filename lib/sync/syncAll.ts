import { getCustomer, createEvent } from "@/lib/db/repositories";
import { runGrowthSignalEngine } from "@/lib/engine/run";
import { ensureCoordinates, syncBusinessVerification, syncCompetitionSnapshot, syncMarketSnapshot, syncPlaceMatches } from "@/lib/sync/providers";

export async function syncAll(customerId: string, options: { businessNumber?: string; platforms?: string[]; runScoreAfter?: boolean; createSprint?: boolean; scoreVersion?: string } = {}) {
  let customer = await getCustomer(customerId);
  const business = await syncBusinessVerification(customer, options.businessNumber);
  customer = await ensureCoordinates(customer);
  const places = await syncPlaceMatches(customer, options.platforms ?? ["naver", "kakao", "google"]);
  const market = await syncMarketSnapshot(customer);
  const competition = await syncCompetitionSnapshot(customer);
  await createEvent(customerId, "PLACE_SYNC_COMPLETED", "customer", customerId, null, { platforms: options.platforms ?? ["naver", "kakao", "google"] });

  let score = null;
  if (options.runScoreAfter !== false) {
    score = await runGrowthSignalEngine(customerId, { createSprint: options.createSprint ?? true, scoreVersion: options.scoreVersion });
  }

  return {
    customer_id: customerId,
    business_verification: business,
    place_matches: places,
    market_snapshot: market,
    competition_snapshot: competition,
    score
  };
}
