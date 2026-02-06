CREATE TABLE IF NOT EXISTS reptile_event_exclusions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  excluded_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_event_date (event_id, excluded_date),
  CONSTRAINT fk_reptile_event_exclusions_event
    FOREIGN KEY (event_id) REFERENCES reptile_events(id)
    ON DELETE CASCADE
);
