const crypto = require('crypto');
const functions = require('firebase-functions/v1');
const { getAuth } = require('firebase-admin/auth');
const { sendPasswordResetCodeEmail } = require('./email');

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function hashOtp(code, salt) {
  return crypto.createHash('sha256').update(`${code}:${salt}`).digest('hex');
}

function isDevOtpExposeEnabled() {
  return process.env.THERA_EXPOSE_OTP === 'true';
}

async function setPasswordResetClaim(uid, resetPayload, existingClaims) {
  const claims = { ...(existingClaims || {}) };
  if (!claims.role) {
    claims.role = 'authenticated';
  }
  claims.passwordReset = resetPayload;
  await getAuth().setCustomUserClaims(uid, claims);
}

async function clearPasswordResetClaim(uid, existingClaims) {
  const claims = { ...(existingClaims || {}) };
  delete claims.passwordReset;
  if (!claims.role) {
    claims.role = 'authenticated';
  }
  await getAuth().setCustomUserClaims(uid, claims);
}

/** Sends a 6-digit code to the user's email (no reset link). */
exports.requestPasswordResetOtp = functions.https.onCall(async (data) => {
  try {
    const email = normalizeEmail(data?.email);

    if (!email || !isValidEmail(email)) {
      throw new functions.https.HttpsError('invalid-argument', 'Please enter a valid email address.');
    }

    let user;
    try {
      user = await getAuth().getUserByEmail(email);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        return { success: true };
      }
      console.error('getUserByEmail failed', error);
      throw new functions.https.HttpsError('internal', 'Could not process your request.');
    }

    const code = generateOtp();
    const salt = crypto.randomBytes(16).toString('hex');

    await setPasswordResetClaim(
      user.uid,
      {
        codeHash: hashOtp(code, salt),
        salt,
        expiresAt: Date.now() + OTP_TTL_MS,
        attempts: 0,
      },
      user.customClaims,
    );

    try {
      await sendPasswordResetCodeEmail(email, code);
      return { success: true };
    } catch (error) {
      console.error('sendPasswordResetCodeEmail failed', error);

      if (isDevOtpExposeEnabled()) {
        console.warn('thera.expose_otp enabled — returning code in API response (dev only)');
        return { success: true, otp: code };
      }

      await clearPasswordResetClaim(user.uid, user.customClaims);

      if (error.code === 'email/not-configured') {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Password reset email is not configured. Add RESEND_API_KEY or SMTP settings to Cloud Functions.',
        );
      }

        const detail =
          error.code === 'email/send-failed' && error.message
            ? error.message
            : 'Could not send the verification email. Please try again later.';
        throw new functions.https.HttpsError('failed-precondition', detail);
    }
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    console.error('requestPasswordResetOtp unexpected error', error);
    throw new functions.https.HttpsError(
      'internal',
      'Could not send verification code. Please try again.',
    );
  }
});

/** Verifies the code and sets a new password in Firebase Auth. */
exports.confirmPasswordResetOtp = functions.https.onCall(async (data) => {
  try {
    const email = normalizeEmail(data?.email);
    const code = String(data?.code || '').trim();
    const newPassword = String(data?.newPassword || '');

    if (!email || !isValidEmail(email)) {
      throw new functions.https.HttpsError('invalid-argument', 'Please enter a valid email address.');
    }

    if (!/^\d{6}$/.test(code)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Enter the 6-digit code from your email.',
      );
    }

    if (newPassword.length < 6) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Password must be at least 6 characters.',
      );
    }

    let user;
    try {
      user = await getAuth().getUserByEmail(email);
    } catch {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Invalid or expired code. Request a new code and try again.',
      );
    }

    const record = user.customClaims?.passwordReset;
    if (!record) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Invalid or expired code. Request a new code and try again.',
      );
    }

    const expiresAt = record.expiresAt ?? 0;
    if (Date.now() > expiresAt) {
      await clearPasswordResetClaim(user.uid, user.customClaims);
      throw new functions.https.HttpsError(
        'invalid-argument',
        'This code has expired. Request a new code and try again.',
      );
    }

    const attempts = (record.attempts ?? 0) + 1;
    if (attempts > MAX_VERIFY_ATTEMPTS) {
      await clearPasswordResetClaim(user.uid, user.customClaims);
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Too many incorrect attempts. Request a new code and try again.',
      );
    }

    const expectedHash = hashOtp(code, record.salt);
    if (expectedHash !== record.codeHash) {
      await setPasswordResetClaim(
        user.uid,
        { ...record, attempts },
        user.customClaims,
      );
      throw new functions.https.HttpsError('invalid-argument', 'Incorrect verification code.');
    }

    await getAuth().updateUser(user.uid, { password: newPassword });
    await clearPasswordResetClaim(user.uid, user.customClaims);

    return { success: true };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    console.error('confirmPasswordResetOtp unexpected error', error);
    throw new functions.https.HttpsError(
      'internal',
      'Could not reset password. Please try again.',
    );
  }
});
