import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import { ResetPasswordForm } from './components/ResetPasswordForm.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/reset-password" element={<ResetPasswordForm />} />
        <Route path="/project/:shortId" element={<App />} />
        <Route path="/stakeholder/:shortId" element={<App />} />
        <Route path="/note/:shortId" element={<App />} />
        <Route path="/user-journey/:shortId" element={<App />} />
        <Route path="/user-story/:shortId" element={<App />} />
        <Route path="/theme/:shortId" element={<App />} />
        <Route path="/design/:shortId" element={<App />} />
        <Route path="/law-firm/:shortId" element={<App />} />
        <Route path="/law-firms" element={<App />} />
        <Route path="/themes" element={<App />} />
        <Route path="/stakeholders" element={<App />} />
        <Route path="/settings" element={<App />} />
        <Route path="/design-system" element={<App />} />
        <Route path="/workspace-dashboard" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
