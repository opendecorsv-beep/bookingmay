'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { deleteBookingAction } from '@/app/actions';

export default function DeleteBookingButton({ id, customerName }: { id: string, customerName: string }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (window.confirm(`Bạn có chắc chắn muốn HỦY và XÓA tiệc của khách ${customerName.replace(/\[S?VIP\] /g, '')} không? Hành động này không thể hoàn tác.`)) {
      startTransition(() => {
        deleteBookingAction(id);
      });
    }
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={handleDelete}
      disabled={isPending}
      className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
      title="Hủy / Xóa tiệc"
    >
      <Trash2 className="w-4 h-4" />
    </Button>
  );
}
