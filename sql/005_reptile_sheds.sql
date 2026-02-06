-- Table pour l'historique des mues par reptile
CREATE TABLE IF NOT EXISTS reptile_sheds (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reptile_id INT NOT NULL,
  shed_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_reptile_sheds_reptile_id (reptile_id)
);
