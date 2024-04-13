import { v4 as uuidv4 } from 'uuid';

// Handler for POST requests
export async function onRequestPost({ request, env }) {
  try {
    const url = new URL(request.url);
    const formData = await request.formData();
    const sessionCookie = getSessionCookie(request);

    if (!sessionCookie) {
      return unauthorizedResponse();
    }

    const session = JSON.parse(await env.COOLFROG_SESSIONS.get(sessionCookie));
    if (!session) {
      return unauthorizedResponse();
    }

    if (url.pathname === "/forums/add-topic") {
      const title = formData.get('title').trim();
      return addTopic(title, session.username, env);
    } else if (url.pathname.startsWith("/forums/delete-topic/")) {
      const topicId = url.pathname.split('/')[3];
      return deleteTopic(topicId, session.username, env);
    }

    return new Response("Not Found", { status: 404 });
  } catch (error) {
    console.error('Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

async function renderForumsPage(username, env) {
  let topics = await fetchTopics(env);
  const topicsHtml = topics.map(topic => `
    <tr>
      <td>${topic.title}</td>
      <td>${topic.username}</td>
      <td>${topic.username === username ? `<button class="btn btn-danger" formaction="/forums/delete-topic/${topic.id}" formmethod="post">Delete</button>` : ''}</td>
    </tr>
  `).join('');

  const pageHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css">
      <title>Forum Topics</title>
    </head>
    <body>
      <div class="container mt-4">
        <h1>Forum Topics</h1>
        <table class="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Author</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>${topicsHtml}</tbody>
        </table>
        <form method="post" action="/forums/add-topic">
          <input type="text" name="title" placeholder="New topic title" required>
          <button type="submit" class="btn btn-primary">Add Topic</button>
        </form>
      </div>
    </body>
    </html>
  `;

  return new Response(pageHtml, { headers: {'Content-Type': 'text/html'} });
}

async function addTopic(title, username, env) {
  const stmt = env.COOLFROG_FORUM.prepare("INSERT INTO topics (title, username) VALUES (?, ?)");
  await stmt.bind(title, username).run();
  return new Response(null, { status: 303, headers: { 'Location': '/forums' } });
}

async function deleteTopic(topicId, username, env) {
  const stmt = env.COOLFROG_FORUM.prepare("DELETE FROM topics WHERE id = ? AND username = ?");
  await stmt.bind(topicId, username).run();
  return new Response(null, { status: 204 });
}

async function fetchTopics(env) {
  const stmt = env.COOLFROG_FORUM.prepare("SELECT id, title, username FROM topics");
  return await stmt.all();
}

function getSessionCookie(request) {
  const cookie = request.headers.get('Cookie');
  if (!cookie) return null;
  return cookie.split(';').find(c => c.trim().startsWith('session-id='))?.split('=')[1];
}

function unauthorizedResponse() {
  return new Response("Unauthorized - Please log in", { status: 401, headers: { 'Content-Type': 'text/plain' } });
}