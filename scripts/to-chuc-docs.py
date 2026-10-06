import os
import shutil
import sys

# Đảm bảo UTF-8 cho Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

root = r"d:\07-Competitions-Hackathons\an-tam"
docs = os.path.join(root, "docs")
legacy = os.path.join(root, "legacy")
en_docs = os.path.join(docs, "tieng-anh")

os.makedirs(docs, exist_ok=True)
os.makedirs(legacy, exist_ok=True)
os.makedirs(en_docs, exist_ok=True)

# 1. Copy an toàn file Excel đang mở
src_excel = os.path.join(root, "AnTam_Issues_1_5_Test_Scenarios.xlsx")
dest_excel = os.path.join(docs, "04_Ma_Tran_Kiem_Thu_Va_Kich_Ban.xlsx")
if os.path.exists(src_excel):
    try:
        with open(src_excel, "rb") as f_in:
            with open(dest_excel, "wb") as f_out:
                shutil.copyfileobj(f_in, f_out)
        print("OK: Copied 04_Ma_Tran_Kiem_Thu_Va_Kich_Ban.xlsx")
    except Exception as e:
        print(f"Error copying: {e}")

# 2. Chuyển screenshots sang legacy
src_screen = os.path.join(root, "screenshots")
dest_screen = os.path.join(legacy, "anh-chup-cu")
if os.path.exists(src_screen):
    if os.path.exists(dest_screen):
        shutil.rmtree(dest_screen)
    shutil.move(src_screen, dest_screen)
    print("OK: Moved screenshots -> legacy/anh-chup-cu")

# 3. Chuyển test.docx nháp sang legacy
test_doc = os.path.join(docs, "test.docx")
if os.path.exists(test_doc):
    shutil.move(test_doc, os.path.join(legacy, "test_nhap.docx"))
    print("OK: Moved test.docx -> legacy/test_nhap.docx")

# 4. Đổi tên chuẩn hóa bộ tài liệu Tiếng Việt
renames = [
    ("De_An_Du_An_An_Tam_AI.docx", "01_De_An_Du_An_An_Tam_AI.docx"),
    ("An_Tam_AI_Proposal.pdf", "02_Ho_So_Du_Thi_Proposal_VI.pdf"),
    ("An_Tam_AI_Pitch_VI.pptx", "03_Slide_Thuyet_Trinh_Pitch_VI.pptx"),
    ("AnTam_Issues_1_8_Data_Layer_Engine.xlsx", "05_Kien_Truc_Du_Lieu_Data_Layer.xlsx"),
    ("image.png", "anh_minh_hoa_du_an.png"),
]

for old, new in renames:
    p_old = os.path.join(docs, old)
    p_new = os.path.join(docs, new)
    if os.path.exists(p_old):
        if os.path.exists(p_new):
            os.remove(p_new)
        shutil.move(p_old, p_new)
        print(f"OK: Renamed {old} -> {new}")

# 5. Chuyển tài liệu tiếng Anh vào docs/tieng-anh
en_files = [
    ("An_Tam_AI_Competition_Proposal_EN.docx", "Proposal_Tieng_Anh.docx"),
    ("An_Tam_AI_Pitch_EN.pptx", "Slide_Pitch_Tieng_Anh.pptx"),
]
for old, new in en_files:
    p_old = os.path.join(docs, old)
    p_new = os.path.join(en_docs, new)
    if os.path.exists(p_old):
        if os.path.exists(p_new):
            os.remove(p_new)
        shutil.move(p_old, p_new)
        print(f"OK: Moved to tieng-anh/{new}")

print("COMPLETED!")
