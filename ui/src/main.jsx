import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import AboutUs from './AboutUs.jsx';
import './styles.css';

function currentPage() {
    return window.location.hash === '' || window.location.hash === '#inicio' ? 'game' : 'about';
}

function AppRouter() {
    const [page, setPage] = useState(currentPage);

    useEffect(() => {
        const handleHashChange = () => setPage(currentPage());
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    return page === 'about' ? <AboutUs /> : <App />;
}

createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <AppRouter />
    </React.StrictMode>,
);