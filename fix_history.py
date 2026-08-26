import re

filepath = r"c:\Users\jgilb\OneDrive\Dokumen\bolt new\8_shipping-label-customizer\shipping-label-customizer 9 new 23\shipping-label-customizer 9 new 23\src\components\OrderHistory.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the Search Logic part
search_logic_src = """                // Search logic (Single or Multi)
                if (debouncedQuery) {
                    const qLower = debouncedQuery.toLowerCase();
                    if (isMultiSearch) {
                        const queries = debouncedQuery.split(/[\\n,]+/).map(q => q.trim()).filter(q => q.length > 0);
                        if (queries.length > 0) {
                            // Using overlaps for array columns in Supabase
                            // Syntax: .overlaps('column', ['val1', 'val2'])
                            if (searchCategory === 'awb' || searchCategory === 'all') {
                                query = query.or(`matched_awbs.ov.{${queries.join(',')}},unmatched_excel_awbs.ov.{${queries.join(',')}},unmatched_pdf_awbs.ov.{${queries.join(',')}}`);
                            } else if (searchCategory === 'pdf') {
                                query = query.overlaps('pdf_filenames', queries);
                            } else if (searchCategory === 'excel') {
                                query = query.filter('excel_filename', 'in', `(${queries.map(q => `"${q}"`).join(',')})`);
                            }
                        }
                    } else {
                        // Excel search (Single)
                        if (searchCategory === 'excel') {
                            query = query.ilike('excel_filename', exactMatch ? debouncedQuery : `%${debouncedQuery}%`);
                        }
                    }
                }

                // Unmatched filter
                if (hasUnmatched) {
                    query = query.or('unmatched_excel_count.gt.0,unmatched_pdf_count.gt.0');
                }

                query = query.order('created_at', { ascending: false });

                // Needs client-side array filter (pdf names / awb names)
                // Skip client filter for multi-search as we handle it via database operators above
                const needsClientFilter = !isMultiSearch && !!(debouncedQuery && (searchCategory === 'all' || searchCategory === 'pdf' || searchCategory === 'awb'));

                if (!needsClientFilter) {
                    const from = (currentPage - 1) * rowsPerPage;
                    query = query.range(from, from + rowsPerPage - 1);
                } else {
                    query = query.limit(100000);
                }"""

search_logic_dst = """                // Optimasi Search logic (Single or Multi)
                let useExactArraySearch = false;

                if (debouncedQuery) {
                    if (isMultiSearch) {
                        const queries = debouncedQuery.split(/[\\n,]+/).map(q => q.trim()).filter(q => q.length > 0);
                        if (queries.length > 0) {
                            if (searchCategory === 'awb' || searchCategory === 'all') {
                                query = query.or(`matched_awbs.ov.{${queries.join(',')}},unmatched_excel_awbs.ov.{${queries.join(',')}},unmatched_pdf_awbs.ov.{${queries.join(',')}}`);
                            } else if (searchCategory === 'pdf') {
                                query = query.overlaps('pdf_filenames', queries);
                            } else if (searchCategory === 'excel') {
                                query = query.filter('excel_filename', 'in', `(${queries.map(q => `"${q}"`).join(',')})`);
                            }
                        }
                    } else {
                        // Single Search
                        const term = debouncedQuery.trim();
                        if (searchCategory === 'excel') {
                            query = query.ilike('excel_filename', exactMatch ? term : `%${term}%`);
                        } else {
                            // Cek apakah term mirip full AWB / PDF name (panjang >= 7 dan ga ada spasi)
                            useExactArraySearch = exactMatch || (term.length >= 7 && !term.includes(' '));
                            
                            if (useExactArraySearch) {
                                if (searchCategory === 'pdf') {
                                    query = query.contains('pdf_filenames', [term]);
                                } else if (searchCategory === 'awb') {
                                    query = query.or(`matched_awbs.cs.{${term}},unmatched_excel_awbs.cs.{${term}},unmatched_pdf_awbs.cs.{${term}}`);
                                } else if (searchCategory === 'all') {
                                    query = query.or(`excel_filename.ilike.%${term}%,matched_awbs.cs.{${term}},unmatched_excel_awbs.cs.{${term}},unmatched_pdf_awbs.cs.{${term}}`);
                                }
                            }
                        }
                    }
                }

                // Unmatched filter
                if (hasUnmatched) {
                    query = query.or('unmatched_excel_count.gt.0,unmatched_pdf_count.gt.0');
                }

                query = query.order('created_at', { ascending: false });

                // Needs client-side array filter (jika pencarian parsial di array)
                const needsClientFilter = !isMultiSearch && !!(debouncedQuery && (searchCategory === 'all' || searchCategory === 'pdf' || searchCategory === 'awb')) && !useExactArraySearch;

                if (!needsClientFilter) {
                    const from = (currentPage - 1) * rowsPerPage;
                    query = query.range(from, from + rowsPerPage - 1);
                } else {
                    // Batasi 2000 untuk mencegah error 500 dari Supabase jika client-filter berjalan
                    query = query.limit(2000);
                }"""

if "Optimasi Search logic" not in content:
    content = content.replace(search_logic_src, search_logic_dst)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced OrderHistory search logic successfully.")
else:
    print("Already optimized.")
