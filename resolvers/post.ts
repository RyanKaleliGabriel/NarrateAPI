import { GraphQLError } from "graphql";
import { MyContext } from "../types/db";
import { assetFound } from "../utils/customErrors";

// Assuming db is the PostgreSQL connection pool
const resolvers = {
  Query: {
    getPost: async (_: any, { id }: { id: string }, { pool }: MyContext) => {
      const result = await pool.query("SELECT * FROM posts WHERE id = $1", [
        id,
      ]);
      const post = assetFound(result.rows[0], "Post not found");

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

    getPosts: async (_: any, __: any, { pool }: MyContext) => {
      // Modified query to include created_at and updated_at fields
      // A LEFT JOIN in SQL allows you to combine data from two tables while ensuring that all rows from the left
      // table are included even if there no matching rows in the right it will return null
      // LEFT JOIN post_tags pt ON p.id = pt.post_id:
      // This join connects posts (aliased as p) to post_tags (aliased as pt) by matching p.id (the primary key of
      // posts) with pt.post_id (a foreign key in post_tags that references posts).
      // If a post does not have a corresponding entry in post_tags, then pt.post_id will be NULL for that row in
      // the result.
      // LEFT JOIN tags t ON pt.tag_id = t.id:
      // This join links post_tags (aliased as pt) to tags (aliased as t) by matching pt.tag_id (a foreign key in post_tags) with t.id (the primary key of tags).
      // If a post_tag does not have a matching entry in tags, t.id and t.name will be NULL in the result.
      // Columns from posts (like p.id, p.title, p.content, etc.) are retrieved for each post.
      // Columns from tags (like t.id and t.name) are only populated when a tag is associated with a post;
      // otherwise, they appear as NULL.
      const result = await pool.query(
        `SELECT p.id AS post_id, p.title, p.content, p.category, 
                p.created_at, p.updated_at, t.id AS tag_id, t.name AS tag_name 
         FROM posts p 
         LEFT JOIN post_tags pt ON p.id = pt.post_id 
         LEFT JOIN tags t ON pt.tag_id = t.id;`
      );

      // Using a Map to store posts by post_id for unique entries
      const postsMap = new Map();

      // Process each row to group tags by post
      result.rows.forEach((row) => {
        const postId = row.post_id;

        // Check if the post already exists in the Map
        if (!postsMap.has(postId)) {
          postsMap.set(postId, {
            id: postId,
            title: row.title,
            content: row.content,
            category: row.category,
            created_at: row.created_at,
            updated_at: row.updated_at,
            tags: [], // Initialize an empty array for tags
          });
        }

        // If a tag exists, add it to the tags array of the post
        if (row.tag_id) {
          postsMap
            .get(postId)
            .tags.push({ id: row.tag_id, name: row.tag_name });
        }
      });

      // Convert the Map values to an array for the final output
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
      await pool.query("BEGIN");
      const result = await pool.query(
        "INSERT INTO posts (title, content, category) VALUES ($1, $2, $3) RETURNING id, title, content,category",
        [title, content, category]
      );

      const post = result.rows[0];

      for (const tag of tags) {
        // Check if any tag exists
        let tagResult = await pool.query("SELECT id FROM tags WHERE name=$1", [
          tag,
        ]);

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
      }

      await pool.query("COMMIT");

      //Fetch associated tags to return with the post
      const tagResult = await pool.query(
        "SELECT t.id, t.name FROM tags t JOIN post_tags pt ON t.id = pt.tag_id WHERE pt.post_id = $1",
        [post.id]
      );
      post.tags = tagResult.rows;
      return post;
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
      await pool.query("BEGIN");
      const result = await pool.query("SELECT * FROM posts WHERE id = $1", [
        id,
      ]);
      const post = result.rows[0];
      if (!post) {
        throw new GraphQLError("Post Not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const updatedPost = await pool.query(
        // COALESCE($1, title): If $1 (the title parameter) is NULL, it will keep the current value of title in the posts table.
        "UPDATE posts SET title = COALESCE($1, title), content = COALESCE($2, content), category = COALESCE($3, category), updated_at = NOW() WHERE id = $4 ",
        [title, content, category, id]
      );

      if (tags) {
        // Step 1 Check for tags associated with the post
        const currentTagsResult = await pool.query(
          "SELECT tag_id FROM post_tags WHERE post_id = $1",
          [id]
        );
        const currentTagIds = currentTagsResult.rows.map((row) => row.tag_id);

        //Step 2 Check for tags that are to be removed
        const tagsToRemove = currentTagIds.filter(
          (tagId: string) => !tags.includes(tagId)
        );

        // Step 3 Check for tags that are new
        const tagsToAdd = tags.filter(
          (tagId: string) => !currentTagIds.includes(tagId)
        );

        if (tagsToRemove.length > 0) {
          await pool.query(
            "DELETE FROM post_tags WHERE post_id = $1 AND tag_id = ANY($2::int[])",
            [id, tagsToRemove]
          );
        }

        // Insert New tags into post_tags (and ensure they exist in tags table)
        for (const tagId of tagsToAdd) {
          // Check if the tag exists in the tags table
          const tagExistsResult = await pool.query(
            "SELECT id FROM tags WHERE id = $1",
            [tagId]
          );

          if (tagExistsResult.rows.length === 0) {
            // If the tag doesn't exist, insert it into the tags table.
            await pool.query(
              "INSERT INTO tags (id) VALUES ($1) ON CONFLICT DO NOTHING",
              [tagId]
            );
          }

          // Add the tag to the post_tags table (avoiding duplicates)
          await pool.query(
            "INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            [id, tagId]
          );
        }
      }

      await pool.query("COMMIT");

      // Fetch the updated post and tags
      const postResult = await pool.query("SELECT * FROM posts WHERE id = $1", [
        id,
      ]);
      const updatePost = postResult.rows[0];
      const tagsResult = await pool.query(
        "SELECT t.id, t.name FROM tags t JOIN post_tags pt ON t.id = pt.tag_id WHERE pt.post_id = $1",
        [id]
      );
      updatePost.tags = tagsResult.rows;
      return updatePost;
    },

    deletePost: async (_: any, { id }: { id: string }, { pool }: MyContext) => {
      const result = await pool.query("SELECT id FROM posts WHERE id = $1", [
        id,
      ]);

      const post = assetFound(result.rows[0], "Post not found");

      // Delete associations in post_tags
      await pool.query("DELETE FROM post_tags WHERE post_id = $1", [id]);

      // Delete the post
      await pool.query("DELETE FROM posts WHERE id = $1", [id]);
      return true;
    },
  },
};

export default resolvers;
