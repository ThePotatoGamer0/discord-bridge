import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ContextMenuProvider } from './context/ContextMenuContext';
import { CurrentGuildProvider } from './context/CurrentGuildContext';
import { EmojiPickerProvider } from './context/EmojiPickerContext';
import { UserProfileProvider } from './context/UserProfileContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Verify from './pages/Verify';
import Chat from './pages/Chat';
import AccountLinks from './pages/AccountLinks';
import TOS from './pages/TOS';
import Privacy from './pages/Privacy';

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ContextMenuProvider>
          <CurrentGuildProvider>
          <EmojiPickerProvider>
          <UserProfileProvider>
            <Routes>
              <Route path="/login"    element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify"   element={
                <ProtectedRoute><Verify /></ProtectedRoute>
              } />
              <Route path="/chat"     element={
                <ProtectedRoute requireVerified><Chat /></ProtectedRoute>
              } />
              <Route path="/links"    element={
                <ProtectedRoute requireVerified><AccountLinks /></ProtectedRoute>
              } />
              <Route path="/tos" element={<TOS />} />
              <Route path="/pp"  element={<Privacy />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </UserProfileProvider>
          </EmojiPickerProvider>
          </CurrentGuildProvider>
        </ContextMenuProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}