document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const userInfoDiv = document.getElementById("user-info");
  const userForm = document.getElementById("user-form");
  const userEmailInput = document.getElementById("user-email");
  const userRoleSelect = document.getElementById("user-role");

  let currentUser = null; // { email, role }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}&user_email=${encodeURIComponent(currentUser.email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser) {
      messageDiv.textContent = "You must be logged in to sign up.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}&user_email=${encodeURIComponent(currentUser.email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // User handling functions
  function saveUser(user) {
    currentUser = user;
    localStorage.setItem("user", JSON.stringify(user));
    renderUserInfo();
    renderSignupAvailability();
  }

  function loadUser() {
    const u = localStorage.getItem("user");
    if (u) {
      try {
        currentUser = JSON.parse(u);
      } catch {
        currentUser = null;
      }
    }
    renderUserInfo();
    renderSignupAvailability();
  }

  function renderUserInfo() {
    if (currentUser) {
      userInfoDiv.textContent = `Logged in as ${currentUser.email} (${currentUser.role})`;
      userForm.classList.add("hidden");
    } else {
      userInfoDiv.textContent = "Not logged in";
      userForm.classList.remove("hidden");
    }
  }

  function renderSignupAvailability() {
    if (!currentUser || (currentUser.role !== "Parent" && currentUser.role !== "Admin")) {
      signupForm.classList.add("hidden");
    } else {
      signupForm.classList.remove("hidden");
    }
  }

  userForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = userEmailInput.value;
    const role = userRoleSelect.value;

    try {
      const resp = await fetch(`/users/register?email=${encodeURIComponent(email)}&role=${encodeURIComponent(role)}`, {
        method: "POST",
      });

      if (!resp.ok) {
        // if user already exists, just log in
        if (resp.status === 400) {
          const loginResp = await fetch(`/users/login?email=${encodeURIComponent(email)}`, {
            method: "POST",
          });
          if (loginResp.ok) {
            const user = await loginResp.json();
            saveUser({ email, role: user.role });
          }
          return;
        }
        const err = await resp.json();
        messageDiv.textContent = err.detail || "Error registering";
        messageDiv.className = "error";
        messageDiv.classList.remove("hidden");
        return;
      }

      const data = await resp.json();
      saveUser({ email, role });
    } catch (e) {
      console.error("register error", e);
    }
  });

  // Initialize app
  loadUser();
  fetchActivities();
});
