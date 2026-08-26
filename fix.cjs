const fs = require('fs');
let content = fs.readFileSync('src/components/Toolkit.tsx', 'utf8');

const marker1 = 'Atur Urutan)}\n                        </button>\n                    )}';
let idx1 = content.indexOf(marker1);
if (idx1 !== -1) {
    const headerStart = content.substring(0, idx1 + marker1.length);
    const marker2 = '\n                </div>\n            </div>\n\n            {/* ====== CONTENT AREA ====== */}';
    let idx2 = content.indexOf(marker2, idx1);
    
    if (idx2 !== -1) {
        const headerEnd = content.substring(idx2);
        
        const correctMiddle = `
                    {isEditingOrder && (
                        <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 text-sm text-blue-600 font-medium animate-pulse bg-blue-50 px-4 py-1.5 rounded-full border border-blue-200">
                            Seret (Drag) kotak untuk mengubah posisi
                        </div>
                    )}

                    {activeTool && (
                        <button
                            onClick={() => setActiveTool(null)}
                            className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                        >
                            Ke Menu Utama
                        </button>
                    )}
                    <button
                        onClick={handleLogout}
                        className="px-5 py-2.5 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                    >
                        <FiUnlock className="w-4 h-4" />
                        Keluar
                    </button>`;
                    
        content = headerStart + correctMiddle + headerEnd;
        fs.writeFileSync('src/components/Toolkit.tsx', content);
        console.log('Fixed syntax error in Toolkit.tsx');
    } else {
        console.log('Could not find marker2');
    }
} else {
    console.log('Could not find marker1');
}
