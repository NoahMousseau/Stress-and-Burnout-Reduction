class VideoModal {
	// Constructor to initialize the modal with necessary DOM elements
	constructor(modalId, videoFrameId, closeButtonClass, videoCardClass) {
		this.modal = document.getElementById(modalId);
		this.videoFrame = document.getElementById(videoFrameId);
		this.closeButton = document.getElementsByClassName(closeButtonClass)[0];
		this.videoCards = document.querySelectorAll(videoCardClass);
		this.init(); // Initialize the modal functionality
	}

	// Initialize the modal by attaching event listeners
	init() {
		this.attachVideoCardsEvents();
		this.attachCloseButtonEvent();
		this.attachWindowClickEvent();
	}

	// Attach click event listeners to each video card
	attachVideoCardsEvents() {
		this.videoCards.forEach(videoCard => {
			videoCard.addEventListener('click', (e) => {
				e.preventDefault();
				this.openModal(videoCard.getAttribute("data-video-url"));
			});
		});
	}

	// Function to open the modal and play the video
	openModal(videoUrl) {
		const embedUrl = this.transformVideoUrl(videoUrl); // Transform the video URL for embedding
		this.videoFrame.src = `${embedUrl}?autoplay=1&rel=0`;
		this.modal.style.display = "block";
	}

	transformVideoUrl(videoUrl) {
		return videoUrl.replace("watch?v=", "embed/");
	}

	// Attach an event listener to the close button to close the modal
	attachCloseButtonEvent() {
		this.closeButton.onclick = () => {
			this.closeModal();
		};
	}

	// Attach an event listener to the window to close the modal when clicking outside of it
	attachWindowClickEvent() {
		window.onclick = (event) => {
			if (event.target === this.modal) {
				this.closeModal();
			}
		};
	}

	// Function to close the modal
	closeModal() {
		this.modal.style.display = "none";
		this.videoFrame.src = "";
	}

	attachLikeButtonEvents() {
		const likeButtons = document.querySelectorAll('.like-btn');
		likeButtons.forEach(button => {
			button.addEventListener('click', (e) => {
				e.stopPropagation(); // Prevent triggering card click events
				this.handleLikeButtonClick(e.target);
			});
		});
	}

	handleLikeButtonClick(button) {
		const videoId = button.closest('.video-card').getAttribute('data-video-id');
		const isLiked = button.classList.contains('liked');
		const action = isLiked ? 'unlike' : 'like';
		const url = `/videos/${videoId}/${action}`;

		fetch(url, {
				method: 'POST'
			})
			.then(response => response.json())
			.then(data => {
				const likeCountElement = button.nextElementSibling;
				likeCountElement.textContent = `${data.likes} Likes`;
				button.classList.toggle('liked', !isLiked);

				// Update the button's icon and text based on the liked/unliked state
				if (!isLiked) {
					button.innerHTML = '<i class="fa-solid fa-heart"></i> Liked';
				} else {
					button.innerHTML = '<i class="fa-regular fa-heart"></i> Like';
				}
			})
			.catch(error => console.error('Error:', error));
	}
}

document.addEventListener('DOMContentLoaded', function() {
	const videoModal = new VideoModal("modal", "videoFrame", "close", ".video-card");
	videoModal.attachLikeButtonEvents(); // Attach like button events after DOM is loaded

	// Search functionality
	const searchInput = document.getElementById('searchInput');
	const videoCards = document.querySelectorAll('.video-card');
	const videoInfos = document.querySelectorAll('.video-info');

	searchInput.addEventListener('input', () => {
		const searchQuery = searchInput.value.toLowerCase();

		videoCards.forEach((card, index) => {
			const title = videoInfos[index].querySelector('h3').textContent.toLowerCase();
			const description = videoInfos[index].querySelector('p').textContent.toLowerCase();
			const isVisible = title.includes(searchQuery) || description.includes(searchQuery);
			card.style.display = isVisible ? '' : 'none';
		});
	});
});


document.addEventListener('DOMContentLoaded', function() {
	const videoModal = new VideoModal("modal", "videoFrame", "close", ".video-card");
	videoModal.attachLikeButtonEvents(); // Attach like button events after DOM is loaded
});

module.exports = VideoModal;