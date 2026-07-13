const { SMS_GATE_BASE_URL, SMS_GATE_USERNAME, SMS_GATE_PASSWORD } = process.env;

const client = SMS_GATE_BASE_URL && SMS_GATE_USERNAME && SMS_GATE_PASSWORD
    ? {
        baseUrl: SMS_GATE_BASE_URL.replace(/\/$/, ''),
        auth: Buffer.from(`${SMS_GATE_USERNAME}:${SMS_GATE_PASSWORD}`).toString('base64'),
    }
    : null;

// SMS Gate requires E.164 (+1XXXXXXXXXX); customers type plain 10-digit numbers.
// Assumes North American numbers, matching this fleet's Quebec service area.
function toE164(phone) {
    if (phone.startsWith('+')) return phone;
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    return `+${digits}`;
}

// Falls back to a console log when SMS Gate isn't configured (local dev)
export async function sendReservationConfirmationSms(toPhone, message) {
    if (!client) {
        console.log(`[sms:stub] to=${toPhone} message="${message}"`);
        return { stub: true };
    }

    const response = await fetch(`${client.baseUrl}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${client.auth}`,
        },
        body: JSON.stringify({
            textMessage: { text: message },
            phoneNumbers: [toE164(toPhone)],
        }),
    });

    if (!response.ok) {
        throw new Error(`SMS Gate request failed with status ${response.status}: ${await response.text()}`);
    }

    return response.json();
}
