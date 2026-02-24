import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthInit, RequireAuth } from '@/features/auth';
import { HeaderWithSettings } from '@/widgets/header-with-settings';
import {
  LoginPage,
  RegisterPage,
  MessengerLayout,
  ProfileEditPage,
  ChatPage,
  MessengerEmpty,
  ToastProvider,
} from '@/pages';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <MessengerLayout />
          </RequireAuth>
        }
      >
        <Route index element={<MessengerEmpty />} />
        <Route path="profile" element={<ProfileEditPage />} />
        <Route path="chat/:conversationId" element={<ChatPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthInit>
        <HeaderWithSettings>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </HeaderWithSettings>
      </AuthInit>
    </BrowserRouter>
  );
}
