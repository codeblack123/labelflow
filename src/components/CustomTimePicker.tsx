import React, { useEffect, useRef, useState } from 'react';
import { FiClock, FiChevronDown } from 'react-icons/fi';

interface CustomTimePickerProps {
    value: string; // Format "HH:mm:ss" or ""
    onChange: (val: string) => void;
    placeholder?: string;
    onClear?: () => void;
}

const CustomTimePicker: React.FC<CustomTimePickerProps> = ({ value, onChange, placeholder = "Pilih Waktu", onClear }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Parse current value
    const parseTime = (val: string) => {
        if (!val) return { h: 0, m: 0, s: 0 };
        const [h, m, s] = val.split(':').map(Number);
        return { h: h || 0, m: m || 0, s: s || 0 };
    };

    const { h, m, s } = parseTime(value);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = Array.from({ length: 60 }, (_, i) => i);
    const seconds = Array.from({ length: 60 }, (_, i) => i);

    const handleSelect = (type: 'h' | 'm' | 's', val: number) => {
        const current = parseTime(value);
        let newH = current.h;
        let newM = current.m;
        let newS = current.s;

        if (type === 'h') newH = val;
        if (type === 'm') newM = val;
        if (type === 's') newS = val;

        // Jika value kosong sebelumnya, kita anggap mulai dari 00:00:00 dengan update ini
        // Format HH:mm:ss
        const formatted = [
            newH.toString().padStart(2, '0'),
            newM.toString().padStart(2, '0'),
            newS.toString().padStart(2, '0')
        ].join(':');

        onChange(formatted);
    };

    // Scroll active item into view when opening
    useEffect(() => {
        if (isOpen) {
            scrollToActive('h', h);
            scrollToActive('m', m);
            scrollToActive('s', s);
        }
    }, [isOpen, h, m, s]);

    const scrollToActive = (type: string, val: number) => {
        const el = document.getElementById(`time-${type}-${val}`);
        if (el) {
            el.scrollIntoView({ block: 'center', behavior: 'auto' });
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            {/* Input Trigger */}
            <div className="flex items-center gap-2">
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer bg-white transition-all
                        ${isOpen ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-gray-200 hover:border-gray-300'}`}
                >
                    <FiClock className="w-4 h-4 text-gray-500" />
                    <span className={`text-sm font-mono ${value ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                        {value || placeholder}
                    </span>
                </div>
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-50 flex overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    {/* Hours */}
                    <div className="w-16 h-64 overflow-y-auto border-r border-gray-100 scrollbar-hide py-24 relative">
                        <div className="absolute top-0 left-0 right-0 bg-gray-50 px-2 py-1 text-[10px] font-bold text-gray-400 text-center z-10 border-b border-gray-100">
                            JAM
                        </div>
                        {hours.map((hour) => (
                            <div
                                key={`h-${hour}`}
                                id={`time-h-${hour}`}
                                onClick={() => handleSelect('h', hour)}
                                className={`h-10 flex items-center justify-center cursor-pointer transition-colors text-sm
                                    ${h === hour ? 'bg-indigo-600 text-white font-bold text-lg' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                {hour.toString().padStart(2, '0')}
                            </div>
                        ))}
                    </div>

                    {/* Minutes */}
                    <div className="w-16 h-64 overflow-y-auto border-r border-gray-100 scrollbar-hide py-24 relative">
                        <div className="absolute top-0 left-0 right-0 bg-gray-50 px-2 py-1 text-[10px] font-bold text-gray-400 text-center z-10 border-b border-gray-100">
                            MNT
                        </div>
                        {minutes.map((min) => (
                            <div
                                key={`m-${min}`}
                                id={`time-m-${min}`}
                                onClick={() => handleSelect('m', min)}
                                className={`h-10 flex items-center justify-center cursor-pointer transition-colors text-sm
                                    ${m === min ? 'bg-indigo-600 text-white font-bold text-lg' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                {min.toString().padStart(2, '0')}
                            </div>
                        ))}
                    </div>

                    {/* Seconds */}
                    <div className="w-16 h-64 overflow-y-auto scrollbar-hide py-24 relative">
                        <div className="absolute top-0 left-0 right-0 bg-gray-50 px-2 py-1 text-[10px] font-bold text-gray-400 text-center z-10 border-b border-gray-100">
                            DTK
                        </div>
                        {seconds.map((sec) => (
                            <div
                                key={`s-${sec}`}
                                id={`time-s-${sec}`}
                                onClick={() => handleSelect('s', sec)}
                                className={`h-10 flex items-center justify-center cursor-pointer transition-colors text-sm
                                    ${s === sec ? 'bg-indigo-600 text-white font-bold text-lg' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                {sec.toString().padStart(2, '0')}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomTimePicker;
