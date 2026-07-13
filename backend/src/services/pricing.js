// Quebec's officially regulated taxi tariff (Commission des transports du Québec,
// in force since 2022-09-12). This can only ever produce a non-binding ESTIMATE —
// Quebec law requires the actual fare to be metered by taximeter. The per-minute
// component only applies when the vehicle is moving below the speed threshold,
// which can't be predicted in advance, so the estimate is distance-only.
const TIME_ZONE = 'America/Toronto';
const DAY_RATE = { flagDrop: 4.10, perKm: 2.05 };
const NIGHT_RATE = { flagDrop: 4.70, perKm: 2.35 };
const SURCHARGE = 1.05;

export function isNightTime(date) {
    const hour = Number(
        new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, hour: '2-digit', hourCycle: 'h23' }).format(date)
    );
    return hour >= 23 || hour < 5;
}

export function calculateFare({ distanceKm, requestedTime, isRoundTrip }) {
    const date = requestedTime ? new Date(requestedTime) : new Date();
    const night = isNightTime(date);
    const rate = night ? NIGHT_RATE : DAY_RATE;
    const oneWay = rate.flagDrop + rate.perKm * Number(distanceKm) + SURCHARGE;
    const total = isRoundTrip ? oneWay * 2 : oneWay;

    return {
        isNightRate: night,
        estimatedPrice: Math.round(total * 100) / 100,
    };
}
