'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { setBookingStatus } from '@/app/actions';
import { useAuth } from '@/context/AuthContext';
import { Check } from 'lucide-react';

export default function ConfirmBookingButton({ id }: { id: string }) {
  const { isLoggedIn, openLoginModal } = useAuth();
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    if (!isLoggedIn) {
      openLoginModal();
      return;
    }
    startTransition(async () => {
      await setBookingStatus(id, 'confirmed');
    });
  };

  return (
    <Button 
      type="button" 
      onClick={handleConfirm}
      disabled={isPending}
      variant="outline" 
      size="sm" 
      className="text-green-600 border-green-200 hover:bg-green-50 flex items-center gap-1"
    >
      <Check className="w-3.5 h-3.5" />
      {isPending ? 'Đang chốt...' : 'Xác nhận Tiệc'}
    </Button>
  );
}
