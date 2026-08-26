const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src', 'components', 'Toolkit.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Update imports
content = content.replace(
    /import \{ FiTool, [^\}]+\} from 'react-icons\/fi';/,
    "import { FiTool, FiLock, FiUnlock, FiX, FiBox, FiPrinter, FiFileText, FiTrash2, FiArrowRight, FiScissors, FiCheckSquare, FiCode, FiTable, FiLayers, FiChevronLeft, FiChevronRight, FiEdit3 } from 'react-icons/fi';"
);

// 2. Insert TOOL_ITEMS array before Toolkit component
const toolItemsCode = `
const TOOL_ITEMS = [
    { id: 'awb-cleaner', title: 'Filter AWB Duplikat', desc: 'Bersihkan data Excel dari resi duplikat atau data cancel berdasarkan list referensi.', icon: FiTrash2, colorType: 'blue', type: 'default' },
    { id: 'label-splitter-v2', title: 'Bagi Rata Label V.2', badgeText: '(SATUAN)', badgeColor: 'text-red-600', desc: 'Bagi file PDF label panjang menjadi beberapa file kecil untuk dibagi ke tim packing.', icon: FiScissors, colorType: 'red', type: 'default' },
    { id: 'label-splitter-v3', title: 'Bagi Rata Label V.3', badgeText: '(CAMPUR)', badgeColor: 'text-indigo-600', desc: 'Bagi file PDF label panjang menjadi beberapa file kecil untuk dibagi ke tim packing.', icon: FiScissors, colorType: 'indigo', type: 'default' },
    { id: 'label-splitter-v4', title: 'Bagi Rata Label V.4', badgeText: '(SATUAN)', badgeColor: 'text-rose-600', desc: 'Copy dari V.2. Membagi file PDF berdasarkan prioritasi satuan.', icon: FiScissors, colorType: 'rose', type: 'highlighted', isNew: true },
    { id: 'label-splitter-v5', title: 'Bagi Rata Label V.5', badgeText: '(CAMPUR)', badgeColor: 'text-teal-600', desc: 'Logika Kompleks: Deteksi pola MSKU sama (3+ resi) ke batch khusus, sisanya bagi rata beban SKU.', icon: FiScissors, colorType: 'teal', type: 'highlighted', isNew: true },
    { id: 'extract-pesanan', title: 'Extract Pesanan', desc: 'Ambil nomor pesanan dari data Ginee dengan cepat dan mudah.', icon: FiFileText, colorType: 'indigo', type: 'default' },
    { id: 'wms-cleaner', title: 'Pembersih ID Paket', desc: 'Hapus karakter @ di depan atau belakang No. Pesanan agar data menjadi bersih.', icon: FiTrash2, colorType: 'orange', type: 'default' },
    { id: 'ginee-processor', title: 'Ginee Data Processor', desc: 'Extract ID Pesanan dari file Excel Ginee (pretelan vs satuan).', icon: FiTable, colorType: 'blue', type: 'default' },
    { id: 'verify', title: 'Verify Labels', badgeText: 'New', badgeType: 'pill', badgeColor: 'bg-teal-500', desc: 'Double check dan sinkronisasi antara PDF Asli, Custom, dan data Excel.', icon: FiCheckSquare, colorType: 'teal', type: 'default', isNew: true },
    { id: 'orderan-kilat', title: 'Orderan Kilat', badgeText: '(VIP >10K)', badgeColor: 'text-orange-600', desc: 'Filter file Excel Ginee, khusus menyisakan pesanan yang mengandung MSKU berharga tinggi (VIP).', icon: FiFileText, colorType: 'orange', type: 'vip' },
    { id: 'pdf-merger', title: 'Gabung Label Asli', badgeText: 'Baru', badgeType: 'pill', badgeColor: 'bg-blue-500', desc: 'Gabungkan 2 atau lebih file PDF resi asli menjadi satu file PDF utuh.', icon: FiLayers, colorType: 'blue', type: 'default', isNew: true }
];

const getColorClasses = (color) => {
    switch (color) {
        case 'blue': return { borderActive: 'border-blue-100 hover:border-blue-300', iconBg: 'bg-blue-50 group-hover:bg-blue-100', iconText: 'text-blue-600' };
        case 'red': return { borderActive: 'border-red-100 hover:border-red-300', iconBg: 'bg-red-50 group-hover:bg-red-100', iconText: 'text-red-600' };
        case 'indigo': return { borderActive: 'border-indigo-100 hover:border-indigo-300', iconBg: 'bg-indigo-50 group-hover:bg-indigo-100', iconText: 'text-indigo-600' };
        case 'rose': return { borderActive: 'bg-rose-50/70 border-rose-400 hover:border-rose-500 hover:bg-rose-50', iconBg: 'bg-rose-50 group-hover:bg-rose-100', iconText: 'text-rose-600' };
        case 'teal': return { borderActive: 'bg-teal-50/70 border-teal-400 hover:border-teal-500 hover:bg-teal-50', iconBg: 'bg-teal-50 group-hover:bg-teal-100', iconText: 'text-teal-600' };
        case 'orange': return { borderActive: 'border-orange-100 hover:border-orange-300', iconBg: 'bg-orange-50 group-hover:bg-orange-100', iconText: 'text-orange-600' };
        default: return { borderActive: 'border-gray-200', iconBg: 'bg-gray-100', iconText: 'text-gray-600' };
    }
};

const Toolkit: React.FC<ToolkitProps> = ({ showToast }) => {
`;
content = content.replace('const Toolkit: React.FC<ToolkitProps> = ({ showToast }) => {', toolItemsCode);

// 3. Add states for editing order
const stateCode = `
    const [isEditingOrder, setIsEditingOrder] = useState(false);
    const [toolOrder, setToolOrder] = useState<string[]>(() => {
        const saved = localStorage.getItem('toolkit_tool_order');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {}
        }
        return TOOL_ITEMS.map(t => t.id);
    });

    const moveItem = (index, direction) => {
        if (index + direction < 0 || index + direction >= toolOrder.length) return;
        const newOrder = [...toolOrder];
        const temp = newOrder[index];
        newOrder[index] = newOrder[index + direction];
        newOrder[index + direction] = temp;
        setToolOrder(newOrder);
        localStorage.setItem('toolkit_tool_order', JSON.stringify(newOrder));
    };
`;
content = content.replace('const [lockedFeatures, setLockedFeatures] = useState<Set<string>>(new Set());', 'const [lockedFeatures, setLockedFeatures] = useState<Set<string>>(new Set());\n' + stateCode);

// 4. Update Header actions to add Atur Urutan button
const headerActions = `
                    {devMode && (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 border border-purple-200 text-purple-700 rounded-lg text-xs font-bold">
                            <FiCode className="w-3.5 h-3.5" />
                            Dev Mode Aktif
                        </span>
                    )}
                    {!activeTool && (
                        <button
                            onClick={() => setIsEditingOrder(!isEditingOrder)}
                            className={\`px-4 py-2 border rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 \${isEditingOrder ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}\`}
                        >
                            <FiEdit3 className="w-4 h-4" />
                            {isEditingOrder ? 'Selesai Mengatur' : 'Atur Urutan'}
                        </button>
                    )}
`;
content = content.replace(
    /\{devMode && \([\s\S]*?Dev Mode Aktif[\s\S]*?<\/span>[\s\S]*?\)}/,
    headerActions
);

// 5. Replace grid children with mapped Array
const gridReplacement = `
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {toolOrder.map((id, index) => {
                            const item = TOOL_ITEMS.find(t => t.id === id);
                            if (!item) return null;
                            const isLocked = lockedFeatures.has(item.id);
                            const colors = getColorClasses(item.colorType);
                            const Icon = item.icon;

                            if (item.type === 'vip') {
                                return (
                                    <div 
                                        key={item.id}
                                        onClick={() => !isEditingOrder && openTool(item.id)}
                                        className={\`bg-white border-2 border-orange-100 rounded-2xl p-6 \${isEditingOrder ? 'cursor-default' : 'cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-orange-300'} transition-all group relative overflow-hidden\`}
                                    >
                                        <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-orange-50 to-orange-100 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500 ease-out"></div>
                                        <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mb-4 relative z-10 group-hover:scale-110 transition-transform">
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 relative z-10">
                                            {item.title} {item.badgeText && <span className="text-orange-600 text-sm ml-1">{item.badgeText}</span>}
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-2 relative z-10">
                                            {item.desc}
                                        </p>
                                        {!isEditingOrder && (
                                            <span className="inline-block mt-4 text-xs font-bold text-orange-600 group-hover:translate-x-1 transition-transform flex items-center gap-1 relative z-10">
                                                Buka Alat <FiArrowRight />
                                            </span>
                                        )}
                                        {isEditingOrder && (
                                            <div className="absolute bottom-4 right-4 flex gap-2 z-20">
                                                <button onClick={(e) => { e.stopPropagation(); moveItem(index, -1); }} disabled={index === 0} className="p-2 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-30 border border-gray-200"><FiChevronLeft /></button>
                                                <button onClick={(e) => { e.stopPropagation(); moveItem(index, 1); }} disabled={index === toolOrder.length - 1} className="p-2 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-30 border border-gray-200"><FiChevronRight /></button>
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => !isEditingOrder && openTool(item.id)}
                                    className={\`p-6 rounded-xl \${item.type === 'highlighted' ? 'border-2' : 'border bg-white'} shadow-sm transition-all group relative overflow-hidden \${isEditingOrder ? 'cursor-default' : 'cursor-pointer'} \${isLocked
                                        ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                                        : (item.type === 'highlighted' ? colors.borderActive : \`\${colors.borderActive} hover:shadow-md\`)
                                    }\`}
                                >
                                    {isLocked ? (
                                        <div className="absolute top-3 right-3"><FiLock className="w-4 h-4 text-gray-400" /></div>
                                    ) : (
                                        item.isNew && (
                                            <div className={\`absolute top-3 right-3 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase \${item.colorType === 'teal' ? 'bg-teal-500 text-white' : item.colorType === 'rose' ? 'bg-rose-500 text-white' : 'bg-blue-500 text-white'}\`}>Baru</div>
                                        )
                                    )}
                                    <div className={\`w-10 h-10 rounded-lg flex items-center justify-center mb-4 transition-colors \${colors.iconBg}\`}>
                                        <Icon className={\`w-5 h-5 \${colors.iconText}\`} />
                                    </div>
                                    <h3 className="font-semibold text-gray-900">
                                        {item.title} 
                                        {item.badgeText && item.badgeType === 'pill' ? (
                                            <span className={\`text-[10px] text-white px-1.5 py-0.5 rounded-full ml-1 \${item.badgeColor}\`}>{item.badgeText}</span>
                                        ) : item.badgeText ? (
                                            <span className={\`font-bold text-base ml-1 \${item.badgeColor}\`}>{item.badgeText}</span>
                                        ) : null}
                                    </h3>
                                    <p className={\`text-sm text-gray-500 mt-2 \${item.type === 'highlighted' ? 'italic text-[11px]' : ''}\`}>
                                        {item.desc}
                                    </p>
                                    {!isEditingOrder && (
                                        <span className={\`inline-block mt-4 text-xs font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1 \${colors.iconText}\`}>
                                            Buka Alat <FiArrowRight />
                                        </span>
                                    )}
                                    
                                    {isEditingOrder && (
                                        <div className="absolute bottom-4 right-4 flex gap-2 z-20">
                                            <button onClick={(e) => { e.stopPropagation(); moveItem(index, -1); }} disabled={index === 0} className="p-2 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-30 border border-gray-200"><FiChevronLeft /></button>
                                            <button onClick={(e) => { e.stopPropagation(); moveItem(index, 1); }} disabled={index === toolOrder.length - 1} className="p-2 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-30 border border-gray-200"><FiChevronRight /></button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
`;

// Extract grid block
const gridRegex = /<div className="grid grid-cols-1 md:grid-cols-3 gap-6">[\s\S]*?<\/div>(\s*\{\/\* ====== DEV MODE TOOLS)/;
content = content.replace(gridRegex, gridReplacement + '$1');

fs.writeFileSync(file, content);
console.log('Toolkit updated');
