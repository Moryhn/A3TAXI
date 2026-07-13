import jwt from 'jsonwebtoken';

export function requireAuth(...allowedRoles) {
    return (req, res, next) => {
        const header = req.headers.authorization;
        if (!header || !header.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing authorization token' });
        }

        const token = header.slice('Bearer '.length);
        try {
            const payload = jwt.verify(token, process.env.JWT_SECRET);
            if (allowedRoles.length && !allowedRoles.includes(payload.role)) {
                return res.status(403).json({ error: 'Insufficient permissions' });
            }
            req.user = payload;
            next();
        } catch (err) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
    };
}
