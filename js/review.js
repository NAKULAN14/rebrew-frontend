'use strict';

/* ============================================================
   REBREW — reviews.js
   Handles:
   - Star rating
   - Submit review
   - Load reviews
   - Review statistics
   ============================================================ */

let selectedRating = 5;

const reviewForm = document.getElementById("review-form");
const reviewContainer = document.getElementById("reviews-container");

const messageBox = document.getElementById("review-message");

const statsCustomers = document.querySelector(
    '[data-target="500"]'
);

const statsRating = document.querySelector(
    '[data-target="4"]'
);

const statsFlavours = document.querySelector(
    '[data-target="5"]'
);

const statsRestaurants = document.querySelector(
    '[data-target="30"]'
);
function initialiseStars() {

    const stars = document.querySelectorAll(".star-selector span");

    stars.forEach((star, index) => {

        star.addEventListener("click", () => {

            selectedRating = index + 1;

            stars.forEach((s, i) => {

                s.classList.toggle("active", i <= index);

            });

        });

    });

}
function showMessage(message, success = true) {

    if (!messageBox) return;

    messageBox.textContent = message;

    messageBox.style.color = success
        ? "green"
        : "crimson";

}
function clearMessage() {

    if (!messageBox) return;

    messageBox.textContent = "";

}
function setLoading(isLoading) {

    const btn = document.getElementById(
        "submit-review-btn"
    );

    if (!btn) return;

    btn.disabled = isLoading;

    btn.textContent = isLoading
        ? "Submitting..."
        : "Submit Review →";

}
async function submitReview(e) {

    e.preventDefault();

    clearMessage();

    setLoading(true);

    try {

        const payload = {

            name: document.getElementById("review-name").value.trim(),

            email: document.getElementById("review-email").value.trim(),

            city: document.getElementById("review-city").value.trim(),

            favoriteFlavor: document.getElementById("favorite-flavor").value,

            title: document.getElementById("review-title").value.trim(),

            rating: selectedRating,

            review: document.getElementById("review-text").value.trim()

        };

        const response = await fetch(`${API_BASE_URL}/reviews`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(payload)

        });

        const result = await response.json();

        if (!response.ok) {

            throw new Error(result.message);

        }

        showMessage(
            "Thank you! Your review has been published."
        );

        reviewForm.reset();
        loadReviews();

        selectedRating = 5;

        initialiseStars();

    } catch (error) {

        console.error(error);

        showMessage(
            error.message || "Unable to submit review.",
            false
        );

    }

    setLoading(false);

}
async function loadReviews() {

    if (!reviewContainer) return;

    reviewContainer.innerHTML = `
        <div class="loading-reviews">
            Loading reviews...
        </div>
    `;

    try {

        const response = await fetch(`${API_BASE_URL}/reviews`);

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Failed to load reviews.");
        }

        const reviews = result.data || [];
        console.log("Reviews array:", reviews);
        console.log(result);
        console.log(reviews);

        renderReviews(reviews);

        updateReviewStats(reviews);

    } catch (error) {

        console.error(error);

        reviewContainer.innerHTML = `
            <div class="empty-reviews">
                Unable to load reviews.
            </div>
        `;

    }

}
function renderReviews(reviews) {

    console.log("renderReviews START");

    reviewContainer.innerHTML = "";

    reviews.forEach((review, index) => {

        console.log("Rendering review", index);

        const card = document.createElement("div");

        card.style.background = "red";
        card.style.color = "white";
        card.style.padding = "20px";
        card.style.marginBottom = "20px";

        card.className = "review-card";

card.innerHTML = `
<div class="review-stars">★★★★★</div>

<h4>${review.title}</h4>

<p>${review.review}</p>

<div class="review-author">
    <div class="review-avatar">N</div>

    <div class="review-author-info">
        <h5>${review.name}</h5>
        <span>${review.city}</span>
    </div>
</div>
`;



        reviewContainer.appendChild(card);

        console.log("Card appended");

    });

    console.log("Final HTML:", reviewContainer.innerHTML);

}
console.log(reviewContainer.innerHTML);
function updateReviewStats(reviews) {

    if (!reviews.length) return;

    const avg =
        reviews.reduce(
            (sum, r) => sum + r.rating,
            0
        ) / reviews.length;

    if (statsCustomers)
        statsCustomers.textContent = reviews.length;

    if (statsRating)
        statsRating.textContent = avg.toFixed(1);

    if (statsFlavours)
        statsFlavours.textContent = 5;

}
document.addEventListener("DOMContentLoaded", () => {

    initialiseStars();

    reviewForm?.addEventListener(
        "submit",
        submitReview
    );
    loadReviews();

});