import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { FiInfo } from 'react-icons/fi';

interface ScheduleDay {
    s1: string;
    s2: string;
}

interface ScheduleConfig {
    [key: string]: ScheduleDay;
}

const RunningTextBar: React.FC = () => {
    const [isActive, setIsActive] = useState(false);
    const [message, setMessage] = useState('');
    const [schedule, setSchedule] = useState<ScheduleConfig | null>(null);
    const [showMarquee, setShowMarquee] = useState(false);

    const fetchConfig = async () => {
        try {
            const { data, error } = await supabase
                .from('running_text_settings')
                .select('*')
                .eq('id', 1)
                .single();
            if (!error && data) {
                setIsActive(data.is_active);
                setMessage(data.message_template);
                setSchedule(data.schedule_config);
                localStorage.setItem('cache_running_text', JSON.stringify(data));
            } else {
                throw error || new Error("No data");
            }
        } catch (error) {
            console.error('Error fetching running text config:', error);
            const cached = localStorage.getItem('cache_running_text');
            if (cached) {
                try {
                    const data = JSON.parse(cached);
                    setIsActive(data.is_active);
                    setMessage(data.message_template);
                    setSchedule(data.schedule_config);
                } catch(e) {}
            }
        }
    };

    useEffect(() => {
        fetchConfig();

        const channel = supabase
            .channel('public:running_text_settings')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'running_text_settings', filter: 'id=eq.1' },
                (payload) => {
                    const data = payload.new as any;
                    if (data) {
                        setIsActive(data.is_active);
                        setMessage(data.message_template);
                        setSchedule(data.schedule_config);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    useEffect(() => {
        const checkTime = () => {
            if (!isActive || !schedule) {
                setShowMarquee(false);
                return;
            }

            const now = new Date();
            const dayKey = now.getDay().toString(); // 0 = Sunday, 1 = Monday ...
            const todayConfig = schedule[dayKey];

            if (!todayConfig) {
                setShowMarquee(false);
                return;
            }

            const parseTime = (timeStr: string) => {
                const [hours, minutes] = timeStr.split(':').map(Number);
                const d = new Date();
                d.setHours(hours, minutes, 0, 0);
                return d.getTime();
            };

            const checkShift = (shiftTimeStr: string) => {
                if (!shiftTimeStr) return false;
                const shiftTime = parseTime(shiftTimeStr);
                const beforeMs = 30 * 60 * 1000; // 30 mins
                const afterMs = 10 * 60 * 1000;  // 10 mins
                const start = shiftTime - beforeMs;
                const end = shiftTime + afterMs;
                return now.getTime() >= start && now.getTime() <= end;
            };

            if (checkShift(todayConfig.s1) || checkShift(todayConfig.s2)) {
                setShowMarquee(true);
            } else {
                setShowMarquee(false);
            }
        };

        checkTime();
        const interval = setInterval(checkTime, 60000); // Check every minute
        return () => clearInterval(interval);
    }, [isActive, schedule]);

    if (!showMarquee || !message) return null;

    return (
        <div className="bg-gray-900 text-amber-400 shadow-md relative overflow-hidden flex items-center h-10 border-b border-amber-500/30 z-10">
            {/* Left Static Icon - Using single clip-path to avoid gaps */}
            <div 
                className="absolute left-0 top-0 bottom-0 bg-amber-500 z-10 pl-4 pr-8 flex items-center justify-center shadow-[4px_0_15px_rgba(0,0,0,0.5)]"
                style={{ clipPath: 'polygon(0 0, 100% 0, calc(100% - 12px) 100%, 0 100%)' }}
            >
                <div className="flex items-center gap-2 font-black uppercase tracking-widest text-[11px] text-gray-900">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gray-900 opacity-60"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gray-900"></span>
                    </span>
                    INFO SHIFT
                </div>
            </div>

            {/* Marquee Container */}
            <div className="flex-1 overflow-hidden whitespace-nowrap ml-[110px]">
                <div className="inline-block animate-marquee pl-[100%] pr-4 font-semibold tracking-wide text-[13px] py-2 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]">
                    {message}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes marquee {
                    0% { transform: translateX(0%); }
                    100% { transform: translateX(-100%); }
                }
                .animate-marquee {
                    animation: marquee 25s linear infinite;
                    will-change: transform;
                }
                .animate-marquee:hover {
                    animation-play-state: paused;
                }
            `}} />
        </div>
    );
};

export default RunningTextBar;
