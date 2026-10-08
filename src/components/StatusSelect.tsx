'use client';

import { useTransition } from 'react';
import { setReceptionStatus, setKitchenStatus, setFloorStatus } from '@/app/actions';
import { TaskStatus } from '@/lib/data';

type Role = 'reception' | 'kitchen' | 'floor';

interface Props {
  id: string;
  role: Role;
  currentStatus: TaskStatus;
}

export default function StatusSelect({ id, role, currentStatus }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as TaskStatus;
    startTransition(() => {
      if (role === 'reception') setReceptionStatus(id, newStatus);
      if (role === 'kitchen') setKitchenStatus(id, newStatus);
      if (role === 'floor') setFloorStatus(id, newStatus);
    });
  };

  const getColors = () => {
    if (currentStatus === 'done') return "bg-green-100 text-green-800 border-green-200";
    if (currentStatus === 'in_progress') return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-slate-100 text-slate-800 border-slate-200";
  };

  return (
    <select 
      value={currentStatus} 
      onChange={handleChange}
      disabled={isPending}
      className={`appearance-none text-xs font-semibold py-1 pl-2 pr-6 rounded-full border outline-none cursor-pointer bg-no-repeat ${getColors()} ${isPending ? 'opacity-50' : ''}`}
      style={{
        backgroundPosition: 'right 0.3rem center',
        backgroundSize: '1em',
        backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`
      }}
    >
      <option value="pending" className="bg-white text-slate-800">Chờ xử lý</option>
      <option value="in_progress" className="bg-white text-slate-800">Đang làm</option>
      <option value="done" className="bg-white text-slate-800">Hoàn thành</option>
    </select>
  );
}
