import twilio from 'twilio';

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;

const client = TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN
    ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    : null;

// Falls back to a console log when Twilio credentials aren't configured (local dev)
export async function sendReservationConfirmationSms(toPhone, message) {
    if (!client) {
        console.log(`[sms:stub] to=${toPhone} message="${message}"`);
        return { stub: true };
    }

    return client.messages.create({
        to: toPhone,
        from: TWILIO_FROM_NUMBER,
        body: message,
    });
}
