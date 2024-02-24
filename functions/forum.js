import { stringify } from "uuid";

document.addEventListener('DOMContentLoaded', function () {

    //Functionality for login and signup
    const leftButton = document.getElementById('leftButton');
    const rightButton = document.getElementById('rightButton');

    fetch('/api/username').then(response => response.json()).then(data => {
        if (data.username) {
            leftButton.textContent = 'Account';
            leftButton.onclick = function () { window.location.href = '/account'; };
            // Dynamically use the username in the 'Sign Out' button text
            rightButton.textContent = `Sign Out of ${data.username}`;
            rightButton.onclick = function () { window.location.href = '/signout'; };
        } else {
            leftButton.textContent = 'Sign Up';
            leftButton.onclick = function () { window.location.href = '/signup'; };
            rightButton.textContent = 'Login';
            rightButton.onclick = function () { window.location.href = '/login'; };
        }
    }).catch(error => {
        console.error("Error fetching username:", error);
        leftButton.textContent = 'Sign Up';
        leftButton.onclick = function () { window.location.href = '/signup'; };
        rightButton.textContent = 'Login';
        rightButton.onclick = function () { window.location.href = '/login'; };
    });

    // Functionality for listening for user interaction
    document.addEventListener('DOMContentLoaded', function () {
        const postForm = document.getElementById('postForm');
        postForm.addEventListener('submit', function (event) {
            event.preventDefault(); // Prevent the default form submission
    
            const postTitle = document.getElementById('postTitle').value;
            const postContent = document.getElementById('postContent').value;
    
            // Call a function to handle the creation of a new post
            createNewPage(postTitle, postContent);
        });
    });
});

// Function to generate a unique identifier
function generateUniqueId() {
    return Math.random().toString(36).substring(2, 10);
}

// Function to get all posts from server
export async function getAllPosts({env}) {
    // Retrieve all posts from KV
    const allKeys = await env.COOLFROG_FORUM.list();
    const allPosts = [];

    for (const key of allKeys.keys) {
        const post = await env.COOLFROG_FORUM.get(key.name, { type: 'json' });
        allPosts.push(post);
    }

    return allPosts;
}

// Function to create a new page
export async function createNewPage(title, content, {env}) {
    try {
        // Get information to send to server, convert post to object to store
        const post = {
            title: title,
            content: content
        }
        const stringifiedPostContent = JSON.stringify(post);
        const postId = generateUniqueId();

        // Send information to server
        await env.COOLFROG_FORUM.put(postId, stringifiedPostContent);

        // Create a link to the new page and append it to the 'forum-posts' section
        /*
        const forumPostsSection = document.getElementById('forum-posts');
        const newPageLink = document.createElement('a');
        newPageLink.href = `/forum/${postId}`; // Update the path based on your URL structure
        newPageLink.textContent = title;
        const newPageElement = document.createElement('div');
        newPageElement.appendChild(newPageLink);
        forumPostsSection.appendChild(newPageElement);
        */
    } catch (error) {
        console.error('Error creating a new page:', error);
    }
}

// Attach functions to the window object to make them globally accessible
window.createNewPage = createNewPage;
window.getAllPosts = getAllPosts;