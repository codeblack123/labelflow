import io
import qrcode
import fitz
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

def generate_summary_page(title, final_ids):
    W_pts, H_pts = 283.46, 425.20 # 100x150mm standard thermal label
    packet = io.BytesIO()
    c = canvas.Canvas(packet, pagesize=(W_pts, H_pts))
    
    # 1. Generate QR Code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=0,
    )
    qr.add_data(title)
    qr.make(fit=True)
    img_qr = qr.make_image(fill_color="black", back_color="white")
    
    qr_io = io.BytesIO()
    img_qr.save(qr_io, format='PNG')
    qr_io.seek(0)
    qr_reader = ImageReader(qr_io)
    
    # Draw QR Code centered at the top
    qr_size = 90
    qr_x = (W_pts - qr_size) / 2
    qr_y = H_pts - qr_size - 15
    c.drawImage(qr_reader, qr_x, qr_y, width=qr_size, height=qr_size)
    
    # 2. Horizontal Line
    line_y = qr_y - 10
    c.setLineWidth(1)
    c.line(20, line_y, W_pts - 20, line_y)
    
    # 3. Filename / Title (Bold, Centered)
    title_y = line_y - 15
    c.setFont("Helvetica-Bold", 7)
    c.drawCentredString(W_pts / 2, title_y, str(title))
    
    # 4. PACKING LIST / BATCH (Normal, Centered)
    pack_y = title_y - 12
    c.setFont("Helvetica", 9)
    c.drawCentredString(W_pts / 2, pack_y, "PACKING LIST / BATCH")
    
    # 5. Black Banner: LIST ID PESANAN
    banner_y = pack_y - 20
    banner_height = 14
    banner_width = 120
    banner_x = (W_pts - banner_width) / 2
    c.setFillColorRGB(0, 0, 0)
    c.rect(banner_x, banner_y - banner_height/2, banner_width, banner_height, fill=1)
    
    c.setFillColorRGB(1, 1, 1) # White text
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(W_pts / 2, banner_y - 3, f"LIST ID PESANAN ({len(final_ids)})")
    
    # 6. ID List Box
    c.setFillColorRGB(0, 0, 0) # Black border
    box_x = 15
    box_width = W_pts - 30
    box_y_top = banner_y - banner_height/2 - 10
    
    # We will draw the IDs and adjust the box height
    list_y = box_y_top - 15
    
    # 7. Bottom Banner "SCAN QR CODE"
    bottom_banner_height = 25
    bottom_banner_y = 15
    
    box_y_bottom = bottom_banner_y + bottom_banner_height + 5
    box_height = box_y_top - box_y_bottom
    
    # Draw main box (rounded)
    c.roundRect(box_x, box_y_bottom, box_width, box_height, 4, stroke=1, fill=0)
    
    # Draw dashed line
    c.setDash(2, 2)
    dashed_x = box_x + 35
    c.line(dashed_x, box_y_bottom + 5, dashed_x, box_y_top - 5)
    c.setDash() # Reset dash
    
    # Draw IDs inside the box
    c.setFont("Helvetica-Bold", 8)
    for i, pid in enumerate(final_ids, 1):
        if list_y < box_y_bottom + 15:
            c.showPage()
            c.roundRect(box_x, box_y_bottom, box_width, H_pts - 40, 4, stroke=1, fill=0)
            list_y = H_pts - 60
        
        c.setFont("Helvetica-Bold", 8)
        c.drawString(box_x + 10, list_y, f"{i:02d}.")
        c.setFont("Helvetica", 8)
        c.drawString(dashed_x + 10, list_y, str(pid))
        list_y -= 12
        
    # 8. Bottom Banner Box
    c.roundRect(box_x, bottom_banner_y, box_width, bottom_banner_height, 4, stroke=1, fill=0)
    
    # Draw text inside bottom banner
    c.setFont("Helvetica-Bold", 7)
    c.drawString(box_x + 30, bottom_banner_y + 13, "SCAN QR CODE INI UNTUK PENCATATAN")
    c.setFont("Helvetica", 6)
    c.drawString(box_x + 30, bottom_banner_y + 5, "Data akan otomatis masuk ke sistem.")
    
    # Optional smartphone icon (we can just draw a simple rectangle to simulate it if no image available)
    # Simple smartphone icon:
    icon_x = box_x + 10
    icon_y = bottom_banner_y + 4
    c.roundRect(icon_x, icon_y, 12, 18, 2, stroke=1, fill=0)
    # screen
    c.rect(icon_x + 2, icon_y + 4, 8, 12, stroke=1, fill=0)
    # button
    c.circle(icon_x + 6, icon_y + 2, 1, stroke=1, fill=0)

    c.save()
    packet.seek(0)
    
    return fitz.open(stream=packet.read(), filetype="pdf")

doc = generate_summary_page("SO6A38E4AE46E0FB000121622F_SL_PL_1200880051606620155", ["584651497262778363", "GTL712398129", "1029301931902"])
doc.save("test_summary.pdf")
