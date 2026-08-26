import re

with open('src/components/Toolkit.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

bad_string = """                    {isEditingOrder && (
                        <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 text-sm text-blue-600 font-medium animate-pulse bg-blue-50 px-4 py-1.5 rounded-full border border-blue-200">
                            Seret (Drag) kotak untuk mengubah posisi
                        </div>
                    )}
                <ToolkitLabelSplitter showToast={showToast} />"""

good_string = """                    {isEditingOrder && (
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
                    </button>
                </div>
            </div>

            {/* Active Tool View */}
            {activeTool === 'awb-cleaner' ? (
                <ToolkitAwbFilter showToast={showToast} />
            ) : activeTool === 'splitter' ? (
                <ToolkitLabelSplitter showToast={showToast} />"""

if bad_string in content:
    content = content.replace(bad_string, good_string)
    with open('src/components/Toolkit.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Fixed successfully')
else:
    print('Bad string not found!')
