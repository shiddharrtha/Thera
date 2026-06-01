/**
 * Calls Firebase HTTPS callable functions via fetch.
 * Avoids firebase/functions + RN Firebase app mismatch (getProvider error).
 */

const FUNCTIONS_REGION = 'us-central1';
const PROJECT_ID = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'thera-a4f82';

type CallableErrorBody = {
  error?: {
    message?: string;
    status?: string;
  };
  result?: unknown;
};

function callableUrl(functionName: string) {
  return `https://${FUNCTIONS_REGION}-${PROJECT_ID}.cloudfunctions.net/${functionName}`;
}

function throwCallableError(body: CallableErrorBody): never {
  const message = body.error?.message ?? 'Request failed';
  const status = body.error?.status?.toLowerCase().replace(/_/g, '-') ?? 'internal';
  const error = new Error(message) as Error & { code?: string };
  error.code = `functions/${status}`;
  throw error;
}

async function callFunction<TPayload, TResult>(functionName: string, data: TPayload): Promise<TResult> {
  const response = await fetch(callableUrl(functionName), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  });

  let body: CallableErrorBody;
  try {
    body = (await response.json()) as CallableErrorBody;
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }

  if (body.error) {
    throwCallableError(body);
  }

  return body.result as TResult;
}

export type RequestPasswordResetOtpResult = {
  success: boolean;
  /** Present only when Cloud Functions has thera.expose_otp enabled (development). */
  otp?: string;
};

export async function callRequestPasswordResetOtp(
  email: string,
): Promise<RequestPasswordResetOtpResult> {
  return callFunction<{ email: string }, RequestPasswordResetOtpResult>(
    'requestPasswordResetOtp',
    { email: email.trim() },
  );
}

export async function callConfirmPasswordResetOtp(
  email: string,
  code: string,
  newPassword: string,
): Promise<void> {
  await callFunction<
    { email: string; code: string; newPassword: string },
    { success: boolean }
  >('confirmPasswordResetOtp', {
    email: email.trim(),
    code: code.trim(),
    newPassword,
  });
}
