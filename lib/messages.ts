export function getWatchlistMessage(status?: string) {
  switch (status) {
    case "added":
      return "관심목록에 추가되었습니다.";
    case "removed":
      return "관심목록에서 제거되었습니다.";
    case "auth_required":
      return "로그인 후 이용할 수 있습니다.";
    case "invalid":
      return "요청 값이 올바르지 않습니다.";
    case "error":
      return "처리 중 오류가 발생했습니다.";
    default:
      return "";
  }
}

export function getLoginErrorMessage(error?: string, description?: string) {
  switch (error) {
    case "missing_required_fields":
      return "이메일과 비밀번호를 모두 입력해 주세요.";
    case "login_failed":
      return description || "로그인에 실패했습니다.";
    case "callback_failed":
      return description || "로그인 처리 중 오류가 발생했습니다.";
    default:
      return description || "";
  }
}