import { ref } from 'vue';

export const addedToOrder = ref([]);

export const API_BASE_URL = `${window.location.protocol}//${window.location.host}/api`;
export const BASE_URL = `${window.location.protocol}//${window.location.host}`;
export const SOCKET_PATH = '/api/socket.io';
export const SOCKET_URL = `${window.location.protocol}//${window.location.host}`;