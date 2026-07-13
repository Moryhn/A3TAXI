const KEY = 'a3taxi-recent-addresses';
const MAX = 4;

export function getRecentAddresses() {
    try {
        const stored = JSON.parse(localStorage.getItem(KEY));
        return Array.isArray(stored) ? stored : [];
    } catch {
        return [];
    }
}

export function addRecentAddress(address) {
    if (!address) return;
    const current = getRecentAddresses().filter((a) => a !== address);
    current.unshift(address);
    localStorage.setItem(KEY, JSON.stringify(current.slice(0, MAX)));
}
