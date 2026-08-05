import { setOutlookTokens } from '../models/adminUser.js';

const AUTHORITY = 'https://login.microsoftonline.com/common/oauth2/v2.0';
const SCOPE = 'Calendars.Read offline_access User.Read';
// A token near expiry could lapse mid-request; refresh a little early.
const REFRESH_SKEW_MS = 60 * 1000;

function redirectUri() {
    return `${(process.env.PUBLIC_API_URL || '').replace(/\/$/, '')}/api/outlook/callback`;
}

export function buildAuthUrl(state) {
    const params = new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID,
        response_type: 'code',
        redirect_uri: redirectUri(),
        scope: SCOPE,
        state,
    });
    return `${AUTHORITY}/authorize?${params.toString()}`;
}

async function requestTokens(body) {
    const response = await fetch(`${AUTHORITY}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: process.env.MICROSOFT_CLIENT_ID,
            client_secret: process.env.MICROSOFT_CLIENT_SECRET,
            ...body,
        }),
    });
    if (!response.ok) {
        throw new Error(`Microsoft token request failed with status ${response.status}: ${await response.text()}`);
    }
    return response.json();
}

export function exchangeCodeForTokens(code) {
    return requestTokens({ grant_type: 'authorization_code', code, redirect_uri: redirectUri() });
}

export function refreshTokens(refreshToken) {
    return requestTokens({ grant_type: 'refresh_token', refresh_token: refreshToken });
}

// Refreshes and persists a new access token when the stored one is expired
// or close to it; otherwise reuses it. Every caller goes through this rather
// than reading admin.outlook_access_token directly.
export async function getValidAccessToken(admin) {
    const expiresAt = admin.outlook_token_expires_at ? new Date(admin.outlook_token_expires_at).getTime() : 0;
    if (expiresAt - Date.now() > REFRESH_SKEW_MS) {
        return admin.outlook_access_token;
    }
    const tokens = await refreshTokens(admin.outlook_refresh_token);
    await setOutlookTokens(admin.id, {
        accessToken: tokens.access_token,
        // Microsoft doesn't always return a new refresh_token on refresh — keep the old one when it doesn't.
        refreshToken: tokens.refresh_token || admin.outlook_refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    });
    return tokens.access_token;
}

// Graph's calendarview expands recurring events into individual instances
// in the given range, which is what a calendar UI wants — a plain
// list-events call would return the recurrence master only once.
export async function fetchEvents(accessToken, startIso, endIso) {
    const params = new URLSearchParams({
        startDateTime: startIso,
        endDateTime: endIso,
        $top: '250',
        $select: 'id,subject,start,end,location,isAllDay',
    });
    const response = await fetch(`https://graph.microsoft.com/v1.0/me/calendarview?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}`, Prefer: 'outlook.timezone="UTC"' },
    });
    if (!response.ok) {
        throw new Error(`Microsoft Graph request failed with status ${response.status}: ${await response.text()}`);
    }
    const { value } = await response.json();
    return value.map((event) => ({
        id: event.id,
        subject: event.subject || '',
        start: event.start.dateTime.endsWith('Z') ? event.start.dateTime : `${event.start.dateTime}Z`,
        end: event.end.dateTime.endsWith('Z') ? event.end.dateTime : `${event.end.dateTime}Z`,
        location: event.location?.displayName || '',
        isAllDay: !!event.isAllDay,
    }));
}
