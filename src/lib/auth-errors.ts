export function signInErrorMessage(code: string | undefined) {
  if (code === "invalid_credentials") return "That email and password don't match.";
  if (code === "email_not_confirmed") return "Confirm the email before signing in.";
  if (code === "over_request_rate_limit") return "Too many attempts. Wait a minute and try again.";
  return "Sign-in could not be completed. Try again.";
}
