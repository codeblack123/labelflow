import io
import qrcode
import fitz
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

def generate_summary_page(title, final_ids):
    W_pts, H_pts = 283.46, 425.20 # 100x150mm
    packet = io.BytesIO()
    c = canvas.Canvas(packet, pagesize=(W_pts, H_pts))
    
    # 1. Top QR Code
    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=10, border=0)
    qr.add_data(title)
    qr.make(fit=True)
    img_qr = qr.make_image(fill_color="black", back_color="white")
    qr_io = io.BytesIO()
    img_qr.save(qr_io, format='PNG')
    qr_io.seek(0)
    qr_reader = ImageReader(qr_io)
    
    qr_size = 90
    qr_x = (W_pts - qr_size) / 2
    qr_y = H_pts - qr_size - 15
    c.drawImage(qr_reader, qr_x, qr_y, width=qr_size, height=qr_size)
    
    # 2. Horizontal Line
    line_y = qr_y - 10
    c.setLineWidth(1)
    c.line(20, line_y, W_pts - 20, line_y)
    
    # 3. Title
    title_y = line_y - 15
    c.setFont("Helvetica-Bold", 12)
    title_font_size = 12
    while c.stringWidth(title, "Helvetica-Bold", title_font_size) > W_pts - 40 and title_font_size > 6:
        title_font_size -= 1
    c.setFont("Helvetica-Bold", title_font_size)
    c.drawCentredString(W_pts / 2, title_y, str(title))
    
    # 4. PACKING LIST
    pack_y = title_y - 15
    c.setFont("Helvetica", 9)
    c.drawCentredString(W_pts / 2, pack_y, "PACKING LIST / BATCH")
    
    # 5. Black Banner
    banner_y = pack_y - 20
    banner_height = 14
    banner_width = 120
    banner_x = (W_pts - banner_width) / 2
    c.setFillColorRGB(0, 0, 0)
    c.rect(banner_x, banner_y - banner_height/2, banner_width, banner_height, fill=1)
    
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(W_pts / 2, banner_y - 3, f"LIST ID PESANAN ({len(final_ids)})")
    
    # 6. Bottom Banner
    c.setFillColorRGB(0, 0, 0)
    bottom_banner_height = 25
    bottom_banner_y = 15
    box_x = 10
    box_width = W_pts - 20
    c.roundRect(box_x, bottom_banner_y, box_width, bottom_banner_height, 4, stroke=1, fill=0)
    
    c.setFont("Helvetica-Bold", 7)
    c.drawString(box_x + 30, bottom_banner_y + 13, "SCAN QR CODE INI UNTUK PENCATATAN")
    c.setFont("Helvetica", 6)
    c.drawString(box_x + 30, bottom_banner_y + 5, "Data akan otomatis masuk ke sistem.")
    
    # Smartphone Icon
    icon_x = box_x + 8
    icon_y = bottom_banner_y + 3
    c.roundRect(icon_x, icon_y, 14, 19, 2, stroke=1, fill=0)
    # mini screen
    screen_x = icon_x + 2
    screen_y = icon_y + 4
    screen_w = 10
    screen_h = 13
    c.rect(screen_x, screen_y, screen_w, screen_h, stroke=1, fill=0)
    c.circle(icon_x + 7, icon_y + 2, 1, stroke=1, fill=0)
    # Mini QR code inside screen
    c.drawImage(qr_reader, screen_x + 1, screen_y + 1, width=screen_w - 2, height=screen_w - 2)
    
    # 7. Main Box
    box_y_top = banner_y - banner_height/2 - 10
    box_y_bottom = bottom_banner_y + bottom_banner_height + 5
    box_height = box_y_top - box_y_bottom
    c.roundRect(box_x, box_y_bottom, box_width, box_height, 4, stroke=1, fill=0)
    
    # 8. Draw Multi-column list
    import math
    num_items = len(final_ids)
    if num_items == 0:
        c.save()
        packet.seek(0)
        return fitz.open(stream=packet.read(), filetype="pdf")
        
    num_cols = 5 if num_items >= 5 else num_items
    if num_cols == 0: num_cols = 1
    rows_per_col = math.ceil(num_items / num_cols)
    if rows_per_col == 0: rows_per_col = 1
    
    col_width = box_width / num_cols
    
    # draw column vertical dashed lines
    c.setDash(1, 2)
    for col in range(1, num_cols):
        line_x = box_x + col * col_width
        c.line(line_x, box_y_bottom + 2, line_x, box_y_top - 2)
    c.setDash()
    
    # Calculate row height based on box height and rows_per_col
    margin_y = 5
    avail_height = box_height - (margin_y * 2)
    row_height = avail_height / rows_per_col
    # max row height = 12 so they don't get too spaced out
    row_height = min(12, row_height)
    
    # Font size logic: base on column width and row height
    base_font_size = min(5.5, row_height * 0.8)
    
    # We want it to be as large as possible without overflowing col_width
    start_y = box_y_top - margin_y - (row_height * 0.8)
    
    for i, pid in enumerate(final_ids):
        col_idx = i // rows_per_col
        row_idx = i % rows_per_col
        
        x = box_x + (col_idx * col_width) + 2
        y = start_y - (row_idx * row_height)
        
        # Adjust font size if text is too long for the column
        idx_str = f"{i+1:02d}. "
        pid_str = str(pid)
        
        c.setFont("Helvetica-Bold", base_font_size)
        idx_width = c.stringWidth(idx_str, "Helvetica-Bold", base_font_size)
        
        pid_font_size = base_font_size
        while c.stringWidth(pid_str, "Helvetica", pid_font_size) > (col_width - idx_width - 3) and pid_font_size > 3:
            pid_font_size -= 0.5
            
        c.setFont("Helvetica-Bold", base_font_size)
        c.drawString(x, y, idx_str)
        
        c.setFont("Helvetica", pid_font_size)
        c.drawString(x + idx_width, y, pid_str)
        
    c.save()
    packet.seek(0)
    return fitz.open(stream=packet.read(), filetype="pdf")

doc = generate_summary_page("CAMPUR 103.50 AINUL 17", [f"260617B3BQNUU{i}" for i in range(50)])
doc.save("test_summary_multicol.pdf")
doc = generate_summary_page("CAMPUR 103.50 AINUL 17", [f"260617B3BQNUU{i}" for i in range(100)])
doc.save("test_summary_multicol_100.pdf")
