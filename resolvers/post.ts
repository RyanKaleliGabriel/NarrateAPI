import bcrypt from "bcrypt";
import { Pool } from "pg";
import { MyContext } from "../types/db";

// Assuming db is the PostgreSQL connection pool
const resolvers = {
  Query: {
    getPost: async (_: any, { id }: { id: string }, { pool }: MyContext) => {
      const result = await pool.query("SELECT * FROM posts WHERE id = $1", [
        id,
      ]);
      const post = result.rows[0];

      if (!post) {
        throw new Error("Post not found");
      }

      // Fetch associated tags
      const tagResult = await pool.query(
        // Purpose: This query retrieves the tags associated with a specific post, identified by post_id.
        // It performs an inner join between tags and post_tags on the condition that tags.id (aliased as t.id) matches post_tags.tag_id.
        // The post_tags table is the bridge table in a many-to-many relationship between posts and tags.
        // We use t.id and t.name instead of just id and name to explicitly reference the columns in the tags table.
        // This is useful because both tags and post_tags may have columns with the same names (like id).
        // By prefixing with the table alias t, we avoid ambiguity.
        "SELECT t.id, t.name FROM tags t JOIN post_tags pt ON t.id = pt.tag_id WHERE pt.post_id = $1",
        [post.id]
      );

      post.tags = tagResult.rows;

      return post;
    },

    getPosts: async (_: any, { pool }: MyContext) => {
      // The LEFT JOIN allows fetching all posts, even those without tags,
      // by joining posts, post_tags, and tags. If a post has no tags,
      // the tag_id and tag_name will be NULL.
      const result = await pool.query(
        " SELECT p.id AS post_id, p.title, p.content, p.category, p.created_at, p.updated_at, t.id as tag_id, t.name as tag_name FROM posts p LEFT JOIN post_tags pt ON p.id = pt.post_id LEFT JOIN tags t ON pt.tag_id = t.id "
      );

      //Process the rsult to group tags by post
      // A Map is used here to ensure each post is processed uniquely and efficiently.
      // It allows for easy grouping of tags by post_id without duplicating posts in the result.
      const postsMap = new Map();
      //  Using a Map, this code groups tags by their corresponding post.
      // It checks if each post_id already exists in the map; if not, it
      // initializes the post with an empty tags array.
      // Then, if there is a tag_id, it adds that tag to the post’s tags array.

      result.rows.forEach((row) => {
        const postId = row.post_id;
        if (!postsMap.has(postId)) {
          postsMap.set(postId, {
            id: row.post_id,
            title: row.title,
            content: row.content,
            category: row.category,
            created_at: row.created_at,
            updated_at: row.created_at,
            tags: [],
          });
        }
        if (row.tag_id) {
          postsMap
            .get(postId)
            .tags.push({ id: row.tag_id, name: row.tag_name });
        }
      });

      return Array.from(postsMap.values());
    },
  },

  Mutation: {
    createPost: async (
      _: any,
      {
        title,
        content,
        category,
        tags,
      }: { title: string; content: string; category: string; tags: string[] },
      { pool }: MyContext
    ) => {
      try {
        await pool.query("BEGIN");
        const result = await pool.query(
          "INSERT INTO posts (title, content, category) VALUES ($1, $2, $3) RETURNING id, title, content,category",
          [title, content, category]
        );

        const post = result.rows[0];

        for (const tag of tags) {
          // Check if any tag exists
          let tagResult = await pool.query(
            "SELECT id FROM tags WHERE name=$1",
            [tag]
          );

          let tagId;
          if (tagResult.rows.length === 0) {
            //Insert new tag if it doesn;t exists
            tagResult = await pool.query(
              "INSERT INTO tags (name) VALUES ($1) RETURNING id",
              [tag]
            );
          }

          tagId = tagResult.rows[0].id;

          //INSERT into post_tags to link post and tag
          await pool.query(
            // Purpose: Prevents insertion of duplicate entries into post_tags.
            // If a record with the same post_id and tag_id already exists
            // (typically prevented by a unique constraint on (post_id, tag_id) in post_tags),
            //  the ON CONFLICT DO NOTHING clause will skip the insertion without causing an error.
            "INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            [post.id, tagId]
          );

          await pool.query("COMMIT");

          //Fetch associated tags to return with the post
          const tags = await pool.query(
            "SELECT t.id, t.name FROM tags t JOIN post_tags pt ON t.id = pt.tag_id WHERE pt.post_id = $1",
            [post.id]
          );
          post.tags = tags.rows;
          return post;
        }
      } catch (error) {
        await pool.query("ROLLBACK");
        throw error;
      }
    },

    updatePost: async (
      _: any,
      {
        id,
        title,
        content,
        category,
        tags,
      }: {
        id: string;
        title: string;
        content: string;
        category: string;
        tags: [string];
      },
      { pool }: MyContext
    ) => {
      try {
        await pool.query("BEGIN");

        const result = await pool.query("SELECT * FROM posts WHERE id = $1", [
          id,
        ]);
        const post = result.rows[0];
        if (!post) {
          throw new Error("Post not found");
        }
        await pool.query(
          // COALESCE($1, title): If $1 (the title parameter) is NULL, it will keep the current value of title in the posts table.
          "UPDATE posts SET title = COALESCE($1, title), content = COALESCE($2, content), category = COALESCE($3, category), updated_at = NOW() WHERE id = $4 ",
          [title, content, category, id]
        );

        // Update tags if provided
        if (tags) {
          // Remove existing tags for the post
          await pool.query("DELETE FROM post_tags WHERE post_id = $1", [id]);

          //Add new tags
          await Promise.all(
            tags.map(async (tagId) => {
              await pool.query(
                "INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                [id, tagId]
              );
            })
          );
        }
        await pool.query("COMMIT");

        // Fetch the updated post and tags
        const postResult = await pool.query(
          "SELECT * FROM posts WHERE id = $1",
          [id]
        );
        const updatePost = postResult.rows[0];

        const tagsResult = await pool.query(
          "SELECT t.id, t.name FROM tags t JOIN post_tags pt ON t.id = pt.tag_id WHERE pt.post_id = $1",
          [id]
        );
        updatePost.tags = tagsResult.rows;

        return post;
      } catch (error) {
        await pool.query("ROLLBACK");
        throw error;
      }
    },

    deletePost: async (_: any, { id }: { id: string }, { pool }: MyContext) => {
      const result = await pool.query("SELECT id FROM posts WHERE id = $1", [
        id,
      ]);
      const post = result.rows[0];
      if (!post) {
        throw new Error("Post not found");
      }

      //Delete associations in post_tags
      await pool.query("DELETE FROM post_tags WHERE post_id = $1", [id]);

      // Delete the post
      await pool.query("DELETE FROM posts WHERE id = $1", [id]);
      return true;
    },
  },
};

export default resolvers;
