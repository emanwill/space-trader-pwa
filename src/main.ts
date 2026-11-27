import { mount } from 'svelte';
import App from './ui/App.svelte';
import './ui/app.css';

const target = document.getElementById('app');
if (!target) throw new Error('Missing #app element');

export default mount(App, { target });
