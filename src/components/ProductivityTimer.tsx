import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { FiClock, FiAlertCircle } from 'react-icons/fi';

interface ProductivityTimerProps {
  username: string;
  isActive: boolean;
}

const ProductivityTimer: React.FC<ProductivityTimerProps> = ({ username, isActive }) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);

  // Fetch initial timer state and subscribe to changes
  useEffect(() => {
    if (!username || !isActive) return;

    const fetchTimer = async () => {
      try {
        const { data, error } = await supabase
          .from('user_productivity_timers')
          .select('timer_end_at')
          .eq('username', username)
          .single();

        if (data && data.timer_end_at) {
          calculateTimeLeft(data.timer_end_at);
        }
      } catch (err) {
        console.error('Failed to fetch productivity timer', err);
      }
    };

    fetchTimer();

    const channel = supabase
      .channel(`productivity_timer_${username}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_productivity_timers',
          filter: `username=eq.${username}`
        },
        (payload) => {
          if (payload.new && (payload.new as any).timer_end_at) {
            calculateTimeLeft((payload.new as any).timer_end_at);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [username, isActive]);

  const calculateTimeLeft = (endAtIso: string) => {
    const end = new Date(endAtIso).getTime();
    const now = new Date().getTime();
    const diff = Math.floor((end - now) / 1000);
    
    setTimeLeft(diff);
  };

  // Internal countdown interval
  useEffect(() => {
    if (!isActive || timeLeft === null) return;

    if (timeLeft <= 0) {
      // Waktu habis, mulai efek flash
      setIsFlashing(true);
      return;
    }

    setIsFlashing(false);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isActive]);

  if (!isActive || timeLeft === null) {
    return null; // Sembunyikan jika tidak aktif atau belum ada data/belum mulai
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isWarning = timeLeft <= 0;

  return (
    <div 
      className={`fixed top-[88px] left-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-lg shadow-sm border transition-all duration-700
        ${isWarning 
          ? (isFlashing ? 'bg-red-500 border-red-600 text-white animate-pulse shadow-red-200' : 'bg-red-50 border-red-200 text-red-600') 
          : 'bg-white border-slate-200 text-slate-700'}
      `}
    >
      {isWarning ? <FiAlertCircle className="w-4 h-4" /> : <FiClock className="w-4 h-4 text-emerald-500" />}
      <span className="font-mono font-bold tracking-wider">
        {formatTime(Math.max(0, timeLeft))}
      </span>
    </div>
  );
};

export default ProductivityTimer;
