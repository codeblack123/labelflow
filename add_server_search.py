import re

filepath = r"c:\Users\jgilb\OneDrive\Dokumen\bolt new\8_shipping-label-customizer\shipping-label-customizer 9 new 23\shipping-label-customizer 9 new 23\src\components\AdminDataManager.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Inject fetchDataFromServer
func_src = """    const fetchData = async () => {"""
func_dst = """    const fetchDataFromServer = async () => {
        setLoading(true);
        setSelectedIds(new Set());
        try {
            const orderColumn = activeTable === 'processed_items' ? 'processed_at' : 'created_at';

            let query = supabase
                .from(activeTable)
                .select('*');

            // Apply Server-Side Date Filter
            if (filterDate) {
                const dateColumn = activeTable === 'processed_items' ? 'date_processed' : 'created_at';
                
                // For local timezone safety, we just use string matching or greater than
                const startOfDay = new Date(filterDate + 'T00:00:00');
                const endOfDay = new Date(filterDate + 'T23:59:59');
                
                query = query.gte(dateColumn, startOfDay.toISOString());
                query = query.lte(dateColumn, endOfDay.toISOString());
            }

            // Apply Server-Side Search
            if (searchQuery.trim()) {
                const term = searchQuery.trim();
                if (isMultiSearch) {
                    const queries = term.split(/[\\n,]+/).map(q => q.trim()).filter(q => q.length > 0);
                    if (queries.length > 0) {
                        if (activeTable === 'processed_items') {
                            const formatted = `(${queries.join(',')})`;
                            query = query.or(`order_id.in.${formatted},awb.in.${formatted}`);
                        } else {
                            query = query.or(`excel_name.ilike.%${queries[0]}%`);
                        }
                    }
                } else {
                    if (activeTable === 'processed_items') {
                        query = query.or(`order_id.ilike.%${term}%,awb.ilike.%${term}%,excel_filename.ilike.%${term}%`);
                    } else {
                        query = query.or(`excel_name.ilike.%${term}%`);
                    }
                }
            }

            const { data: items, error } = await query
                .order(orderColumn, { ascending: false })
                .limit(5000);

            if (error) {
                throw error;
            }

            setAllData(items || []);
            setData(items || []); // Local filter will run, but that's fine since they match
            setCurrentPage(1);
            showToast?.(`✓ Ditemukan ${items?.length || 0} data dari server`);
        } catch (err: any) {
            console.error('Server search error:', err);
            showToast?.(`❌ Gagal cari di server: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const fetchData = async () => {"""

if "const fetchDataFromServer" not in content:
    content = content.replace(func_src, func_dst)


# 2. Inject Button
btn_src = """                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="text-xs text-red-500 hover:text-red-700 font-medium bg-red-50 px-2 py-1 rounded"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>"""
btn_dst = """                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="text-xs text-red-500 hover:text-red-700 font-medium bg-red-50 px-2 py-1 rounded"
                            >
                                Clear
                            </button>
                        )}
                        <button
                            onClick={fetchDataFromServer}
                            className="ml-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 transition-all"
                            title="Cari langsung ke database untuk mencari data lama (> 5000 data)"
                        >
                            Cari Server (Data Lama)
                        </button>
                    </div>
                </div>"""

if "Cari Server (Data Lama)" not in content:
    content = content.replace(btn_src, btn_dst)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Added Server Search logic to AdminDataManager.")
