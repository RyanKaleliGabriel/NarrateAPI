
-- The posts table stores the title, content, and category.

CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content VARCHAR(1000) NOT NULL,
  category VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Tags table stores individual tags
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE
);

-- post_tags table connects the posts to tags through a many-to-many relationship

-- CASCADE is used to define what happens to the related data in the child table when a row in the parent table is updated or deleted.
-- ON DELETE CASCADE: When a row in the parent table is deleted, all related rows in the child table are automatically deleted.
-- ON UPDATE CASCADE: When a value in the parent table is updated, all related rows in the child table are automatically updated.
CREATE TABLE IF NOT EXISTS post_tags (
  post_id INT NOT NULL,
  tag_id INT NOT NULL,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
)