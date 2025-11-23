-- MariaDB table for joined Instagram post/profile data
-- Import the CSV (post_profile_join.csv) via Sequel Ace: Table → Import CSV
-- Ensure character set is utf8mb4 for full Unicode (e.g., Korean)

CREATE TABLE IF NOT EXISTS instagram_posts_profiles (
  profile_id BIGINT NOT NULL,
  username VARCHAR(255) NULL,
  profile_description MEDIUMTEXT NULL,
  profile_summary MEDIUMTEXT NULL,
  post_caption MEDIUMTEXT NULL,
  post_summary MEDIUMTEXT NULL,
  posted_at DATETIME NULL,
  PRIMARY KEY (profile_id, posted_at)
) CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci;
