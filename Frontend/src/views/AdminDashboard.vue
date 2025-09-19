<script setup>
import { ref } from 'vue';
import axios from 'axios';
import { API_BASE_URL } from '@/store';

// Import icons (you can use any SVG icons you prefer)
const icons = {
    viewUsers: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
    createUser: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>`,
    viewItems: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"></path><polygon points="18 2 22 6 12 16 8 16 8 12 18 2"></polygon></svg>`,
    addItem: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>`
}

// Modal states
const showUsersModal = ref(false);
const showCreateUserModal = ref(false);
const showItemsModal = ref(false);
const showAddItemModal = ref(false);


// Form data
const newUser = ref({ username: '', password: '', role: '' });
const itemsList = ref([]);
const newItem = ref({ name: '', price: '', category: '' });
const usersList = ref([]);


async function handleFetchItems() {
    try {
        const res = await axios.get(`${API_BASE_URL}/items`,
            { withCredentials: true }
        );
        itemsList.value = res.data.items;
        showItemsModal.value = true;
    } catch (error) {
        console.error('Error fetching items: ', error);
    }
}

async function handleDeleteItem(id) {
    try {
        const confirmed = window.confirm('Are you sure you want to delete this item?');
        if (!confirmed) return;

        const res = await axios.delete(`${API_BASE_URL}/delete-item/${id}`,
            { withCredentials: true }
        );

        if (res.status === 200) {
            itemsList.value = itemsList.value.filter(item => item.id !== id);
            console.log('Item deleted successfully');
        }
    } catch (error) {
        console.error('Error deleting item: ', error);
    }
}

async function handleCreate() {
    try {
        const res = await axios.post(`${API_BASE_URL}/create-user`, newUser.value,
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
        const confirmed = window.confirm('Are you sure you want to delete this user?');
        if (!confirmed) return;

        const res = await axios.delete(`${API_BASE_URL}/delete-user/${id}`,
            { withCredentials: true }
        );

        if (res.status === 200) {
            usersList.value = usersList.value.filter(user => user.id !== id);
            console.log('User deleted successfully: ', res.data);
        } else {
            console.error('Failed to delete user: ', res);
        }

    } catch (error) {
        console.error('Error deleting user: ', error);
    }
}

async function handleFetchUsers() {
    try {
        const res = await axios.get(`${API_BASE_URL}/users`,
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
        const res = await axios.post(`${API_BASE_URL}/add-item`, {
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
                    <h3>Utenti</h3>
                    <p>Visualizza tutti gli utetnti del sistema</p>
                </div>

                <div class="dashboard-card" @click="showCreateUserModal = true">
                    <div class="icon" v-html="icons.createUser"></div>
                    <h3>Crea Utente</h3>
                    <p>Aggiungi un nuovo utente al sistema</p>
                </div>

                <div class="dashboard-card" @click="handleFetchItems">
                    <div class="icon" v-html="icons.viewItems"></div>
                    <h3>Inventario</h3>
                    <p>Visualizza e gestisci tutti gli articoli nell'inventario</p>
                </div>

                <div class="dashboard-card" @click="showAddItemModal = true">
                    <div class="icon" v-html="icons.addItem"></div>
                    <h3>Aggiungi Articolo</h3>
                    <p>Aggiungi un nuovo articolo all'inventario</p>
                </div>
            </div>
        </div>

        <router-link to="/" class="home-link">
            <h2>Home</h2>
        </router-link>
    </div>

    <!-- Users List Modal -->
    <div v-if="showUsersModal" class="modal-overlay">
        <div class="modal-content users-modal">
            <h2>Lista Utenti</h2>
            <div class="users-list">
                <table v-if="usersList.length">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Username</th>
                            <th>Ruolo</th>
                            <th>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="user in usersList" :key="user.id">
                            <td>{{ user.id }}</td>
                            <td>{{ user.username }}</td>
                            <td>{{ user.role }}</td>
                            <td>
                                <button @click="handleDelete(user.id)" class="cancel-btn">
                                    Delete
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <p v-else>Nessun utente trovato</p>
            </div>
            <div class="modal-actions">
                <button @click="showUsersModal = false" class="cancel-btn">Chiudi</button>
            </div>
        </div>
    </div>

    <!-- Create User Modal -->
    <div v-if="showCreateUserModal" class="modal-overlay">
        <div class="modal-content">
            <h2>Crea un nuovo utente</h2>
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
                    <label>Ruolo:</label>
                    <select v-model="newUser.role" required>
                        <option value="admin">Admin</option>
                        <option value="cashier">Cassa</option>
                        <option value="food">Cibo</option>
                        <option value="beer">Spina</option>
                        <option value="bar">Bar</option>
                        <option value="drink">Drinks</option>
                    </select>
                </div>
                <div class="modal-actions">
                    <button type="submit" class="confirm-btn">Crea</button>
                    <button type="button" @click="showCreateUserModal = false" class="cancel-btn">Chiudi</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Items List Modal -->
    <div v-if="showItemsModal" class="modal-overlay">
        <div class="modal-content users-modal">
            <h2>Lista Articoli</h2>
            <div class="users-list">
                <table v-if="itemsList.length">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nome</th>
                            <th>Prezzo</th>
                            <th>Categoria</th>
                            <th>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="item in itemsList" :key="item.id">
                            <td>{{ item.id }}</td>
                            <td>{{ item.name }}</td>
                            <td>€{{ item.price.toFixed(2) }}</td>
                            <td>{{ item.category }}</td>
                            <td>
                                <button 
                                    @click="handleDeleteItem(item.id)" 
                                    class="cancel-btn"
                                >
                                    Rimuovi
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <p v-else>Nessun articolo trovato</p>
            </div>
            <div class="modal-actions">
                <button @click="showItemsModal = false" class="cancel-btn">Chiudi</button>
            </div>
        </div>
    </div>

    <!-- Add Item Modal -->
    <div v-if="showAddItemModal" class="modal-overlay">
        <div class="modal-content">
            <h2>Aggiungi nuovo articolo</h2>
            <form @submit.prevent="handleItems(newItem.name, newItem.price, newItem.category)">
                <div class="form-group">
                    <label>Nome:</label>
                    <input v-model="newItem.name" type="text" required>
                </div>
                <div class="form-group">
                    <label>Prezzo:</label>
                    <input v-model="newItem.price" type="number" step="0.01" required>
                </div>
                <div class="form-group">
                    <label>Categoria:</label>
                    <select v-model="newUser.role" required>
                        <option value="food">Cicchetti</option>
                        <option value="beer">Spina</option>
                        <option value="bar">Bar</option>
                        <option value="drink">Drinks</option>
                    </select>
                </div>
                <div class="modal-actions">
                    <button type="submit" class="confirm-btn">Aggiungi</button>
                    <button type="button" @click="showAddItemModal = false" class="cancel-btn">Chiudi</button>
                </div>
            </form>
        </div>
    </div>
</template>

<style scoped>
.admin-view {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    min-height: 100vh;
}

.dashboard-container {
    max-width: 1200px;
    margin: 0 auto;
}

h1 {
    color: 4A4A4A;
    margin-bottom: 2rem;
    font-size: 2.5rem;
    font-weight: 700;
    text-align: center;
}

.button-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-top: 2rem;
}

.dashboard-card {
    background: #4A4A4A;
    border-radius: 20px;
    padding: 2.5rem;
    text-decoration: none;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    aspect-ratio: 1;
    justify-content: center;
    gap: 0.75rem;
    cursor: pointer;
}

.dashboard-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.icon {
    color: white;
    margin-bottom: 0.5rem;
}

h2 {
    color: black;
    text-align: center;
    margin: 0;
    font-size: 1.2rem;
    font-weight: 600;
}

h3 {
    color: white;
    margin: 0;
    font-size: 1.75rem;
    font-weight: 500;
}

p {
    color: rgba(255, 255, 255, 0.8);
    margin: 0;
    font-weight: 500;
    font-size: 1rem;
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal-content {
    background-color: #2c2c2c;
    padding: 2.5rem;
    border-radius: 20px;
    width: 90%;
    max-width: 500px;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
    color: white;

}

.modal-content h2 {
    color: white;
    font-size: 1.75rem;
    margin-bottom: 1.5rem;
    text-align: center;
}

.form-group {
    margin-bottom: 1.5rem;
}

.form-group label {
    display: block;
    margin-bottom: 0.5rem;
    color: rgba(255, 255, 255, 0.9);
    font-size: 1rem;
}

.form-group input,
.form-group select {
    width: 100%;
    padding: 0.75rem;
    background-color: #3a3a3a;
    border: 1px solid #4a4a4a;
    border-radius: 10px;
    font-size: 1rem;
    color: white;
    transition: border-color 0.2s ease;
}

.form-group select option {
    background-color: #2c2c2c;
    color: white;
}

.modal-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 2rem;
}

.confirm-btn,
.cancel-btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    transition: all 0.2s ease;
}

.confirm-btn {
    border-style: solid;
    border-color: white;
    border-width: 1px;
    background-color: #2c2c2c;
    color: white;
}

.cancel-btn {
    background-color: var(--primary-color);
    color: white;
}

.confirm-btn:hover {
    transform: translateY(-2px);
}

.cancel-btn:hover {
    background-color: var(--primary-hover);
    transform: translateY(-2px);
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
    border-collapse: separate;
    border-spacing: 0;
    margin: 1rem 0;
    background-color: #2c2c2c;
}

th {
    background-color: #3a3a3a;
    color: white;
    font-weight: 500;
    padding: 1rem;
    text-align: left;
    border-bottom: 2px solid #4a4a4a;
}

td {
    padding: 1rem;
    color: rgba(255, 255, 255, 0.9);
    border-bottom: 1px solid #4a4a4a;
}

tr:hover {
    background-color: #3a3a3a;
}

.home-link {
    display: block;
    text-align: center;
    padding: 1rem;
    color: rgba(0, 0, 0, 0.8);
    text-decoration: none;
    background: #f1f1f1;
    border-radius: 12px;
    margin: 0 auto;
    max-width: 200px;
    margin-top: 30px;
    transition: all 0.3s ease;
}

.home-link:hover {
    transform: translateY(-2px);
}

/* SVG styles */
.icon svg {
    width: 30px;
    height: 30px;
    display: block;
}

@media (max-width: 768px) {
    .admin-view {
        padding: 4rem 1rem 1rem 1rem;
        position: relative;
        z-index: 1;
        width: 100%;
        left: 0;
    }

    .button-grid {
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 1rem;
        width: 100%;
    }

    .dashboard-card {
        padding: 1rem;
        aspect-ratio: 1;
        max-width: 180px;
        width: 100%;
    }

    .modal-content {
        padding: 1.5rem;
        margin: 1rem;
    }

    .users-modal {
        padding: 1rem;
    }

    table {
        font-size: 0.9rem;
    }

    th, td {
        padding: 0.75rem;
    }

    .confirm-btn,
    .cancel-btn {
        padding: 0.5rem 1rem;
        font-size: 0.9rem;
    }

    h3 {
        font-size: 1.2rem;
    }

    p {
        font-size: 0.9rem;
    }

    .icon {
        font-size: 2rem !important;
    }
}
</style>