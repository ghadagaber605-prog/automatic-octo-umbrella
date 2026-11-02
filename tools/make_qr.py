"""QR codes embedded in the visits record (tools/qr/*.png)."""
import segno, os
D = os.path.join(os.path.dirname(__file__), "qr")
LINKS = {
    "drive-scans": "https://drive.google.com/drive/folders/12waj8-BzUFtovYqaF3-5igySbA-aqwSx",  # الزيارات الصفيه للمعلمات الجدد (CamScanner forms)
    "online-record": "https://claude.ai/artifact/AHA38L1VWBLSnAzs1ym7fx",                     # السجل الإلكتروني
}
for k, url in LINKS.items():
    segno.make(url, error="q").save(os.path.join(D, k + ".png"), scale=10, border=2, dark="#0F5F5C")
    print(k, url)
