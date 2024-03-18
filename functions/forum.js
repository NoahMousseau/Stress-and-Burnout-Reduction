import { v4 as uuidv4 } from 'uuid';

// Function for using getAllPosts
export async function getAllPosts({ env }) {
  const allKeys = await env.COOLFROG_FORUM.list();
  const allPosts = [];

  for (const key of allKeys.keys) {
    const post = await env.COOLFROG_FORUM.get(key.name, { type: 'json' });
    allPosts.push(post);
  }

  return allPosts;
};

export async function onRequestPost({ request, env }) {
  try {
     // Request body contains the form data
     const formData = await request.formData();
     const postTitle = formData.get('postTitle');
     const postContent = formData.get('postContent');
 
     // Create a post object
     const post = JSON.stringify({
       title: postTitle,
       content: postContent,
     });
 
     // Generate a unique ID for the post
     const uniqueId = uuidv4();
 
     // Store the post in the KV namespace
     await env.COOLFROG_FORUM.put(uniqueId, post);

     // After storing the post, redirect to the homepage
    return new Response('Post created successfully!', {
      status: 302,
      headers: {
        location: '/forum.html'
      },
    });
  } catch (error) {
     console.error("Error:", error);
     // Error handling
  }
};