import { v4 as uuidv4 } from 'uuid';

export async function onRequestGet({ request, env }) {
    const url = new URL(request.url);
    const sessionCookie = getSessionCookie(request);
    let session;

    if (!sessionCookie || !(session = JSON.parse(await env.COOLFROG_SESSIONS.get(sessionCookie)))) {
        return unauthorizedResponse();
    }
    
    if (url.pathname === '/meetups') {
        return renderForumsPage(session.username, env);
    } else if (url.pathname.startsWith('/meetups/topic/')) {
        const topicId = url.pathname.split('/')[3];
        return renderTopicPage(topicId, session.username, env);
    }

    return new Response("Resource Not Found", { status: 404 });
}

export async function onRequestPost({ request, env }) {
    const url = new URL(request.url);
    const formData = await request.formData();
    const sessionCookie = getSessionCookie(request);
    let session;

    if (!sessionCookie || !(session = JSON.parse(await env.COOLFROG_SESSIONS.get(sessionCookie)))) {
        return unauthorizedResponse();
    }

    if (url.pathname === "/meetups/add-topic") {
        const title = formData.get('title').trim();
        const emailGroup = formData.get('email_group').trim();
        const description = formData.get('description').trim();
        const meetingType = formData.get('meeting_type').trim();
        const location = meetingType === 'In Person' ? formData.get('location').trim() : null;
        const link = meetingType === 'Online' ? formData.get('link').trim() : null;
        const dateTime = formData.get('date_time').trim();
        return addTopic(title, emailGroup, description, meetingType, location, link, dateTime, session.username, env);
    } else if (url.pathname.startsWith("/meetups/delete-topic/")) {
        const topicId = url.pathname.split('/')[3];
        return deleteTopic(topicId, session.username, env);
    } else if (url.pathname.startsWith("/meetups/topic/") && url.pathname.endsWith('/add-post')) {
        const topicId = url.pathname.split('/')[3];
        const title = formData.get('title');
        const body = formData.get('body');
        return addPost(title, body, topicId, session.username, env);
    } else if (url.pathname.startsWith("/meetups/topic/") && url.pathname.endsWith('/delete-post')) {
        const postId = formData.get('post_id');
        return deletePost(postId, session.username, env);
    }

    return new Response("Bad Request", { status: 400 });
}

async function renderForumsPage(username, env) {
    let topics = await fetchTopics(env);
    
    const topicsHtml = topics.map(topic => `
    <tr>
        <td style="width: 70%;"><a href="/meetups/topic/${topic.id}">${topic.title}</a></td>
        <td style="width: 20%;">${topic.username}</td>
        <td style="width: 10%;">${username === topic.username ? `<form action="/meetups/delete-topic/${topic.id}" method="post"><button type="submit" class="btn btn-danger">Delete</button></form>` : ''}</td>
    </tr>
`).join('');
  
    let user = JSON.parse(await env.COOLFROG_USERS.get(username));
    let emailDomains = user.emails.map(email => email.email.split('@')[1]).filter((v, i, a) => a.indexOf(v) === i);

    const emailOptionHtml = emailDomains.map(domain => `<option value="@${domain}">@${domain}</option>`).join('');

    const pageHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css">
            <title>Forum Page</title>
        </head>
        <body>
            <div class="container mt-4">
                <h1>Forum Topics</h1>
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Author</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>${topicsHtml}</tbody>
                </table>
                <form method="post" action="/meetups/add-topic">
                    <input type="text" name="title" placeholder="Enter topic title" class="form-control mb-2" required>
                    <select name="email_group" class="form-control mb-2" required>${emailOptionHtml}</select>
                    <textarea name="description" placeholder="Enter a description" class="form-control mb-2" required></textarea>
                    <select name="meeting_type" class="form-control mb-2" required>
                        <option value="">Select Meeting Type</option>
                        <option value="In Person">In Person</option>
                        <option value="Online">Online</option>
                    </select>
                    <input type="text" name="location" placeholder="Enter location" class="form-control mb-2">
                    <input type="url" name="link" placeholder="Enter link" class="form-control mb-2">
                    <input type="datetime-local" name="date_time" class="form-control mb-2" required>
                    <button type="submit" class="btn btn-primary">Add Topic</button>
                </form>
            </div>
        </body>
        </html>
    `;
  
    return new Response(pageHtml, { headers: {'Content-Type': 'text/html'} });
}

async function renderTopicPage(topicId, username, env) {
    let topic = (await fetchTopicById(topicId, env))[0];
    let posts = await fetchPostsForTopic(topicId, env);

    const topicInfoHtml = `
        <div class="card mb-4">
            <div class="card-body">
                <h5 class="card-title">${topic.title}</h5>
                <p class="card-text">${topic.description}</p>
                <p><strong>Email Group:</strong> ${topic.email_group}</p>
                <p><strong>Type:</strong> ${topic.meeting_type}</p>
                ${topic.meeting_type === 'In Person' ? `<p><strong>Location:</strong> ${topic.location}</p>` : ''}
                ${topic.meeting_type === 'Online' ? `<p><strong>Link:</strong> <a href="${topic.link}">${topic.link}</a></p>` : ''}
                <p><strong>Date and Time:</strong> ${new Date(topic.date_time).toLocaleString()}</p>
            </div>
        </div>
    `;

    const postsHtml = posts.map(post => `
        <div class="card mb-3">
            <div class="card-header d-flex justify-content-between align-items-center">
                <span>@${post.username}</span>
                ${username === post.username ? `<form action="/meetups/topic/${topicId}/delete-post" method="post" class="mb-0">
                    <input type="hidden" name="post_id" value="${post.id}">
                    <button type="submit" class="btn btn-danger btn-sm">Delete</button>
                </form>` : ''}
            </div>
            <div class="card-body">
                <h5 class="card-title">${post.title}</h5>
                <p class="card-text">${post.body}</p>
            </div>
            <div class="card-footer text-muted">
                ${new Date(post.post_date).toLocaleString()}
            </div>
        </div>
    `).join('');

    const pageHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css">
            <title>Posts in ${topic.title}</title>
        </head>
        <body>
            <div class="container mt-5">
                <h1>${topic.title}</h1>
                <a href="/meetups" class="btn btn-primary mb-3">Back to Topics</a>
                ${topicInfoHtml}
                ${postsHtml}
                <form method="post" action="/meetups/topic/${topicId}/add-post">
                    <input type="text" name="title" placeholder="Enter post title" class="form-control mb-2" required>
                    <textarea name="body" class="form-control mb-2" placeholder="Enter post body" required></textarea>
                    <button type="submit" class="btn btn-success">Add Post</button>
                </form>
            </div>
        </body>
        </html>
    `;

    return new Response(pageHtml, { headers: {'Content-Type': 'text/html'} });
}

async function addTopic(title, emailGroup, description, meetingType, location, link, dateTime, username, env) {
    const topicId = uuidv4();
    const stmt = env.COOLFROG_MEETUPS.prepare("INSERT INTO topics (id, title, email_group, description, meeting_type, location, link, date_time, username) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    await stmt.run(topicId, title, emailGroup, description, meetingType, location, link, dateTime, username);
    return new Response(null, { status: 303, headers: { 'Location': '/meetups' } });
}

async function deleteTopic(topicId, username, env) {
    const stmt = env.COOLFROG_MEETUPS.prepare("DELETE FROM topics WHERE id = ? AND username = ?");
    await stmt.run(topicId, username);
    return new Response(null, { status: 204 });
}

async function addPost(title, body, topicId, username, env) {
    const postId = uuidv4();
    const stmt = env.COOLFROG_MEETUPS.prepare("INSERT INTO posts (id, title, body, topic_id, username) VALUES (?, ?, ?, ?, ?)");
    await stmt.run(postId, title, body, topicId, username);
    return new Response(null, { status: 303, headers: { 'Location': `/meetups/topic/${topicId}` } });
}

async function deletePost(postId, username, env) {
    const stmt = env.COOLFROG_MEETUPS.prepare("DELETE FROM posts WHERE id = ? AND username = ?");
    await stmt.run(postId, username);
    return new Response(null, { status: 204 });
}

async function fetchTopics(env) {
    const stmt = env.COOLFROG_MEETUPS.prepare("SELECT id, title, username FROM topics ORDER BY title");
    return (await stmt.all()).results;
}

async function fetchTopicById(topicId, env) {
    const stmt = env.COOLFROG_MEETUPS.prepare("SELECT id, title, email_group, description, meeting_type, location, link, date_time, username FROM topics WHERE id = ?");
    return (await stmt.all()).results;
}

async function fetchPostsForTopic(topicId, env) {
    const stmt = env.COOLFROG_MEETUPS.prepare("SELECT id, title, body, username, post_date FROM posts WHERE topic_id = ? ORDER BY post_date DESC");
    return (await stmt.all()).results;
}

function getSessionCookie(request) {
    const cookieHeader = request.headers.get('Cookie');
    if (!cookieHeader) return null;
    const cookies = cookieHeader.split(';').map(cookie => cookie.trim().split('='));
    return Object.fromEntries(cookies)['session-id'];
}

function unauthorizedResponse() {
    return new Response("Unauthorized - Please log in.", {status: 403, headers: {'Content-Type': 'text/plain'}});
}