import cv2
import numpy as np
import os

images = [
    r"C:\Users\boron\.gemini\antigravity-ide\brain\a471f4f3-5035-4dbb-a876-a223808c3658\.user_uploaded\media_1789779859945.jpg",
    r"C:\Users\boron\.gemini\antigravity-ide\brain\a471f4f3-5035-4dbb-a876-a223808c3658\.user_uploaded\media_1789779859965.jpg"
]

output_dir = "foto selfie"
os.makedirs(output_dir, exist_ok=True)

photo_index = 1

for img_path in images:
    if not os.path.exists(img_path):
        continue
    
    img = cv2.imread(img_path)
    if img is None:
        continue
    
    h, w, _ = img.shape
    row_h = h // 2
    col_w = w // 5
    
    for r in range(2):
        for c in range(5):
            # Crop a bit inside to avoid borders and text if possible
            y_start = r * row_h + int(row_h * 0.05)
            y_end = (r + 1) * row_h - int(row_h * 0.15) # chop more at bottom to remove text
            x_start = c * col_w + int(col_w * 0.05)
            x_end = (c + 1) * col_w - int(col_w * 0.05)
            
            cropped = img[y_start:y_end, x_start:x_end]
            out_path = os.path.join(output_dir, f"selfie_{photo_index:02d}.png")
            cv2.imwrite(out_path, cropped)
            photo_index += 1

print(f"Processed and saved {photo_index - 1} photos to '{output_dir}'.")
