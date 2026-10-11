'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginAction, logoutAction } from '@/app/actions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Lock, LogIn, AlertCircle } from 'lucide-react';

interface AuthContextType {
  isLoggedIn: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  openLoginModal: () => {},
  closeLoginModal: () => {},
  logout: async () => {},
});

export function AuthProvider({ 
  children, 
  initialIsLoggedIn 
}: { 
  children: React.ReactNode; 
  initialIsLoggedIn: boolean;
}) {
  const [isLoggedIn, setIsLoggedIn] = useState(initialIsLoggedIn);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoggedIn(initialIsLoggedIn);
  }, [initialIsLoggedIn]);

  const openLoginModal = () => {
    setErrorMessage('');
    setUsername('');
    setPassword('');
    setIsModalOpen(true);
  };

  const closeLoginModal = () => {
    setIsModalOpen(false);
    setErrorMessage('');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await loginAction(username, password);
      if (res?.error) {
        setErrorMessage(res.error);
      } else {
        setIsLoggedIn(true);
        setIsModalOpen(false);
        // Refresh page to sync server components with new cookie
        window.location.reload();
      }
    } catch (err) {
      setErrorMessage('Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutAction();
    setIsLoggedIn(false);
    window.location.reload();
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        openLoginModal,
        closeLoginModal,
        logout: handleLogout,
      }}
    >
      {children}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-100 text-orange-600 rounded-full">
                <Lock className="w-5 h-5" />
              </div>
              <DialogTitle className="text-xl">Đăng Nhập Quản Lý</DialogTitle>
            </div>
            <DialogDescription className="text-slate-500 text-sm pt-1">
              Chỉ tài khoản quản lý mới có quyền tạo mới, chỉnh sửa, xóa hoặc thay đổi trạng thái các tiệc đặt bàn.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleLoginSubmit} className="space-y-4 pt-2">
            {errorMessage && (
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="auth-username">Tài khoản (ID)</Label>
              <Input
                id="auth-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập ID tài khoản..."
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="auth-password">Mật khẩu</Label>
              <Input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu..."
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeLoginModal} disabled={isLoading}>
                Hủy
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-1.5">
                <LogIn className="w-4 h-4" />
                {isLoading ? 'Đang kiểm tra...' : 'Đăng nhập'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
