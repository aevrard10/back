-- Ajout des colonnes de récurrence pour les événements
ALTER TABLE reptile_events
  ADD COLUMN recurrence_type VARCHAR(16) DEFAULT 'NONE',
  ADD COLUMN recurrence_interval INT DEFAULT 1,
  ADD COLUMN recurrence_until DATE NULL;
