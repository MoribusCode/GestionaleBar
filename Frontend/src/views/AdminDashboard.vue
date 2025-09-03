<script setup>
import { ref } from 'vue';
import axios from 'axios';

// Import icons (you can use any SVG icons you prefer)
const icons = {
    viewUsers: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
    createUser: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>`,
    deleteUser: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="18" y1="8" x2="23" y2="13"></line><line x1="23" y1="8" x2="18" y2="13"></line></svg>`,
    addItem: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>`
}

// Modal states
const showCreateUserModal = ref(false);
const showDeleteUserModal = ref(false);
const showAddItemModal = ref(false);
const showUsersModal = ref(false);

// Form data
const newUser = ref({ username: '', password: '', role: '' });
const deleteUserId = ref('');
const newItem = ref({ name: '', price: '', category: '' });
const usersList = ref([]);


async function handleCreate() {
    try {
        const res = await axios.post(`${import.meta.env.VITE_API_URL}/admin/create-user`, newUser.value, 
        { withCredentials: true }
        );
        console.log('User created: ', res.data)
        showCreateUserModal.value = false;
        newUser.value = { username: '', password: '', role: '' };

    } catch (error) {
        console.error('Error creating user: ', error);
    }
}

async function handleDelete(id) {
    try {
        const res = await axios.delete(`${import.meta.env.VITE_API_URL}/admin/delete/${id}`, 
        { withCredentials: true }
        );
        console.log('User deleted: ', res.data);
        deleteUserId.value = '';

    } catch (error) {
        console.error('Error deleting user: ', error);
    }
}

async function handleFetchUsers() {
    try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/admin/users`, 
        { withCredentials: true }
        );
        console.log('Users fetched successfully: ', res.data);
        usersList.value = res.data.users;
        showUsersModal.value = true;

        return res.data;

    } catch (error) {
        console.error('Error fetching users: ', error);
    }
}

async function handleItems(n, p, c) {
    try {
        const res = await axios.post(`${import.meta.env.VITE_API_URL}/admin/add-item`, {
            name: n,
            price: p,
            category: c
        }
        , { withCredentials: true }
        );
        console.log('Item added: ', res.data);

    } catch (error) {
        console.error('Error adding the new item: ', error);
    }
}   
</script>

<template>
    <div class="admin-view">
        <div class="dashboard-container">
            <h1>Admin Dashboard</h1>

            <div class="button-grid">
                <div class="dashboard-card" @click="handleFetchUsers">
                    <div class="icon" v-html="icons.viewUsers"></div>
                    <h3>View Users</h3>
                    <p>View all registered users in the system</p>
                </div>

                <div class="dashboard-card" @click="showCreateUserModal = true">
                    <div class="icon" v-html="icons.createUser"></div>
                    <h3>Create User</h3>
                    <p>Add a new user to the system</p>
                </div>

                <div class="dashboard-card" @click="showDeleteUserModal = true">
                    <div class="icon" v-html="icons.deleteUser"></div>
                    <h3>Delete User</h3>
                    <p>Remove a user from the system</p>
                </div>

                <div class="dashboard-card" @click="showAddItemModal = true">
                    <div class="icon" v-html="icons.addItem"></div>
                    <h3>Add Item</h3>
                    <p>Add new items to the inventory</p>
                </div>
            </div>
        </div>
    </div>

    <!-- Users List Modal -->
    <div v-if="showUsersModal" class="modal-overlay">
        <div class="modal-content users-modal">
            <h2>Users List</h2>
            <div class="users-list">
                <table v-if="usersList.length">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Username</th>
                            <th>Role</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="user in usersList" :key="user.id">
                            <td>{{ user.id }}</td>
                            <td>{{ user.username }}</td>
                            <td>{{ user.role }}</td>
                        </tr>
                    </tbody>
                </table>
                <p v-else>No users found</p>
            </div>
            <div class="modal-actions">
                <button @click="showUsersModal = false" class="cancel-btn">Close</button>
            </div>
        </div>
    </div>

    <!-- Create User Modal -->
    <div v-if="showCreateUserModal" class="modal-overlay">
        <div class="modal-content">
            <h2>Create New User</h2>
            <form @submit.prevent="handleCreate">
                <div class="form-group">
                    <label>Username:</label>
                    <input v-model="newUser.username" type="text" required>
                </div>
                <div class="form-group">
                    <label>Password:</label>
                    <input v-model="newUser.password" type="password" required>
                </div>
                <div class="form-group">
                    <label>Role:</label>
                    <select v-model="newUser.role" required>
                        <option value="admin">Admin</option>
                        <option value="cashier">Cassa</option>
                        <option value="food">Cibo</option>
                        <option value="beer">Spina</option>
                        <option value="drink">Drinks</option>
                    </select>
                </div>
                <div class="modal-actions">
                    <button type="submit" class="confirm-btn">Create</button>
                    <button type="button" @click="showCreateUserModal = false" class="cancel-btn">Cancel</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Delete User Modal -->
    <div v-if="showDeleteUserModal" class="modal-overlay">
        <div class="modal-content">
            <h2>Delete User</h2>
            <form @submit.prevent="handleDelete(deleteUserId)">
                <div class="form-group">
                    <label>User ID:</label>
                    <input v-model="deleteUserId" type="text" required>
                </div>
                <div class="modal-actions">
                    <button type="submit" class="confirm-btn">Delete</button>
                    <button type="button" @click="showDeleteUserModal = false" class="cancel-btn">Cancel</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Add Item Modal -->
    <div v-if="showAddItemModal" class="modal-overlay">
        <div class="modal-content">
            <h2>Add New Item</h2>
            <form @submit.prevent="handleItems(newItem.name, newItem.price, newItem.category)">
                <div class="form-group">
                    <label>Name:</label>
                    <input v-model="newItem.name" type="text" required>
                </div>
                <div class="form-group">
                    <label>Price:</label>
                    <input v-model="newItem.price" type="number" step="0.01" required>
                </div>
                <div class="form-group">
                    <label>Category:</label>
                    <input v-model="newItem.category" type="text" required>
                </div>
                <div class="modal-actions">
                    <button type="submit" class="confirm-btn">Add Item</button>
                    <button type="button" @click="showAddItemModal = false" class="cancel-btn">Cancel</button>
                </div>
            </form>
        </div>
    </div>
</template>

<style scoped>
.admin-view {
    min-height: 100vh;
    background-color: #f5f5f5;
    padding: 2rem;
}

.dashboard-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
}

h1 {
    color: #2c3e50;
    margin-bottom: 2rem;
    font-size: 2.5rem;
    text-align: center;
}

.button-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-top: 2rem;
}

.dashboard-card {
    background-color: white;
    padding: 2rem;
    border-radius: 15px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    cursor: pointer;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
}

.dashboard-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.icon {
    background-color: #3498db;
    color: white;
    padding: 1rem;
    border-radius: 12px;
    margin-bottom: 0.5rem;
}

h3 {
    color: #2c3e50;
    margin: 0;
    font-size: 1.25rem;
}

p {
    color: #666;
    margin: 0;
    font-size: 0.9rem;
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal-content {
    background-color: white;
    padding: 2rem;
    border-radius: 10px;
    width: 90%;
    max-width: 500px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.form-group {
    margin-bottom: 1rem;
}

.form-group label {
    display: block;
    margin-bottom: 0.5rem;
    color: #2c3e50;
}

.form-group input,
.form-group select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
}

.modal-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 1.5rem;
}

.confirm-btn,
.cancel-btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
}

.confirm-btn {
    background-color: #3498db;
    color: white;
}

.cancel-btn {
    background-color: #e74c3c;
    color: white;
}

.confirm-btn:hover {
    background-color: #2980b9;
}

.cancel-btn:hover {
    background-color: #c0392b;
}

.users-modal {
    max-width: 800px;
}

.users-list {
    margin: 1rem 0;
    max-height: 400px;
    overflow-y: auto;
}

table {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
}

th, td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid #ddd;
}

th {
    background-color: #f8f9fa;
    font-weight: 600;
    color: #2c3e50;
}

tr:hover {
    background-color: #f5f5f5;
}

/* SVG styles */
.icon svg {
    width: 30px;
    height: 30px;
    display: block;
}

@media (max-width: 768px) {
    .button-grid {
        grid-template-columns: 1fr;
    }
}

</style>