// Handle login form submission
document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent default form submission

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    // Simulate login check (for now just an alert)
    if (email === "test@example.com" && password === "password123") {
        alert("Login successful!");
    } else {
        alert("Invalid login credentials!");
    }
});

// Handle registration form submission
document.getElementById('registerForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent default form submission

    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    // Simulate a successful registration (just showing an alert for now)
    alert(`Registration successful for ${name}!`);
});
