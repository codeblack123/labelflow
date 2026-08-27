import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix copy logic 1
content = content.replace(
    "const text = testProcessStats.matched_with_awb?.map(item => `${item.awb}\\t${item.id_pesanan}`).join('\\n') || '';",
    """const text = testProcessStats.matched_with_awb?.map((item: any) => {
                                                        let parsed = item;
                                                        if (typeof item === 'string' && item.startsWith('{')) {
                                                            try { parsed = JSON.parse(item); } catch(e) {}
                                                        }
                                                        const isObj = typeof parsed === 'object' && parsed !== null;
                                                        const awb = isObj ? parsed.awb : parsed;
                                                        const id_pesanan = isObj ? parsed.id_pesanan : '-';
                                                        return `${id_pesanan}\\t${awb}`;
                                                    }).join('\\n') || '';"""
)

# Fix copy logic 2
content = content.replace(
    "const text = processStats2.matched_with_awb?.map(item => `${item.awb}\\t${item.id_pesanan}`).join('\\n') || '';",
    """const text = processStats2.matched_with_awb?.map((item: any) => {
                                                        let parsed = item;
                                                        if (typeof item === 'string' && item.startsWith('{')) {
                                                            try { parsed = JSON.parse(item); } catch(e) {}
                                                        }
                                                        const isObj = typeof parsed === 'object' && parsed !== null;
                                                        const awb = isObj ? parsed.awb : parsed;
                                                        const id_pesanan = isObj ? parsed.id_pesanan : '-';
                                                        return `${id_pesanan}\\t${awb}`;
                                                    }).join('\\n') || '';"""
)


# Fix UI 1
grid1 = """                                        <div className="grid grid-cols-2 gap-4 mb-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            <div>AWB / Resi</div>
                                            <div>ID Pesanan</div>
                                        </div>
                                        <div className="space-y-2">
                                            {testProcessStats.matched_with_awb.map((item, idx) => (
                                                <div key={idx} className="grid grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:border-emerald-200 transition-colors">
                                                    <div className="font-mono text-sm text-gray-700 font-semibold">{item.awb}</div>
                                                    <div className="font-mono text-sm text-gray-500">{item.id_pesanan}</div>
                                                </div>
                                            ))}
                                        </div>"""

table1 = """                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                    <th className="p-3 rounded-tl-xl">ID Pesanan</th>
                                                    <th className="p-3 rounded-tr-xl">AWB / Resi</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {testProcessStats.matched_with_awb.map((item: any, idx: number) => {
                                                    let parsed = item;
                                                    if (typeof item === 'string' && item.startsWith('{')) {
                                                        try { parsed = JSON.parse(item); } catch(e) {}
                                                    }
                                                    const isObj = typeof parsed === 'object' && parsed !== null;
                                                    const awbStr = isObj ? parsed.awb : parsed;
                                                    const idPesanan = isObj ? parsed.id_pesanan : '-';
                                                    return (
                                                        <tr key={idx} className="bg-white hover:bg-emerald-50 transition-colors">
                                                            <td className="p-3 font-mono text-sm text-gray-700 font-semibold border-l border-gray-100">{idPesanan}</td>
                                                            <td className="p-3 font-mono text-sm text-gray-500 border-r border-gray-100">{awbStr}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>"""

content = content.replace(grid1, table1)

# Fix UI 2
grid2 = """                                            <div className="grid grid-cols-2 gap-4 mb-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                <div>AWB / Resi</div>
                                                <div>ID Pesanan</div>
                                            </div>
                                            <div className="space-y-2">
                                                {processStats2.matched_with_awb.map((item, idx) => (
                                                    <div key={idx} className="grid grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:border-emerald-200 transition-colors">
                                                        <div className="font-mono text-sm text-gray-700 font-semibold">{item.awb}</div>
                                                        <div className="font-mono text-sm text-gray-500">{item.id_pesanan}</div>
                                                    </div>
                                                ))}
                                            </div>"""

table2 = """                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                        <th className="p-3 rounded-tl-xl">ID Pesanan</th>
                                                        <th className="p-3 rounded-tr-xl">AWB / Resi</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {processStats2.matched_with_awb.map((item: any, idx: number) => {
                                                        let parsed = item;
                                                        if (typeof item === 'string' && item.startsWith('{')) {
                                                            try { parsed = JSON.parse(item); } catch(e) {}
                                                        }
                                                        const isObj = typeof parsed === 'object' && parsed !== null;
                                                        const awbStr = isObj ? parsed.awb : parsed;
                                                        const idPesanan = isObj ? parsed.id_pesanan : '-';
                                                        return (
                                                            <tr key={idx} className="bg-white hover:bg-emerald-50 transition-colors">
                                                                <td className="p-3 font-mono text-sm text-gray-700 font-semibold border-l border-gray-100">{idPesanan}</td>
                                                                <td className="p-3 font-mono text-sm text-gray-500 border-r border-gray-100">{awbStr}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>"""

content = content.replace(grid2, table2)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
