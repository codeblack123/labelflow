const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src', 'components', 'Toolkit.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add API_CONFIG import if missing (it should be there or we can import axios)
if (!content.includes("import axios")) {
    content = content.replace("import React", "import axios from 'axios';\nimport React");
}

// 2. Replace the toolOrder state initialization and moveItem
const stateRegex = /const \[isEditingOrder, setIsEditingOrder\] = useState\(false\);\s*const \[toolOrder, setToolOrder\] = useState<string\[\]>\(\(\) => \{[\s\S]*?\}\);\s*const moveItem = \([\s\S]*?\}\);/;

const newStateCode = `
    const [isEditingOrder, setIsEditingOrder] = useState(false);
    const [toolOrder, setToolOrder] = useState<string[]>([]);
    const [isSavingOrder, setIsSavingOrder] = useState(false);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const res = await axios.get(\`\${API_CONFIG.BASE_URL}/settings/toolkit-order\`);
                if (res.data && Array.isArray(res.data) && res.data.length > 0) {
                    // Filter out any invalid items
                    const validOrder = res.data.filter((id: string) => TOOL_ITEMS.some(t => t.id === id));
                    // Add any missing new items to the end
                    const missingItems = TOOL_ITEMS.filter(t => !validOrder.includes(t.id)).map(t => t.id);
                    setToolOrder([...validOrder, ...missingItems]);
                } else {
                    setToolOrder(TOOL_ITEMS.map(t => t.id));
                }
            } catch (error) {
                console.error("Failed to fetch toolkit order", error);
                // Fallback to local storage
                const saved = localStorage.getItem('toolkit_tool_order');
                if (saved) {
                    try {
                        const parsed = JSON.parse(saved);
                        const validOrder = parsed.filter((id: string) => TOOL_ITEMS.some(t => t.id === id));
                        const missingItems = TOOL_ITEMS.filter(t => !validOrder.includes(t.id)).map(t => t.id);
                        setToolOrder([...validOrder, ...missingItems]);
                        return;
                    } catch (e) {}
                }
                setToolOrder(TOOL_ITEMS.map(t => t.id));
            }
        };
        fetchOrder();
    }, []);

    const moveItem = (index: number, direction: number) => {
        if (index + direction < 0 || index + direction >= toolOrder.length) return;
        const newOrder = [...toolOrder];
        const temp = newOrder[index];
        newOrder[index] = newOrder[index + direction];
        newOrder[index + direction] = temp;
        setToolOrder(newOrder);
        // Save to local storage for immediate fallback
        localStorage.setItem('toolkit_tool_order', JSON.stringify(newOrder));
    };

    const saveOrderToDatabase = async () => {
        if (isEditingOrder) { // If toggling off editing mode, save to DB
            setIsSavingOrder(true);
            try {
                await axios.post(\`\${API_CONFIG.BASE_URL}/settings/toolkit-order\`, { order: toolOrder });
                showToast("Urutan berhasil disimpan ke server", "success");
            } catch (error) {
                console.error("Failed to save toolkit order", error);
                showToast("Gagal menyimpan ke server, disimpan secara lokal", "error");
            } finally {
                setIsSavingOrder(false);
            }
        }
        setIsEditingOrder(!isEditingOrder);
    };
`;

content = content.replace(stateRegex, newStateCode);

// 3. Update the toggle button to use saveOrderToDatabase
const buttonRegex = /onClick=\{\(\) => setIsEditingOrder\(!isEditingOrder\)\}/;
content = content.replace(buttonRegex, "onClick={saveOrderToDatabase} disabled={isSavingOrder}");

// Also update button text to show saving status
const textRegex = /\{isEditingOrder \? 'Selesai Mengatur' : 'Atur Urutan'\}/;
content = content.replace(textRegex, "{isSavingOrder ? 'Menyimpan...' : (isEditingOrder ? 'Selesai Mengatur' : 'Atur Urutan')}");

fs.writeFileSync(file, content);
console.log('Toolkit updated with API integration');
