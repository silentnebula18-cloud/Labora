import forge from "node-forge";

import serviceAccount from "../../service-account.json";

interface ServiceAccountConfig {
  project_id: string;
  client_email: string;
  private_key: string;
}

const config: ServiceAccountConfig | null = (serviceAccount as ServiceAccountConfig) ?? null;

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

function base64Url(str: string): string {
  return forge.util
    .encode64(str)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Menghasilkan Google OAuth2 Access Token dari Service Account untuk otorisasi FCM v1 API.
 * Menggunakan pure JavaScript RSA (node-forge) yang berjalan 100% di React Native Hermes.
 */
export async function getGoogleAccessToken(): Promise<string | null> {
  if (!config?.private_key || !config?.client_email) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 60) {
    return cachedAccessToken.token;
  }

  try {
    const pki = forge.pki;
    const privateKey = pki.privateKeyFromPem(config.private_key);

    const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const payload = base64Url(
      JSON.stringify({
        iss: config.client_email,
        scope: "https://www.googleapis.com/auth/firebase.messaging",
        aud: "https://oauth2.googleapis.com/token",
        exp: now + 3600,
        iat: now,
      }),
    );

    const unsigned = `${header}.${payload}`;
    const md = forge.md.sha256.create();
    md.update(unsigned, "utf8");
    const signature = privateKey.sign(md);
    const jwt = `${unsigned}.${base64Url(signature)}`;

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=${encodeURIComponent(
        "urn:ietf:params:oauth:grant-type:jwt-bearer",
      )}&assertion=${encodeURIComponent(jwt)}`,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn("[FCM Sender] Gagal menukar JWT token:", errText);
      return null;
    }

    const tokenData = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (tokenData.access_token) {
      cachedAccessToken = {
        token: tokenData.access_token,
        expiresAt: now + (tokenData.expires_in ?? 3600),
      };
      return tokenData.access_token;
    }
    return null;
  } catch (error) {
    console.warn("[FCM Sender] Error pembuatan OAuth2 token:", error);
    return null;
  }
}

/**
 * Mengirim remote push notification langsung ke server Google FCM v1 API.
 * Notifikasi ini akan langsung memicu getar/dering dan muncul di status bar Android
 * bahkan ketika aplikasi penerima sedang ditutup total atau HP dikunci.
 */
export async function sendFCMv1Push(
  targetToken: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<boolean> {
  if (!targetToken) return false;
  const accessToken = await getGoogleAccessToken();
  if (!accessToken || !config?.project_id) {
    return false;
  }

  const endpoint = `https://fcm.googleapis.com/v1/projects/${config.project_id}/messages:send`;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; UTF-8",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        message: {
          token: targetToken,
          notification: {
            title,
            body,
          },
          data: data ?? {},
          android: {
            priority: "HIGH",
            notification: {
              channel_id: "default",
              sound: "default",
              default_sound: true,
              default_vibrate_timings: true,
            },
          },
        },
      }),
    });

    if (!res.ok) {
      const errResponse = await res.text();
      console.warn("[FCM Sender] Gagal mengirim FCM v1 push:", errResponse);
      return false;
    }

    console.log(
      `[FCM Sender] Berhasil mengirim push notification ke token: ${targetToken.substring(
        0,
        12,
      )}...`,
    );
    return true;
  } catch (err) {
    console.warn("[FCM Sender] Error koneksi saat kirim push:", err);
    return false;
  }
}
