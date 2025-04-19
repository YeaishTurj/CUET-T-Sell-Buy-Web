# CUET T-Sell & Buy

CUET T-Sell & Buy is a university-based T-shirt buying and selling platform, focused on implementing a robust Database Management System (DBMS). Built with Node.js, Express, and MySQL, it provides an organized and secure environment for CUET students to showcase, sell, and purchase T-shirts and pre-owned products.

---

## 📌 Introduction

Our project is a university-based T-shirt buying and selling platform “CUET T-Sell & Buy”, primarily focused on the implementation of a Database Management System (DBMS) to ensure efficient, well-organized, and accessible data handling. Utilizing MySQL, we aim to create a seamless user experience for students, where product listings, inventory, and user profiles are effectively managed. This project highlights our practical application of DBMS principles to solve real-world e-commerce challenges.

---

## 🎯 Motivation

Many CUET students run small businesses, especially T-shirt ventures, but the selling process is often unorganized. Our platform solves this problem by providing:

- A centralized, easy-to-use space for sellers and buyers.
- A structured experience that promotes student entrepreneurship.
- A marketplace for both new and pre-owned products via bidding.

---

## 🚀 Features

- User registration via CUET email (e.g., `u2104022@student.cuet.ac.bd`)
- Secure login and session management
- Sellers can:
  - Upload product details and images
  - Manage inventory
- Buyers can:
  - Browse, search, and filter products
  - Add items to cart
  - Directly contact sellers
- Bidding system for pre-owned products

---

## 🧑‍💻 Technologies Used

**Frontend**
- HTML
- CSS
- JavaScript

**Backend**
- Node.js
- Express.js

**Database**
- MySQL

**Version Control**
- Git

---

## ⚙️ Getting Started (Local Setup)

Follow these steps to run the project locally:

1. **Clone the repository**
    ```bash
    git clone https://github.com/YOUR_USERNAME/CUET-T-Sell-Buy-Web.git
    cd CUET-T-Sell-Buy-Web
    ```

2. **Install dependencies**
    ```bash
    npm install
    ```

3. **Environment setup**  
   Ensure the included `.env` file contains:
    ```env
    DB_HOST=localhost
    DB_USER=root
    DB_PASSWORD=
    DB_NAME=project
    PORT=55000
    ```

4. **Database setup using XAMPP**
    - Start Apache and MySQL
    - Go to phpMyAdmin → create a database named `project`
    - Import the SQL file `project.sql`

5. **Run the server**
    ```bash
    node app.js
    ```

6. **Access the app**
    Open in browser:
    ```
    http://localhost:55000
    ```

---

## 🔐 Authentication

- Only CUET email addresses are allowed for registration.
- Example: `u2104022@student.cuet.ac.bd`
- Users can register and log in to access full platform functionality.

---

## 📂 Project Structure (Example)

## 📂 Project Structure

```
├── .vscode/
├── node_modules/
├── uploads/
├── views/
├── .env
├── .gitignore
├── app.js
├── package-lock.json
├── package.json
├── project.sql
├── project_with_data.sql
└── README.md
```


---



## ❗Note

This project is intended for internal use within the CUET community. No license is associated with this repository.
