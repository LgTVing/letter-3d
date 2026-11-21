# Thư tay 3D tương tác (20/11)

Thư tay 3D tương tác dựng bằng **Vite + Three.js**, hỗ trợ phong bì 3D, dấu sáp hoa hồng chạm nổi vỡ đôi, bút máy viết từng dòng và 2 ảnh Polaroid lật 2 mặt.

## Chạy cục bộ

```bash
npm install
npm run dev
```

Mở trình duyệt tại `http://localhost:5173/`.

## Đưa lên GitHub bằng GitHub Desktop & bật GitHub Pages

1. Mở **GitHub Desktop** → `File` → `Add local repository...` → chọn thư mục dự án này.
2. Nhấn **Publish repository** (hoặc **Push origin** nếu bạn đã tạo repo sẵn trên GitHub và thêm remote `origin`).
3. Trên trang repository GitHub → vào **Settings** → **Pages** → mục **Build and deployment / Source** chọn **GitHub Actions**.
4. Workflow [deploy.yml](.github/workflows/deploy.yml) sẽ tự động build và xuất bản trang web ngay khi bạn push lên nhánh `main`.
