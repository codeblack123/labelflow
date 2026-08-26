import re

with open('main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# We want to replace the specific chunk in toolkit_generate_packing_list
target_chunk = """        output = io.BytesIO()
        final_df.to_excel(output, index=False, engine='openpyxl')
        output.seek(0)"""

new_chunk = """        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            final_df.to_excel(writer, index=False, sheet_name='Packing List')
            
            workbook  = writer.book
            worksheet = writer.sheets['Packing List']
            
            # Formats
            header_format = workbook.add_format({
                'bold': True,
                'bg_color': '#D9D9D9',
                'border': 1,
                'align': 'center',
                'valign': 'vcenter'
            })
            
            cell_format_center = workbook.add_format({
                'align': 'center',
                'valign': 'vcenter',
                'border': 1,
                'text_wrap': True
            })
            
            cell_format_left = workbook.add_format({
                'align': 'left',
                'valign': 'vcenter',
                'border': 1,
                'text_wrap': True
            })
            
            # Write headers
            for col_num, value in enumerate(final_df.columns.values):
                worksheet.write(0, col_num, value, header_format)
            
            # Set column widths
            worksheet.set_column('A:A', 15)  # ID / Rak
            worksheet.set_column('B:B', 40)  # SKU
            worksheet.set_column('C:C', 10)  # QTY
            worksheet.set_column('D:D', 30)  # NO. PESANAN
            
            # Write data with wrapping
            for row_num in range(len(final_df)):
                worksheet.write(row_num + 1, 0, final_df.iloc[row_num, 0], cell_format_center)
                worksheet.write(row_num + 1, 1, final_df.iloc[row_num, 1], cell_format_left)
                worksheet.write(row_num + 1, 2, final_df.iloc[row_num, 2], cell_format_center)
                worksheet.write(row_num + 1, 3, final_df.iloc[row_num, 3], cell_format_left)

        output.seek(0)"""

if target_chunk in content:
    content = content.replace(target_chunk, new_chunk)
    with open('main.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced chunk in toolkit_generate_packing_list successfully!")
else:
    print("Could not find exact chunk.")
