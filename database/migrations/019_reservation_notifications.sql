-- Numéros de téléphone à avertir par texto pour chaque nouvelle réservation
-- publique — liste libre gérée par l'admin (2-3 numéros typiquement),
-- même principe que quick_message_buttons : lignes ajoutées/retirées à volonté.
CREATE TABLE admin_notification_phones (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(50) NOT NULL,
    label VARCHAR(50) NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Un abonnement push appartient soit à un chauffeur, soit à un admin —
-- jamais les deux. driver_id devient optionnel, admin_id s'ajoute.
ALTER TABLE push_subscriptions ALTER COLUMN driver_id DROP NOT NULL;
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS admin_id INTEGER REFERENCES admin_users(id);
ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_owner_check
    CHECK ((driver_id IS NOT NULL) != (admin_id IS NOT NULL));

-- Jeton par réservation pour le lien "Ajouter à mon calendrier" envoyé par
-- texto — même principe que calendar_feed_token/tracking_token : un ID
-- séquentiel exposé publiquement laisserait n'importe qui deviner l'URL
-- d'une autre réservation (nom du client, téléphone, adresses).
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS event_token VARCHAR(64);
