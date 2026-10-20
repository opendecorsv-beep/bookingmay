'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginAction, logoutAction } from '@/app/actions';
import { AuthUser } from '@/lib/data';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Lock, LogIn, AlertCircle, Sparkles, UserCheck } from 'lucide-react';

interface AuthContextType {
  isLoggedIn: boolean;
  user: AuthUser | null;
  isStaffOnly: boolean;
  isSupervisorOrAdmin: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  user: null,
  isStaffOnly: false,
  isSupervisorOrAdmin: false,
  openLoginModal: () => {},
  closeLoginModal: () => {},
  logout: async () => {},
});

export function AuthProvider({ 
  children, 
  initialUser 
}: { 
  children: React.ReactNode; 
  initialUser: AuthUser | null;
}) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  const isLoggedIn = !!user;
  const isStaffOnly = user?.role === 'staff';
  const isSupervisorOrAdmin = user?.role === 'admin' || user?.role === 'supervisor';

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
      } else if (res?.user) {
        setUser(res.user);
        setIsModalOpen(false);
        // If staff logs in, direct to /nv
        if (res.user.role === 'staff') {
          window.location.href = '/nv';
        } else {
          window.location.reload();
        }
      } else {
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
    setUser(null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        user,
        isStaffOnly,
        isSupervisorOrAdmin,
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
              <DialogTitle className="text-xl">Đăng Nhập Hệ Thống</DialogTitle>
            </div>
            <DialogDescription className="text-slate-500 text-sm pt-1">
              Đăng nhập với vai trò Quản Lý, Giám Sát hoặc Nhân Viên để truy cập các tính năng tương ứng.
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
                placeholder="maybmt, gshuy, gsmai, gstien hoặc nhanvien"
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

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-500 space-y-1">
              <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Phân quyền tài khoản:</span>
              </div>
              <p>• <strong>Giám Sát (gshuy / gsmai / gstien):</strong> Cập nhật & ghi nhận CMS nhân viên.</p>
              <p>• <strong>Nhân Viên (nhanvien):</strong> Theo dõi bảng xếp hạng & thưởng CMS cá nhân.</p>
              <p>• <strong>Quản Lý (maybmt):</strong> Toàn quyền quản trị hệ thống.</p>
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

