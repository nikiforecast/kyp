import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import { PublicUserJourneyView } from './components/PublicUserJourneyView.tsx';
import { ResetPasswordForm } from './components/ResetPasswordForm.tsx';
import { AuthProvider } from './hooks/useAuth.ts';
import './index.css';


const root = createRoot(document.getElementById('root')!);

root.render(
  <StrictMode>
    <BrowserRouter>
    <AuthProvider>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/reset-password" element={<ResetPasswordForm />} />
      <Route path="/public/user-journey/:publicId" element={<PublicUserJourneyView />} />
      <Route path="/project/:shortId" element={<App />} />
      <Route path="/stakeholder/:shortId" element={<App />} />
      <Route path="/note/:shortId" element={<App />} />
      <Route path="/user-story/:shortId" element={<App />} />
      <Route path="/design/:shortId" element={<App />} />
      <Route path="/law-firm/:shortId" element={<App />} />
      <Route path="/law-firms" element={<App />} />
      <Route path="/user-journey/:shortId" element={<App />} />
      <Route path="/user-journeys/:folderSlug" element={<App />} />
      <Route path="/user-journeys" element={<App />} />
      <Route path="/user-journey-creator" element={<App />} />
      <Route path="/stakeholders" element={<App />} />
      <Route path="/settings" element={<App />} />
      <Route path="/design-system" element={<App />} />
    </Routes>
    </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
