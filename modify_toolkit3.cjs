const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src', 'components', 'Toolkit.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add draggedIndex state
if (!content.includes('const [draggedIndex, setDraggedIndex]')) {
    content = content.replace(
        'const [isSavingOrder, setIsSavingOrder] = useState(false);',
        'const [isSavingOrder, setIsSavingOrder] = useState(false);\n    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);'
    );
}

// 2. Add Drag handlers
const dragHandlers = `
    const handleDragStart = (e: React.DragEvent, index: number) => {
        if (!isEditingOrder) return;
        setDraggedIndex(index);
        // Set visual drag image
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            // Slight transparency on the dragged item
            setTimeout(() => {
                const element = e.target as HTMLElement;
                if (element && element.style) {
                    element.style.opacity = '0.4';
                }
            }, 0);
        }
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault(); // Necessary to allow dropping
        if (!isEditingOrder || draggedIndex === null || draggedIndex === index) return;
        
        // Reorder array on the fly
        const newOrder = [...toolOrder];
        const draggedItem = newOrder[draggedIndex];
        newOrder.splice(draggedIndex, 1);
        newOrder.splice(index, 0, draggedItem);
        
        setToolOrder(newOrder);
        setDraggedIndex(index); // Update the current position of the dragged item
    };

    const handleDragEnd = (e: React.DragEvent) => {
        if (!isEditingOrder) return;
        setDraggedIndex(null);
        const element = e.target as HTMLElement;
        if (element && element.style) {
            element.style.opacity = '1';
        }
        // Save to local storage for immediate fallback
        localStorage.setItem('toolkit_tool_order', JSON.stringify(toolOrder));
    };
`;
if (!content.includes('const handleDragStart')) {
    content = content.replace(
        'const moveItem = (index: number, direction: number) => {',
        dragHandlers + '\n    const moveItem = (index: number, direction: number) => {'
    );
}

// 3. Update the JSX for mapping over toolOrder to add draggable attributes
const vipReplacement = `
                                    <div 
                                        key={item.id}
                                        draggable={isEditingOrder}
                                        onDragStart={(e) => handleDragStart(e, index)}
                                        onDragOver={(e) => handleDragOver(e, index)}
                                        onDragEnd={handleDragEnd}
                                        onClick={() => !isEditingOrder && openTool(item.id)}
                                        className={\`bg-white border-2 border-orange-100 rounded-2xl p-6 \${isEditingOrder ? 'cursor-grab active:cursor-grabbing hover:border-blue-400 hover:shadow-md' : 'cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-orange-300'} transition-all group relative overflow-hidden\`}
                                    >
`;
content = content.replace(
    /<\div\s+key=\{item\.id\}\s+onClick=\{\(\) => !isEditingOrder && openTool\(item\.id\)\}\s+className=\{`bg-white border-2 border-orange-100 rounded-2xl p-6 \$\{isEditingOrder \? 'cursor-default' : 'cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-orange-300'\} transition-all group relative overflow-hidden`\}/,
    vipReplacement
);

const normalReplacement = `
                                <div
                                    key={item.id}
                                    draggable={isEditingOrder && !isLocked}
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDragEnd={handleDragEnd}
                                    onClick={() => !isEditingOrder && openTool(item.id)}
                                    className={\`p-6 rounded-xl \${item.type === 'highlighted' ? 'border-2' : 'border bg-white'} shadow-sm transition-all group relative overflow-hidden \${isEditingOrder && !isLocked ? 'cursor-grab active:cursor-grabbing hover:border-blue-400 hover:shadow-md' : (!isEditingOrder ? 'cursor-pointer' : 'cursor-default')} \${isLocked
`;
content = content.replace(
    /<\div\s+key=\{item\.id\}\s+onClick=\{\(\) => !isEditingOrder && openTool\(item\.id\)\}\s+className=\{`p-6 rounded-xl \$\{item\.type === 'highlighted' \? 'border-2' : 'border bg-white'\} shadow-sm transition-all group relative overflow-hidden \$\{isEditingOrder \? 'cursor-default' : 'cursor-pointer'\} \$\{isLocked/,
    normalReplacement
);

// 4. Update the isEditingOrder button to also mention drag and drop
content = content.replace(
    />\s*\{isSavingOrder \? 'Menyimpan\.\.\.' : \(isEditingOrder \? 'Selesai Mengatur' : 'Atur Urutan'\)\}\s*<\/button>/,
    `>
                            {isSavingOrder ? 'Menyimpan...' : (isEditingOrder ? 'Selesai Mengatur' : 'Atur Urutan')}
                        </button>
                    )}
                    {isEditingOrder && (
                        <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 text-sm text-blue-600 font-medium animate-pulse bg-blue-50 px-4 py-1.5 rounded-full border border-blue-200">
                            Seret (Drag) kotak untuk mengubah posisi
                        </div>
                    )}`
);
content = content.replace(/className="flex justify-between items-center mb-8"/, 'className="flex justify-between items-center mb-8 relative"');

// 5. Hide the old left/right chevron buttons when isEditingOrder is active (to favor drag and drop)
content = content.replace(
    /\{isEditingOrder && \(\s*<div className="absolute bottom-4 right-4 flex gap-2 z-20">\s*<button onClick=\{\(e\) => \{ e\.stopPropagation\(\); moveItem\(index, -1\); \}\} disabled=\{index === 0\} className="p-2 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-30 border border-gray-200"><FiChevronLeft \/><\/button>\s*<button onClick=\{\(e\) => \{ e\.stopPropagation\(\); moveItem\(index, 1\); \}\} disabled=\{index === toolOrder\.length - 1\} className="p-2 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-30 border border-gray-200"><FiChevronRight \/><\/button>\s*<\/div>\s*\)\}/g,
    ''
);

// 6. Add new tool to TOOL_ITEMS
if (!content.includes("id: 'packing-list'")) {
    const newTool = `
    { id: 'packing-list', title: 'Packing List Excel', badgeText: 'New', badgeType: 'pill', badgeColor: 'bg-green-500', desc: 'Upload file Excel (Packing List) untuk melihat daftar list secara rapi dan cepat.', icon: FiTable, colorType: 'teal', type: 'default', isNew: true },
    { id: 'orderan-kilat',`;
    content = content.replace(/{ id: 'orderan-kilat',/g, newTool.trim());
}

// 7. Update activeTool state type
content = content.replace(
    /useState\<'awb-cleaner' \| 'splitter' \| 'label-splitter-v2' \| 'label-splitter-v3' \| 'label-splitter-v4' \| 'label-splitter-v5' \| 'extract-pesanan' \| 'wms-cleaner' \| 'ginee-processor' \| 'verify' \| 'pdf-merger' \| null\>/g,
    "useState<'awb-cleaner' | 'splitter' | 'label-splitter-v2' | 'label-splitter-v3' | 'label-splitter-v4' | 'label-splitter-v5' | 'extract-pesanan' | 'wms-cleaner' | 'ginee-processor' | 'verify' | 'pdf-merger' | 'packing-list' | null>"
);

// 8. Add ToolkitPackingList import and usage
if (!content.includes('import ToolkitPackingList')) {
    content = content.replace(
        "import ToolkitPdfMerger from './ToolkitPdfMerger';",
        "import ToolkitPdfMerger from './ToolkitPdfMerger';\nimport ToolkitPackingList from './ToolkitPackingList';"
    );
}

if (!content.includes('activeTool === \'packing-list\'')) {
    const packingListRender = `
            {activeTool === 'pdf-merger' && (
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 flex flex-col h-[calc(100vh-140px)]">
                    <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setActiveTool(null)} className="p-2 hover:bg-gray-200 rounded-lg transition-colors"><FiArrowRight className="w-5 h-5 rotate-180" /></button>
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">Gabung Label Asli</h2>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto bg-gray-50/50">
                        <ToolkitPdfMerger showToast={showToast} />
                    </div>
                </div>
            )}
            {activeTool === 'packing-list' && (
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 flex flex-col h-[calc(100vh-140px)]">
                    <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setActiveTool(null)} className="p-2 hover:bg-gray-200 rounded-lg transition-colors"><FiArrowRight className="w-5 h-5 rotate-180" /></button>
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><FiTable className="text-teal-600" /> Packing List Excel</h2>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto bg-gray-50/50 p-6">
                        <ToolkitPackingList showToast={showToast} />
                    </div>
                </div>
            )}`;
            
    content = content.replace(
        /\{\s*activeTool === 'pdf-merger' && \([\s\S]*?<\/div>\s*\)\s*\}/,
        packingListRender
    );
}

fs.writeFileSync(file, content);
console.log('Toolkit updated with DnD and Packing List Tool');
