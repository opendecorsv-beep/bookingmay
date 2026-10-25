import { ReceiptItem, ReceiptScanResult } from './data';

// Helper: Normalize string for fuzzy keyword matching
export function normalizeViText(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

/**
 * Phân loại thông minh một dòng mặt hàng trên hóa đơn
 * Trả về: isFood (true: tính hoa hồng, false: loại trừ) kèm phân loại và lý do
 */
export function classifyReceiptItem(name: string): {
  isFood: boolean;
  category: ReceiptItem['category'];
  reason: string;
} {
  const norm = normalizeViText(name);

  // 1. Kiểm tra Thuế & Phí dịch vụ
  if (
    norm.includes('vat') ||
    norm.includes('thue') ||
    norm.includes('phi phuc vu') ||
    norm.includes('service charge') ||
    norm.includes('phu thu') ||
    norm.includes('phu phi') ||
    norm.includes('giam gia') ||
    norm.includes('chiet khau') ||
    norm.includes('discount') ||
    norm.includes('voucher') ||
    norm.includes('tip')
  ) {
    return {
      isFood: false,
      category: 'tax',
      reason: 'Thuế VAT / Phí dịch vụ / Giảm giá (Loại trừ)'
    };
  }

  // 2. Kiểm tra Gói Decor / Tiệc
  if (
    norm.includes('decor') ||
    norm.includes('trang tri') ||
    norm.includes('hoa tuoi') ||
    norm.includes('bong bong') ||
    norm.includes('bong bay') ||
    norm.includes('nen sinh nhat') ||
    norm.includes('banh kem') ||
    norm.includes('banh sinh nhat') ||
    norm.includes('setup') ||
    norm.includes('am thanh') ||
    norm.includes('karaoke')
  ) {
    return {
      isFood: false,
      category: 'decor',
      reason: 'Gói Decor / Dịch vụ tiệc (Loại trừ)'
    };
  }

  // 3. Kiểm tra Rượu vang & Rượu mạnh
  if (
    norm.includes('vang') ||
    norm.includes('wine') ||
    norm.includes('chivas') ||
    norm.includes('macallan') ||
    norm.includes('whisky') ||
    norm.includes('whiskey') ||
    norm.includes('vodka') ||
    norm.includes('soju') ||
    norm.includes('ruou') ||
    norm.includes('cognac') ||
    norm.includes('hennessy') ||
    norm.includes('champagne') ||
    norm.includes('cabernet') ||
    norm.includes('merlot') ||
    norm.includes('sauvignon')
  ) {
    return {
      isFood: false,
      category: 'wine',
      reason: 'Rượu vang / Rượu mạnh (Loại trừ)'
    };
  }

  // 4. Kiểm tra Bia các loại
  if (
    norm.includes('bia') ||
    norm.includes('tiger') ||
    norm.includes('heineken') ||
    norm.includes('ken bac') ||
    norm.includes('budweiser') ||
    norm.includes('sai gon') ||
    norm.includes('saigon') ||
    norm.includes('blanc') ||
    norm.includes('1664') ||
    norm.includes('corona') ||
    norm.includes('sapporo') ||
    norm.includes('tuborg') ||
    norm.includes('strongbow') ||
    norm.includes('craft beer') ||
    norm.includes('larue')
  ) {
    return {
      isFood: false,
      category: 'drink',
      reason: 'Bia / Đồ uống có cồn (Loại trừ)'
    };
  }

  // 5. Kiểm tra Nước ngọt, Nước khoáng, Nước suối & Đồ uống
  if (
    norm.includes('coca') ||
    norm.includes('pepsi') ||
    norm.includes('7up') ||
    norm.includes('seven up') ||
    norm.includes('redbull') ||
    norm.includes('bo huc') ||
    norm.includes('sting') ||
    norm.includes('aquafina') ||
    norm.includes('dasani') ||
    norm.includes('lavie') ||
    norm.includes('suoi') ||
    norm.includes('khoang') ||
    norm.includes('tra xanh') ||
    norm.includes('c2') ||
    norm.includes('twister') ||
    norm.includes('revive') ||
    norm.includes('soda') ||
    norm.includes('nuoc ngot') ||
    norm.includes('sinh to') ||
    norm.includes('nuoc ep')
  ) {
    return {
      isFood: false,
      category: 'drink',
      reason: 'Nước ngọt / Nước suối (Loại trừ)'
    };
  }

  // 6. Kiểm tra phụ phí bàn / vặt
  if (
    norm.includes('khan lanh') ||
    norm.includes('khan uop') ||
    norm.includes('da bi') ||
    norm.includes('da xo') ||
    norm.includes('xo da') ||
    norm.includes('dau phong') ||
    norm.includes('hat dieu') ||
    norm.includes('thuoc la')
  ) {
    return {
      isFood: false,
      category: 'other',
      reason: 'Khăn / Đá / Phụ phí bàn (Loại trừ)'
    };
  }

  // 7. Mặc định: Thuộc nhóm Món Ăn (Bếp / Hải sản / Chế biến)
  return {
    isFood: true,
    category: 'food',
    reason: 'Món ăn hợp lệ (Tính hoa hồng)'
  };
}

/**
 * Nén ảnh hóa đơn trên trình duyệt bằng Canvas
 * Tối ưu đặc biệt cho các hóa đơn dài 25 - 50+ món:
 * - Giữ chiều ngang tối thiểu rõ nét (lên tới 1400px) để các cột (Tên món, SL, Đơn giá, Thành tiền) không bị nén co rúm
 * - Chiều cao cho phép lên tới 4096px để bill dài dọc (tỷ lệ 1:3, 1:4) vẫn sắc nét từng chữ cái và con số
 * - JPEG quality 0.80 cho độ nét ký tự cao, hỗ trợ AI OCR đọc chuẩn xác 100%
 */
export async function compressReceiptImage(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Chiều ngang tối đa 1400px, chiều cao tối đa 4096px (đảm bảo bill siêu dài vẫn giữ trọn vẹn bề ngang rõ nét)
        const maxWidth = 1400;
        const maxHeight = 4096;

        const scale = Math.min(1, maxWidth / width, maxHeight / height);
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        // Tăng cường chất lượng render nét chữ
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Nén chất lượng JPEG 0.80 (độ nét rất cao, dung lượng ~250KB - 400KB hoàn hảo cho AI Vision)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.80);
        resolve(compressedBase64);
      };
      img.onerror = () => reject(new Error('Không thể tải dữ liệu ảnh'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Không thể đọc file ảnh'));
    reader.readAsDataURL(file);
  });
}

/**
 * Trình bóc tách văn bản hóa đơn (dành cho dán text trực tiếp từ phần mềm POS)
 */
export function parseReceiptText(text: string): ReceiptScanResult {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const items: ReceiptItem[] = [];
  let currentId = 1;

  for (const line of lines) {
    // Tìm các dòng có định dạng: [Tên món] ... [Số lượng/Đơn giá] ... [Thành tiền]
    // Hoặc [Tên món] [Số tiền]
    const priceMatches = line.match(/(\d{1,3}(?:[.,]\d{3})*|\d+)(?:\s*(?:đ|vnd|vnđ)?)?$/i);
    if (!priceMatches) continue;

    // Lọc bỏ dòng tổng cộng
    const normLine = normalizeViText(line);
    if (
      normLine.startsWith('tong cong') || 
      normLine.startsWith('tong tien') || 
      normLine.startsWith('khach thanh toan') || 
      normLine.startsWith('tien mat') ||
      normLine.startsWith('chuyen khoan')
    ) {
      continue;
    }

    const priceStr = priceMatches[1].replace(/[.,]/g, '');
    const totalPrice = parseInt(priceStr, 10);
    if (isNaN(totalPrice) || totalPrice <= 0) continue;

    const itemName = line.substring(0, priceMatches.index).trim().replace(/[-–:|*]+$/, '').trim();
    if (!itemName || itemName.length < 2) continue;

    const classification = classifyReceiptItem(itemName);

    items.push({
      id: `ITEM-${currentId++}`,
      name: itemName,
      quantity: 1,
      unitPrice: totalPrice,
      totalPrice,
      isFood: classification.isFood,
      category: classification.category,
      reason: classification.reason
    });
  }

  let totalFood = 0;
  let totalExcluded = 0;

  items.forEach(it => {
    if (it.isFood) totalFood += it.totalPrice;
    else totalExcluded += it.totalPrice;
  });

  return {
    restaurantName: 'Nhà hàng Mây',
    items,
    totalReceipt: totalFood + totalExcluded,
    totalFood,
    totalExcluded
  };
}

/**
 * Dữ liệu Hóa Đơn Thử Nghiệm Chuẩn Mây Restaurant
 * Giúp Quản lý & Giám sát bấm 1 chạm để kiểm tra ngay tính năng bóc tách
 */
export const DEMO_RECEIPT_RESULT: ReceiptScanResult = {
  restaurantName: 'Nhà Hàng Mây - Ẩm Thực Tiệc & Phòng VIP',
  tableName: 'VIP Mây 102',
  date: '2026-10-22 19:45',
  items: [
    {
      id: 'demo-1',
      name: 'Mú đỏ hấp Hồng Kông (1.8kg)',
      quantity: 1,
      unitPrice: 1850000,
      totalPrice: 1850000,
      isFood: true,
      category: 'food',
      reason: 'Hải sản tươi sống chế biến'
    },
    {
      id: 'demo-2',
      name: 'Bò Wagyu A5 nướng đá muối',
      quantity: 1,
      unitPrice: 1450000,
      totalPrice: 1450000,
      isFood: true,
      category: 'food',
      reason: 'Món ăn cao cấp'
    },
    {
      id: 'demo-3',
      name: 'Lẩu hải sản Mây chua cay',
      quantity: 1,
      unitPrice: 890000,
      totalPrice: 890000,
      isFood: true,
      category: 'food',
      reason: 'Món lẩu'
    },
    {
      id: 'demo-4',
      name: 'Gỏi củ hũ dừa tôm thịt',
      quantity: 1,
      unitPrice: 220000,
      totalPrice: 220000,
      isFood: true,
      category: 'food',
      reason: 'Khai vị'
    },
    {
      id: 'demo-5',
      name: 'Cơm chiên hải sản hoàng kim',
      quantity: 1,
      unitPrice: 180000,
      totalPrice: 180000,
      isFood: true,
      category: 'food',
      reason: 'Món no'
    },
    {
      id: 'demo-6',
      name: '1 Thùng Bia Tiger Crystal (24 lon)',
      quantity: 24,
      unitPrice: 22000,
      totalPrice: 528000,
      isFood: false,
      category: 'drink',
      reason: 'Bia / Đồ uống có cồn (Loại trừ)'
    },
    {
      id: 'demo-7',
      name: '6 Lon Nước ngọt Coca-Cola',
      quantity: 6,
      unitPrice: 18000,
      totalPrice: 108000,
      isFood: false,
      category: 'drink',
      reason: 'Nước ngọt (Loại trừ)'
    },
    {
      id: 'demo-8',
      name: 'Gói Decor Tiệc Sinh Nhật Mẫu 2',
      quantity: 1,
      unitPrice: 1500000,
      totalPrice: 1500000,
      isFood: false,
      category: 'decor',
      reason: 'Gói Decor / Dịch vụ tiệc (Loại trừ)'
    },
    {
      id: 'demo-9',
      name: 'Khăn lạnh tiệc (10 cái)',
      quantity: 10,
      unitPrice: 3000,
      totalPrice: 30000,
      isFood: false,
      category: 'other',
      reason: 'Khăn / Phụ phí bàn (Loại trừ)'
    },
    {
      id: 'demo-10',
      name: 'Thuế VAT (8%)',
      quantity: 1,
      unitPrice: 542080,
      totalPrice: 542080,
      isFood: false,
      category: 'tax',
      reason: 'Thuế VAT (Loại trừ)'
    }
  ],
  totalReceipt: 7318080,
  totalFood: 4590000,
  totalExcluded: 2728080
};
