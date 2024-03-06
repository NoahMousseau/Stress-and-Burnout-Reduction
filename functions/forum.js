import { v4 as uuidv4 } from 'uuid';

export async function getAllPosts({ env }) {
  const allKeys = await env.FORUM.list();
  const allPosts = [];

  for (const key of allKeys.keys) {
    const post = await env.FORUM.get(key.name, { type: 'json' });
    allPosts.push(post);
  }

  return allPosts;
}

export async function onRequestPost({ request, env }) {
 try {

    // Generate a unique ID for the post
    const uniqueId = uuidv4();

    console.log("Post submitted successfully");

  } catch (error) {
    console.error("Error:", error);
    console.error("Stack trace:", error.stack);
  }
};