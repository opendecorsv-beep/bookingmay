'use client';

import { useTransition, useState } from 'react';
import { setReceptionStatus, setKitchenStatus, setFloorStatus } from '@/app/actions';
import { TaskStatus } from '@/lib/data';

import { useAuth } from '@/context/AuthContext';

type Role = 'reception' | 'kitchen' | 'floor';

interface Props {
  id: string;
  role: Role;
  currentStatus: TaskStatus;
}

export default function StatusSelect({ id, role, currentStatus }: Props) {
  const { isLoggedIn, openLoginModal } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useState<TaskStatus>(currentStatus);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!isLoggedIn) {
      openLoginModal();
      return;
    }
    const newStatus = e.target.value as TaskStatus;
    setOptimisticStatus(newStatus); // Optimistic UI update
    startTransition(() => {
      if (role === 'reception') setReceptionStatus(id, newStatus);
      if (role === 'kitchen') setKitchenStatus(id, newStatus);
      if (role === 'floor') setFloorStatus(id, newStatus);
    });
  };

  const statusToRender = isPending ? optimisticStatus : currentStatus;

  const getColors = () => {
    if (statusToRender === 'done') return "bg-green-100 text-green-800 border-green-200";
    if (statusToRender === 'in_progress') return "bg-yellow-100 text-yellow-800 border-yellow-200";
    if (statusToRender === 'clean') return "bg-blue-100 text-blue-800 border-blue-200";
    return "bg-slate-100 text-slate-800 border-slate-200";
  };

  if (!isLoggedIn) {
    const labels: Record<TaskStatus, string> = {
      pending: "Chờ xử lý",
      in_progress: "Đang làm",
      done: "Hoàn thành",
      clean: "Dọn xong"
    };
    return (
      <span 
        onClick={openLoginModal}
        title="Đăng nhập tài khoản maybmt để thay đổi"
        className={`inline-block text-xs font-semibold py-0.5 px-2.5 rounded-full border cursor-pointer hover:opacity-80 transition-opacity ${getColors()}`}
      >
        {labels[statusToRender] || statusToRender}
      </span>
    );
  }

  return (
    <select 
      value={statusToRender} 
      onChange={handleChange}
      disabled={isPending}
      className={`appearance-none text-xs font-semibold py-1 pl-2 pr-6 rounded-full border outline-none cursor-pointer bg-no-repeat ${getColors()} ${isPending ? 'opacity-70' : ''}`}
      style={{
        backgroundPosition: 'right 0.3rem center',
        backgroundSize: '1em',
        backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`
      }}
    >
      <option value="pending" className="bg-white text-slate-800">Chờ xử lý</option>
      <option value="in_progress" className="bg-white text-slate-800">Đang làm</option>
      <option value="done" className="bg-white text-slate-800">Hoàn thành</option>
      {role === 'reception' && <option value="clean" className="bg-white text-slate-800">Dọn xong (Clean)</option>}
    </select>
  );
}
