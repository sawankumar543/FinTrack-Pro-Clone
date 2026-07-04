// auth.js

/**
 * Checks if the current page requires authentication and redirects accordingly.
 * @param {boolean} isProtectedPage - True for Dashboard, False for Login/Register pages.
 */
function checkAuth(isProtectedPage) {
    const user = localStorage.getItem('user');

    if (isProtectedPage && !user) {
        // If it's a protected page and no user is logged in, go to login
        window.location.replace('login.html');
    } else if (!isProtectedPage && user) {
        // If it's a public page and a user IS logged in, go to dashboard
        window.location.replace('index.html');
    }
}

/**
 * Registers a new user.
 * @param {string} username 
 * @param {string} password 
 * @param {string} currency - Default currency
 * @returns {object} { success: boolean, message: string }
 */
function registerUser(username, password, currency = '$') {
    // Fetch existing users or start a new array
    let users = JSON.parse(localStorage.getItem('registeredUsers')) || [];

    // Check if the username is already taken
    const userExists = users.some(u => u.username === username);
    if (userExists) {
        return { success: false, message: "Username already exists! Please choose another." };
    }

    // Save the new user
    const newUser = { username, password, currency };
    users.push(newUser);
    localStorage.setItem('registeredUsers', JSON.stringify(users));

    return { success: true, message: "Registration successful! You can now log in." };
}

/**
 * Verifies credentials and logs the user in.
 * @param {string} username 
 * @param {string} password 
 * @returns {object} { success: boolean, message: string }
 */
function loginUser(username, password) {
    // Fetch existing users
    let users = JSON.parse(localStorage.getItem('registeredUsers')) || [];

    // Find a user that matches both username and password
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        // Save the active session (we exclude the password for security best practices)
        const sessionUser = { username: user.username, currency: user.currency };
        localStorage.setItem('user', JSON.stringify(sessionUser));
        return { success: true, message: "Login successful!" };
    } else {
        return { success: false, message: "Invalid username or password." };
    }
}

/**
 * Clears the active session and redirects to login.
 */
function logoutUser() {
    localStorage.removeItem('user');
    window.location.replace('login.html');
}