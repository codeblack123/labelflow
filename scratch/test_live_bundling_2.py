import io
import fitz
from reportlab.pdfgen import canvas
from main import generate_table_data, create_table

def test_live():
    chunk = [
        {'msku': 'BINDERNOTE-B5-MHPT-143-PURPLE', 'jumlah': 6},
        {'msku': 'PENCILCOLOR-CP-0133-SH12', 'jumlah': 12},
        {'msku': 'BOOK-CLBK-3501/1PC', 'jumlah': 3},
        {'msku': 'MECHANICALPENCIL-1BOX/MP-70', 'jumlah': 22},
        {'msku': 'PULPEN-1BOX/GP-157-BLACK', 'jumlah': 2},
    ]
    bundling_map = {
        'MECHANICALPENCIL-1BOX/MP-70': True,
        'PULPEN-1BOX/GP-157-BLACK': True,
    }
    b2_cfg = {
        'col_jenis': 65.0,
        'col_model': 113.0,
        'col_varian': 55.5,
        'col_qty': 38.0,
        'font_jenis': 9.0,
        'font_model': 8.0,
        'font_varian': 8.0,
        'font_qty': 13.5,
        'row_height': 20.0,
    }
    
    W_pts, H_pts = 297.64, 425.20
    packet = io.BytesIO()
    c = canvas.Canvas(packet, pagesize=(W_pts, H_pts))
    
    # Title
    c.setFont("Helvetica-Bold", 10)
    c.drawString(10, H_pts - 25, "Lanjutan AWB: CM66501086306 (Hal. 2 dari 2)")
    
    tbl_res = generate_table_data(
        chunk,
        is_extended=False,
        rak_map={},
        label_cfg={'header_bg': '#ffffff', 'header_color': '#000000', 'border_thickness': 0.5},
        picker_name="APRILIA MAULIDA NINGRUM",
        is_bundling=False,
        bundling_map=bundling_map,
        bundling_cfg=None,
        W_pts=W_pts,
        is_bundling_2=True,
        bundling_2_cfg=b2_cfg
    )
    
    t = create_table(
        tbl_res['table_data'],
        row_heights=tbl_res['row_heights'],
        span_cmds=tbl_res['span_cmds'],
        label_cfg={'header_bg': '#ffffff', 'header_color': '#000000', 'border_thickness': 0.5},
        is_bundling=False,
        bundling_cfg=None,
        W_pts=W_pts,
        is_bundling_2=True,
        bundling_2_cfg=b2_cfg
    )
    t.wrapOn(c, W_pts, H_pts)
    table_y = H_pts - sum(tbl_res['row_heights']) - 45
    t.drawOn(c, 7.0, table_y)
    
    c.save()
    packet.seek(0)
    doc = fitz.open("pdf", packet.read())
    pix = doc[0].get_pixmap(dpi=150)
    pix.save("scratch/test_live_b2.png")
    print("Rendered scratch/test_live_b2.png successfully!")

if __name__ == '__main__':
    test_live()
