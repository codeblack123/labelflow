import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { FiBell, FiX, FiCheck } from 'react-icons/fi';

interface Notification {
    id: string;
    title: string;
    message: string;
    created_at: string;
}

const GlobalNotificationModal: React.FC = () => {
    const [notification, setNotification] = useState<Notification | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [hasImage, setHasImage] = useState(false);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    useEffect(() => {
        checkNotifications();
    }, []);

    const checkNotifications = async () => {
        try {
            // Fetch the latest active notification
            const { data, error } = await supabase
                .from('global_notifications')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1);

            if (error) throw error;

            if (data && data.length > 0) {
                const latestNotif = data[0];
                localStorage.setItem('cache_global_notifications', JSON.stringify(data));

                // Check content for images
                const lines = latestNotif.message.split('\n');
                const imageFound = lines.some(line => {
                    const trimmed = line.trim();
                    return (trimmed.startsWith('http') || trimmed.startsWith('https')) &&
                        (trimmed.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null);
                });

                setHasImage(imageFound);

                // Check if already read on this device
                const isRead = localStorage.getItem(`read_notification_${latestNotif.id}`);

                if (!isRead) {
                    setNotification(latestNotif);
                    // Add small delay for animation effect
                    setTimeout(() => setIsVisible(true), 1000);
                }
            } else {
                localStorage.setItem('cache_global_notifications', '[]');
            }
        } catch (error) {
            console.error('[Notification] Error checking:', error);
            const cached = localStorage.getItem('cache_global_notifications');
            if (cached) {
                try {
                    const data = JSON.parse(cached);
                    if (data && data.length > 0) {
                        const latestNotif = data[0];
                        const lines = latestNotif.message.split('\n');
                        const imageFound = lines.some((line: string) => {
                            const trimmed = line.trim();
                            return (trimmed.startsWith('http') || trimmed.startsWith('https')) &&
                                (trimmed.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null);
                        });
                        setHasImage(imageFound);
                        const isRead = localStorage.getItem(`read_notification_${latestNotif.id}`);
                        if (!isRead) {
                            setNotification(latestNotif);
                            setTimeout(() => setIsVisible(true), 1000);
                        }
                    }
                } catch(e) {}
            }
        }
    };

    const handleMarkAsRead = () => {
        if (!notification) return;

        // Save to localStorage
        localStorage.setItem(`read_notification_${notification.id}`, 'true');

        // Close modal
        setIsVisible(false);
        setTimeout(() => setNotification(null), 300);
    };

    const handleCloseTemporary = () => {
        setIsVisible(false);
        setTimeout(() => setNotification(null), 300);
    };

    const renderContent = (text: string) => {
        return text.split('\n').map((line, index) => {
            const trimmed = line.trim();
            // Check if line is a direct image URL (basic check)
            const isImage = (trimmed.startsWith('http') || trimmed.startsWith('https')) &&
                (trimmed.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null);

            if (isImage) {
                return (
                    <div key={index} className="my-4 rounded-xl overflow-hidden shadow-sm border border-gray-100 group">
                        <div className="relative cursor-zoom-in" onClick={() => setZoomedImage(trimmed)}>
                            <img
                                src={trimmed}
                                alt="Attachment"
                                className="w-full h-auto object-contain max-h-[400px] bg-gray-50 hover:opacity-95 transition-opacity"
                                loading="lazy"
                            />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 pointer-events-none">
                                <span className="bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">Klik untuk memperbesar</span>
                            </div>
                        </div>
                    </div>
                );
            }
            // Empty lines as spacers
            if (!trimmed) return <div key={index} className="h-2"></div>;

            // Basic Markdown Parsing for Bold and Italic
            const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g); // Split by bold or italic tokens

            return (
                <p key={index} className="mb-2 text-gray-600 leading-relaxed text-base">
                    {parts.map((part, i) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={i} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
                        } else if (part.startsWith('*') && part.endsWith('*')) {
                            return <em key={i} className="italic text-gray-800">{part.slice(1, -1)}</em>;
                        }
                        return part;
                    })}
                </p>
            );
        });
    };

    if (!notification) return null;

    return (
        <>
            {/* Zoom Modal Overlay */}
            {zoomedImage && (
                <div
                    className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
                    onClick={() => setZoomedImage(null)}
                >
                    <div className="relative w-full h-full flex items-center justify-center">
                        <img
                            src={zoomedImage}
                            alt="Zoomed"
                            className="max-w-full max-h-full object-contain rounded shadow-2xl"
                        />
                        <button
                            className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/50 hover:bg-black/70 rounded-full p-2 transition-colors"
                            onClick={() => setZoomedImage(null)}
                        >
                            <FiX className="w-8 h-8" />
                        </button>
                    </div>
                </div>
            )}

            {/* Notification Modal Backdrop */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] transition-opacity duration-300 flex items-center justify-center p-4 ${isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={handleCloseTemporary} // Close on backdrop click (temporary)
            >
                {/* Modal Content */}
                <div
                    onClick={e => e.stopPropagation()}
                    className={`bg-white rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden transform transition-all duration-300 ${hasImage ? 'max-w-4xl h-[85vh]' : 'max-w-lg max-h-[85vh]'
                        } ${isVisible ? 'translate-y-0 scale-100' : 'translate-y-8 scale-95'}`}
                >
                    {/* Header */}
                    <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-lg">
                                <FiBell className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-white font-bold text-lg">Pengumuman Penting</h3>
                        </div>
                        <button
                            onClick={handleCloseTemporary}
                            className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors"
                        >
                            <FiX className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body - Scrollable */}
                    <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-white">
                        <h4 className="text-2xl font-bold text-gray-900 mb-6">{notification.title}</h4>

                        <div className="text-gray-700 space-y-2">
                            {renderContent(notification.message)}
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-100 text-sm text-gray-400 font-medium">
                            Diposting: {new Date(notification.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>

                    {/* Footer - Actions */}
                    <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100 shrink-0">
                        <button
                            onClick={handleCloseTemporary}
                            className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-200 rounded-xl transition-colors text-sm"
                        >
                            Tutup (Baca Nanti)
                        </button>
                        <button
                            onClick={handleMarkAsRead}
                            className="px-6 py-2.5 bg-indigo-600 text-white font-bold hover:bg-indigo-700 rounded-xl transition-all shadow-lg shadow-indigo-200 hover:shadow-indigo-300 text-sm flex items-center gap-2"
                        >
                            <FiCheck className="w-4 h-4" />
                            Sudah Membaca
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default GlobalNotificationModal;
