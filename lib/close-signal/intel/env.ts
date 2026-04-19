function required(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

export const intelEnv = {
  ntsServiceKey: () => required("NTS_SERVICE_KEY"),
  kakaoRestApiKey: () => required("KAKAO_REST_API_KEY"),
  naverClientId: () => required("NAVER_CLIENT_ID"),
  naverClientSecret: () => required("NAVER_CLIENT_SECRET"),
};