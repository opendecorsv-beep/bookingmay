const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const ExcelJS = require('exceljs');

const supabaseUrl = 'https://imypeukyfdqngqfsmrzm.supabase.co';
const supabaseKey = 'sb_publishable_gAjjmPTAnr8OYvwH8urthg_Vkk5b-Js';
const supabase = createClient(supabaseUrl, supabaseKey);

const STAFF_ROLES_MAP = {
  "Lê Thị Thùy Trang": { role: "CSKH", code: "NV-042" },
  "Đoàn Thị Nhật Ánh": { role: "Nhân viên", code: "NV-031" },
  "Nguyễn Thị Thanh Mai": { role: "Giám sát", code: "GS-004" },
  "Lê Nguyễn Anh Huy": { role: "Giám sát", code: "GS-043" },
  "Lương Huyền Linh": { role: "Phục vụ", code: "NV-003" },
  "Nguyễn Minh Đạt": { role: "Phục vụ", code: "NV-048" },
  "Trần Diệu Xoan": { role: "Thu ngân", code: "NV-010" },
  "Đào Thị Nga": { role: "Phục vụ", code: "NV-036" },
  "Phạm Trần Mỹ Tâm": { role: "Thu ngân", code: "NV-008" },
  "Nguyễn Thị Là": { role: "Phục vụ", code: "NV-035" },
  "Trần Thị Phương Linh": { role: "Phục vụ", code: "NV-012" },
  "Lê Thị Thuỳ Trâm": { role: "Phục vụ", code: "NV-002" },
  "Trần Thị Bích Loan": { role: "Phục vụ", code: "NV-011" },
  "Phạm Thị Quỳnh Như": { role: "Phục vụ", code: "NV-007" },
  "Vũ Thị Lâm Nhi": { role: "Lễ tân", code: "NV-020" },
  "Khổng văn danh": { role: "Phục vụ", code: "NV-047" },
  "Khổng Văn Danh": { role: "Phục vụ", code: "NV-047" },
  "Trang": { role: "CSKH", code: "NV-042" },
  "Đồng Văn Tiến": { role: "Giám sát", code: "GS-044" },
  "Diễm Phố Núi": { role: "CTV", code: "CTV-045" },
  "Nguyễn Thị Lan Anh": { role: "Giám sát", code: "GS-046" }
};

// Colors (ARGB)
const COLOR_NAVY_DARK = 'FF0F172A'; // Slate-900
const COLOR_NAVY_MED = 'FF1E293B';  // Slate-800
const COLOR_NAVY_LIGHT = 'FF334155';
const COLOR_GOLD = 'FFB45309';      // Amber-700
const COLOR_GOLD_LIGHT = 'FFFEF3C7';// Amber-100
const COLOR_EMERALD = 'FF065F46';   // Emerald-800
const COLOR_EMERALD_BG = 'FFECFDF5';
const COLOR_BORDER = 'FFE2E8F0';    // Slate-200
const COLOR_ZEBRA = 'FFF8FAFC';     // Slate-50
const COLOR_WHITE = 'FFFFFFFF';
const COLOR_TOTAL_BG = 'FFF1F5F9';  // Slate-100

const thinBorder = {
  top: { style: 'thin', color: { argb: COLOR_BORDER } },
  bottom: { style: 'thin', color: { argb: COLOR_BORDER } },
  left: { style: 'thin', color: { argb: COLOR_BORDER } },
  right: { style: 'thin', color: { argb: COLOR_BORDER } },
};

const totalTopBottomBorder = {
  top: { style: 'thin', color: { argb: 'FF94A3B8' } },
  bottom: { style: 'double', color: { argb: 'FF1E293B' } },
  left: { style: 'thin', color: { argb: COLOR_BORDER } },
  right: { style: 'thin', color: { argb: COLOR_BORDER } },
};

async function main() {
  console.log('1. Đang kết nối Supabase và tải dữ liệu CONFIG_CMS...');
  const { data, error } = await supabase.from('bookings').select('menu').eq('id', 'CONFIG_CMS').single();
  if (error || !data) {
    console.error('Lỗi khi lấy dữ liệu từ Supabase:', error);
    process.exit(1);
  }

  const rawList = typeof data.menu === 'string' ? JSON.parse(data.menu) : data.menu;
  console.log(`=> Đã tải thành công ${rawList.length} giao dịch CMS từ trước tới nay.`);

  // Sắp xếp dữ liệu chi tiết theo ngày giờ: mới nhất lên đầu hoặc từ cũ đến mới
  // Đối với sổ kế toán, sắp xếp theo Ngày tăng dần (hoặc giảm dần kèm STT)
  const sortedByDateAsc = [...rawList].sort((a, b) => {
    const dtA = `${a.date || ''} ${a.time || ''}`;
    const dtB = `${b.date || ''} ${b.time || ''}`;
    return dtA.localeCompare(dtB);
  });

  const sortedByDateDesc = [...rawList].sort((a, b) => {
    const dtA = `${a.date || ''} ${a.time || ''}`;
    const dtB = `${b.date || ''} ${b.time || ''}`;
    return dtB.localeCompare(dtA);
  });

  // Tính tổng
  const totalRewardAll = rawList.reduce((sum, c) => sum + (c.totalReward || 0), 0);
  const totalFoodAll = rawList.reduce((sum, c) => sum + (c.billFoodAmount || 0), 0);
  const totalEntries = rawList.length;

  // Tổng hợp theo nhân viên
  const staffMap = {};
  rawList.forEach(c => {
    const name = (c.staffName || 'Chưa rõ').trim();
    if (!staffMap[name]) {
      const staffInfo = STAFF_ROLES_MAP[name] || { role: 'Nhân viên', code: 'NV' };
      staffMap[name] = {
        name,
        role: staffInfo.role,
        code: staffInfo.code,
        count: 0,
        reward: 0,
        food: 0,
        items: new Set(),
        rooms: new Set(),
        dates: new Set(),
      };
    }
    staffMap[name].count += 1;
    staffMap[name].reward += (c.totalReward || 0);
    staffMap[name].food += (c.billFoodAmount || 0);
    const item = c.productName || (c.category === 'booking_bill' ? `Bill % (${c.billPercent}%)` : 'CMS');
    staffMap[name].items.add(item);
    if (c.tableOrRoom) staffMap[name].rooms.add(c.tableOrRoom);
    if (c.date) staffMap[name].dates.add(c.date);
  });

  const staffSummaryList = Object.values(staffMap).sort((a, b) => b.reward - a.reward);

  // Tổng hợp theo ngày
  const dateMap = {};
  rawList.forEach(c => {
    const d = c.date || 'Chưa rõ';
    if (!dateMap[d]) {
      dateMap[d] = {
        date: d,
        count: 0,
        reward: 0,
        food: 0,
        staffs: new Set(),
        supervisors: new Set(),
      };
    }
    dateMap[d].count += 1;
    dateMap[d].reward += (c.totalReward || 0);
    dateMap[d].food += (c.billFoodAmount || 0);
    dateMap[d].staffs.add(c.staffName);
    if (c.createdByName) dateMap[d].supervisors.add(c.createdByName);
  });
  const dateSummaryList = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));

  // Tổng hợp theo Giám Sát
  const supervisorMap = {};
  rawList.forEach(c => {
    const sName = c.createdByName || c.createdById || 'Quản lý';
    if (!supervisorMap[sName]) {
      supervisorMap[sName] = {
        name: sName,
        count: 0,
        reward: 0,
        food: 0,
        staffs: new Set(),
      };
    }
    supervisorMap[sName].count += 1;
    supervisorMap[sName].reward += (c.totalReward || 0);
    supervisorMap[sName].food += (c.billFoodAmount || 0);
    supervisorMap[sName].staffs.add(c.staffName);
  });
  const supervisorSummaryList = Object.values(supervisorMap).sort((a, b) => b.reward - a.reward);

  console.log('2. Đang khởi tạo Workbook Excel chuyên nghiệp...');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Mây Restaurant - Quản Lý Webapp';
  workbook.lastModifiedBy = 'Hệ Thống Booking Mây';
  workbook.created = new Date();
  workbook.modified = new Date();

  // ---------------------------------------------------------------------------
  // SHEET 1: BẢNG TỔNG HỢP DUYỆT CHI (Dành cho Kế Toán & Giám Đốc)
  // ---------------------------------------------------------------------------
  const wsSummary = workbook.addWorksheet('1. TONG_HOP_DUYET_CHI', {
    properties: { tabColor: { argb: 'FFB45309' } },
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  });

  wsSummary.views = [{ showGridLines: true }];

  // Column widths
  wsSummary.columns = [
    { key: 'stt', width: 8 },         // A
    { key: 'code', width: 14 },        // B
    { key: 'name', width: 26 },        // C
    { key: 'role', width: 16 },        // D
    { key: 'count', width: 15 },       // E
    { key: 'items', width: 34 },       // F
    { key: 'food', width: 25 },        // G
    { key: 'reward', width: 25 },      // H
    { key: 'sign', width: 22 },        // I
    { key: 'note', width: 22 }         // J
  ];

  // Header Title Block
  wsSummary.mergeCells('A1:J1');
  const titleA1 = wsSummary.getCell('A1');
  titleA1.value = 'MÂY RESTAURANT - BUÔN MA THUỘT';
  titleA1.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF64748B' } };
  titleA1.alignment = { vertical: 'middle', horizontal: 'left' };
  wsSummary.getRow(1).height = 20;

  wsSummary.mergeCells('A2:J2');
  const titleA2 = wsSummary.getCell('A2');
  titleA2.value = 'BẢNG TỔNG HỢP HOA HỒNG (CMS) BÁN HÀNG & UPSELL NHÂN VIÊN';
  titleA2.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: COLOR_NAVY_DARK } };
  titleA2.alignment = { vertical: 'middle', horizontal: 'left' };
  wsSummary.getRow(2).height = 28;

  wsSummary.mergeCells('A3:J3');
  const titleA3 = wsSummary.getCell('A3');
  titleA3.value = `Hồ sơ đề nghị Kế toán kiểm tra & duyệt chi | Dữ liệu toàn bộ từ ngày 10/10/2026 đến ngày 07/11/2026 (Xuất ngày: ${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN')})`;
  titleA3.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FF475569' } };
  titleA3.alignment = { vertical: 'middle', horizontal: 'left' };
  wsSummary.getRow(3).height = 20;

  // KPI Mini Dashboard in Rows 5-6
  wsSummary.mergeCells('A5:C5');
  wsSummary.getCell('A5').value = 'TỔNG HOA HỒNG DUYỆT CHI';
  wsSummary.getCell('A5').font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FFB45309' } };
  wsSummary.getCell('A5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_GOLD_LIGHT } };
  wsSummary.getCell('A5').alignment = { horizontal: 'center', vertical: 'middle' };

  wsSummary.mergeCells('A6:C6');
  wsSummary.getCell('A6').value = totalRewardAll;
  wsSummary.getCell('A6').numFmt = '#,##0 "đ"';
  wsSummary.getCell('A6').font = { name: 'Segoe UI', size: 15, bold: true, color: { argb: COLOR_GOLD } };
  wsSummary.getCell('A6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_GOLD_LIGHT } };
  wsSummary.getCell('A6').alignment = { horizontal: 'center', vertical: 'middle' };

  wsSummary.mergeCells('D5:F5');
  wsSummary.getCell('D5').value = 'TỔNG DOANH SỐ ĐỒ ĂN MANG VỀ';
  wsSummary.getCell('D5').font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: COLOR_EMERALD } };
  wsSummary.getCell('D5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_EMERALD_BG } };
  wsSummary.getCell('D5').alignment = { horizontal: 'center', vertical: 'middle' };

  wsSummary.mergeCells('D6:F6');
  wsSummary.getCell('D6').value = totalFoodAll;
  wsSummary.getCell('D6').numFmt = '#,##0 "đ"';
  wsSummary.getCell('D6').font = { name: 'Segoe UI', size: 15, bold: true, color: { argb: COLOR_EMERALD } };
  wsSummary.getCell('D6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_EMERALD_BG } };
  wsSummary.getCell('D6').alignment = { horizontal: 'center', vertical: 'middle' };

  wsSummary.mergeCells('G5:H5');
  wsSummary.getCell('G5').value = 'TỔNG SỐ LƯỢT THƯỞNG';
  wsSummary.getCell('G5').font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: COLOR_NAVY_MED } };
  wsSummary.getCell('G5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TOTAL_BG } };
  wsSummary.getCell('G5').alignment = { horizontal: 'center', vertical: 'middle' };

  wsSummary.mergeCells('G6:H6');
  wsSummary.getCell('G6').value = `${totalEntries} lượt`;
  wsSummary.getCell('G6').font = { name: 'Segoe UI', size: 15, bold: true, color: { argb: COLOR_NAVY_MED } };
  wsSummary.getCell('G6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TOTAL_BG } };
  wsSummary.getCell('G6').alignment = { horizontal: 'center', vertical: 'middle' };

  wsSummary.mergeCells('I5:J5');
  wsSummary.getCell('I5').value = 'SỐ NHÂN SỰ THỤ HƯỞNG';
  wsSummary.getCell('I5').font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: COLOR_NAVY_MED } };
  wsSummary.getCell('I5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TOTAL_BG } };
  wsSummary.getCell('I5').alignment = { horizontal: 'center', vertical: 'middle' };

  wsSummary.mergeCells('I6:J6');
  wsSummary.getCell('I6').value = `${staffSummaryList.length} nhân sự`;
  wsSummary.getCell('I6').font = { name: 'Segoe UI', size: 15, bold: true, color: { argb: COLOR_NAVY_MED } };
  wsSummary.getCell('I6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TOTAL_BG } };
  wsSummary.getCell('I6').alignment = { horizontal: 'center', vertical: 'middle' };

  ['A5','B5','C5','D5','E5','F5','G5','H5','I5','J5','A6','B6','C6','D6','E6','F6','G6','H6','I6','J6'].forEach(cellId => {
    wsSummary.getCell(cellId).border = thinBorder;
  });
  wsSummary.getRow(5).height = 18;
  wsSummary.getRow(6).height = 26;

  // Table Headers at Row 8
  const summaryHeaders = [
    'STT',
    'MÃ NV',
    'HỌ VÀ TÊN NHÂN SỰ',
    'VỊ TRÍ / BỘ PHẬN',
    'SỐ LƯỢT THƯỞNG',
    'CÁC MÓN / HẠNG MỤC CHÍNH',
    'DOANH SỐ ĐỒ ĂN MANG VỀ',
    'TỔNG TIỀN CMS DUYỆT CHI',
    'KÝ NHẬN CỦA NHÂN VIÊN',
    'GHI CHÚ KẾ TOÁN'
  ];

  const headerRow8 = wsSummary.getRow(8);
  headerRow8.height = 30;
  summaryHeaders.forEach((text, idx) => {
    const cell = headerRow8.getCell(idx + 1);
    cell.value = text;
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: COLOR_WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NAVY_MED } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = thinBorder;
  });

  // Data rows starting from Row 9
  let rowIdx = 9;
  staffSummaryList.forEach((s, idx) => {
    const row = wsSummary.getRow(rowIdx);
    row.height = 24;
    const isZebra = idx % 2 === 1;
    const bgColor = isZebra ? COLOR_ZEBRA : COLOR_WHITE;

    row.getCell(1).value = idx + 1;
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    row.getCell(2).value = s.code;
    row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };

    row.getCell(3).value = s.name;
    row.getCell(3).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: COLOR_NAVY_DARK } };
    row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };

    row.getCell(4).value = s.role;
    row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };

    row.getCell(5).value = s.count;
    row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(5).numFmt = '#,##0';

    row.getCell(6).value = Array.from(s.items).join(', ');
    row.getCell(6).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(6).font = { name: 'Segoe UI', size: 9, color: { argb: 'FF475569' } };

    row.getCell(7).value = s.food;
    row.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(7).numFmt = '#,##0 "đ"';

    row.getCell(8).value = s.reward;
    row.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(8).font = { name: 'Segoe UI', size: 10.5, bold: true, color: { argb: COLOR_GOLD } };
    row.getCell(8).numFmt = '#,##0 "đ"';

    row.getCell(9).value = ''; // Ký nhận
    row.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };

    row.getCell(10).value = ''; // Ghi chú

    for (let c = 1; c <= 10; c++) {
      const cell = row.getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      cell.border = thinBorder;
      if (!cell.font) cell.font = { name: 'Segoe UI', size: 9.5 };
    }

    rowIdx++;
  });

  // Summary Row (TOTAL)
  const totalRowSummary = wsSummary.getRow(rowIdx);
  totalRowSummary.height = 30;
  totalRowSummary.getCell(1).value = '';
  totalRowSummary.getCell(2).value = '';
  totalRowSummary.getCell(3).value = `TỔNG CỘNG DUYỆT CHI (${staffSummaryList.length} NHÂN SỰ)`;
  totalRowSummary.getCell(3).font = { name: 'Segoe UI', size: 10.5, bold: true, color: { argb: COLOR_NAVY_DARK } };
  totalRowSummary.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };

  totalRowSummary.getCell(4).value = '';

  totalRowSummary.getCell(5).value = { formula: `SUM(E9:E${rowIdx - 1})` };
  totalRowSummary.getCell(5).numFmt = '#,##0';
  totalRowSummary.getCell(5).font = { name: 'Segoe UI', size: 10.5, bold: true, color: { argb: COLOR_NAVY_DARK } };
  totalRowSummary.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };

  totalRowSummary.getCell(6).value = '';

  totalRowSummary.getCell(7).value = { formula: `SUM(G9:G${rowIdx - 1})` };
  totalRowSummary.getCell(7).numFmt = '#,##0 "đ"';
  totalRowSummary.getCell(7).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: COLOR_EMERALD } };
  totalRowSummary.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };

  totalRowSummary.getCell(8).value = { formula: `SUM(H9:H${rowIdx - 1})` };
  totalRowSummary.getCell(8).numFmt = '#,##0 "đ"';
  totalRowSummary.getCell(8).font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: COLOR_GOLD } };
  totalRowSummary.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };

  for (let c = 1; c <= 10; c++) {
    const cell = totalRowSummary.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TOTAL_BG } };
    cell.border = totalTopBottomBorder;
  }

  // Signature Block
  const sigStartRow = rowIdx + 3;
  wsSummary.mergeCells(`B${sigStartRow}:C${sigStartRow}`);
  wsSummary.getCell(`B${sigStartRow}`).value = 'NGƯỜI LẬP BIỂU';
  wsSummary.getCell(`B${sigStartRow}`).font = { name: 'Segoe UI', size: 10, bold: true };
  wsSummary.getCell(`B${sigStartRow}`).alignment = { horizontal: 'center' };

  wsSummary.mergeCells(`D${sigStartRow}:E${sigStartRow}`);
  wsSummary.getCell(`D${sigStartRow}`).value = 'GIÁM SÁT CA TRỰC';
  wsSummary.getCell(`D${sigStartRow}`).font = { name: 'Segoe UI', size: 10, bold: true };
  wsSummary.getCell(`D${sigStartRow}`).alignment = { horizontal: 'center' };

  wsSummary.mergeCells(`F${sigStartRow}:G${sigStartRow}`);
  wsSummary.getCell(`F${sigStartRow}`).value = 'KẾ TOÁN TRƯỞNG';
  wsSummary.getCell(`F${sigStartRow}`).font = { name: 'Segoe UI', size: 10, bold: true };
  wsSummary.getCell(`F${sigStartRow}`).alignment = { horizontal: 'center' };

  wsSummary.mergeCells(`H${sigStartRow}:J${sigStartRow}`);
  wsSummary.getCell(`H${sigStartRow}`).value = 'BAN GIÁM ĐỐC DUYỆT';
  wsSummary.getCell(`H${sigStartRow}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: COLOR_GOLD } };
  wsSummary.getCell(`H${sigStartRow}`).alignment = { horizontal: 'center' };

  const sigSubRow = sigStartRow + 1;
  wsSummary.mergeCells(`B${sigSubRow}:C${sigSubRow}`);
  wsSummary.getCell(`B${sigSubRow}`).value = '(Ký, ghi rõ họ tên)';
  wsSummary.getCell(`B${sigSubRow}`).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
  wsSummary.getCell(`B${sigSubRow}`).alignment = { horizontal: 'center' };

  wsSummary.mergeCells(`D${sigSubRow}:E${sigSubRow}`);
  wsSummary.getCell(`D${sigSubRow}`).value = '(Đối soát chính xác)';
  wsSummary.getCell(`D${sigSubRow}`).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
  wsSummary.getCell(`D${sigSubRow}`).alignment = { horizontal: 'center' };

  wsSummary.mergeCells(`F${sigSubRow}:G${sigSubRow}`);
  wsSummary.getCell(`F${sigSubRow}`).value = '(Kiểm tra chứng từ)';
  wsSummary.getCell(`F${sigSubRow}`).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
  wsSummary.getCell(`F${sigSubRow}`).alignment = { horizontal: 'center' };

  wsSummary.mergeCells(`H${sigSubRow}:J${sigSubRow}`);
  wsSummary.getCell(`H${sigSubRow}`).value = '(Phê duyệt thanh toán)';
  wsSummary.getCell(`H${sigSubRow}`).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
  wsSummary.getCell(`H${sigSubRow}`).alignment = { horizontal: 'center' };


  // ---------------------------------------------------------------------------
  // SHEET 2: CHI TIẾT 100% GIAO DỊCH CMS (132 GIAO DỊCH TỪ TRƯỚC TỚI NAY)
  // ---------------------------------------------------------------------------
  const wsDetail = workbook.addWorksheet('2. CHI_TIET_132_GIAO_DICH', {
    properties: { tabColor: { argb: 'FF065F46' } },
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  });
  wsDetail.views = [{ showGridLines: true }];

  wsDetail.columns = [
    { key: 'stt', width: 7 },          // A
    { key: 'id', width: 20 },          // B Mã phiếu
    { key: 'date', width: 14 },        // C Ngày
    { key: 'time', width: 10 },        // D Giờ
    { key: 'supervisor', width: 32 },  // E Giám sát ghi nhận
    { key: 'staff', width: 24 },       // F Nhân sự thụ hưởng
    { key: 'role', width: 14 },        // G Vị trí
    { key: 'room', width: 18 },        // H Bàn / Phòng
    { key: 'product', width: 28 },     // I Món / Hạng mục
    { key: 'qty', width: 10 },         // J Số lượng
    { key: 'unitPrice', width: 16 },   // K Đơn giá
    { key: 'foodAmt', width: 22 },     // L Doanh số đồ ăn
    { key: 'percent', width: 12 },     // M % Bill
    { key: 'reward', width: 22 },      // N Tiền CMS
    { key: 'note', width: 45 },        // O Ghi chú
    { key: 'dishSummary', width: 50 }, // P Bóc tách món ăn bill scan
  ];

  // Header Title Block
  wsDetail.mergeCells('A1:P1');
  wsDetail.getCell('A1').value = 'MÂY RESTAURANT - SỔ NHẬT KÝ CHI TIẾT 100% GIAO DỊCH HOA HỒNG CMS';
  wsDetail.getCell('A1').font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: COLOR_NAVY_DARK } };
  wsDetail.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' };
  wsDetail.getRow(1).height = 26;

  wsDetail.mergeCells('A2:P2');
  wsDetail.getCell('A2').value = `Toàn bộ ${rawList.length} giao dịch được ghi nhận trên hệ thống webapp từ 10/10/2026 đến 07/11/2026 | Sắp xếp theo thứ tự mới nhất`;
  wsDetail.getCell('A2').font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FF64748B' } };
  wsDetail.getCell('A2').alignment = { vertical: 'middle', horizontal: 'left' };
  wsDetail.getRow(2).height = 20;

  const detailHeaders = [
    'STT',
    'MÃ PHIẾU CMS',
    'NGÀY',
    'GIỜ',
    'GIÁM SÁT CHỊU TRÁCH NHIỆM',
    'NHÂN SỰ THỤ HƯỞNG',
    'BỘ PHẬN',
    'BÀN / PHÒNG',
    'MÓN / HẠNG MỤC THƯỞNG',
    'SỐ LƯỢNG',
    'ĐỊNH MỨC THƯỞNG',
    'DOANH SỐ ĐỒ ĂN BÓC TÁCH',
    '% BILL',
    'TIỀN THƯỞNG CMS',
    'GHI CHÚ GIÁM SÁT',
    'CHI TIẾT MÓN ĂN BÓC TÁCH TỪ BILL'
  ];

  const headerRowDetail = wsDetail.getRow(4);
  headerRowDetail.height = 30;
  detailHeaders.forEach((text, idx) => {
    const cell = headerRowDetail.getCell(idx + 1);
    cell.value = text;
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: COLOR_WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_EMERALD } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = thinBorder;
  });

  let dRowIdx = 5;
  sortedByDateDesc.forEach((c, idx) => {
    const row = wsDetail.getRow(dRowIdx);
    row.height = 24;
    const isZebra = idx % 2 === 1;
    const bgColor = isZebra ? COLOR_ZEBRA : COLOR_WHITE;

    const sName = (c.staffName || '').trim();
    const staffInfo = STAFF_ROLES_MAP[sName] || { role: 'Nhân viên' };

    row.getCell(1).value = idx + 1;
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    row.getCell(2).value = c.id;
    row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(2).font = { name: 'Segoe UI', size: 9, color: { argb: 'FF64748B' } };

    row.getCell(3).value = c.date;
    row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };

    row.getCell(4).value = c.time || '';
    row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };

    row.getCell(5).value = c.createdByName || c.createdById || '';
    row.getCell(5).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(5).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF1E40AF' } };

    row.getCell(6).value = c.staffName;
    row.getCell(6).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: COLOR_NAVY_DARK } };
    row.getCell(6).alignment = { horizontal: 'left', vertical: 'middle' };

    row.getCell(7).value = staffInfo.role;
    row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };

    row.getCell(8).value = c.tableOrRoom || 'Chung';
    row.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };

    row.getCell(9).value = c.productName || 'CMS';
    row.getCell(9).alignment = { horizontal: 'left', vertical: 'middle' };

    row.getCell(10).value = c.quantity || 1;
    row.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(10).numFmt = '#,##0';

    row.getCell(11).value = c.unitPriceOrReward || 0;
    row.getCell(11).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(11).numFmt = '#,##0 "đ"';

    row.getCell(12).value = c.billFoodAmount || 0;
    row.getCell(12).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(12).numFmt = '#,##0 "đ"';

    row.getCell(13).value = c.billPercent ? `${c.billPercent}%` : '';
    row.getCell(13).alignment = { horizontal: 'center', vertical: 'middle' };

    row.getCell(14).value = c.totalReward || 0;
    row.getCell(14).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(14).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: COLOR_GOLD } };
    row.getCell(14).numFmt = '#,##0 "đ"';

    row.getCell(15).value = c.note || '';
    row.getCell(15).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(15).font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF475569' } };

    row.getCell(16).value = c.billItemsSummary || '';
    row.getCell(16).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(16).font = { name: 'Segoe UI', size: 8.5, color: { argb: 'FF334155' } };

    for (let col = 1; col <= 16; col++) {
      const cell = row.getCell(col);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      cell.border = thinBorder;
      if (!cell.font) cell.font = { name: 'Segoe UI', size: 9.5 };
    }

    dRowIdx++;
  });

  // Total Row in Detail
  const totalRowDetail = wsDetail.getRow(dRowIdx);
  totalRowDetail.height = 30;
  totalRowDetail.getCell(1).value = '';
  totalRowDetail.getCell(2).value = '';
  totalRowDetail.getCell(3).value = '';
  totalRowDetail.getCell(4).value = '';
  totalRowDetail.getCell(5).value = '';
  totalRowDetail.getCell(6).value = `TỔNG CỘNG (${rawList.length} PHIẾU THƯỞNG)`;
  totalRowDetail.getCell(6).font = { name: 'Segoe UI', size: 10.5, bold: true, color: { argb: COLOR_NAVY_DARK } };
  totalRowDetail.getCell(6).alignment = { horizontal: 'left', vertical: 'middle' };

  totalRowDetail.getCell(10).value = { formula: `SUM(J5:J${dRowIdx - 1})` };
  totalRowDetail.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };
  totalRowDetail.getCell(10).numFmt = '#,##0';
  totalRowDetail.getCell(10).font = { name: 'Segoe UI', size: 10, bold: true };

  totalRowDetail.getCell(12).value = { formula: `SUM(L5:L${dRowIdx - 1})` };
  totalRowDetail.getCell(12).alignment = { horizontal: 'right', vertical: 'middle' };
  totalRowDetail.getCell(12).numFmt = '#,##0 "đ"';
  totalRowDetail.getCell(12).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: COLOR_EMERALD } };

  totalRowDetail.getCell(14).value = { formula: `SUM(N5:N${dRowIdx - 1})` };
  totalRowDetail.getCell(14).alignment = { horizontal: 'right', vertical: 'middle' };
  totalRowDetail.getCell(14).numFmt = '#,##0 "đ"';
  totalRowDetail.getCell(14).font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: COLOR_GOLD } };

  for (let c = 1; c <= 16; c++) {
    const cell = totalRowDetail.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TOTAL_BG } };
    cell.border = totalTopBottomBorder;
  }

  // ---------------------------------------------------------------------------
  // SHEET 3: THEO NGÀY CHỐT CA (Thu Ngân & Giám Sát Đối Soát Hàng Ngày)
  // ---------------------------------------------------------------------------
  const wsByDate = workbook.addWorksheet('3. DOI_SOAT_THEO_NGAY', {
    properties: { tabColor: { argb: 'FF2563EB' } },
    pageSetup: { orientation: 'portrait', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  });
  wsByDate.views = [{ showGridLines: true }];

  wsByDate.columns = [
    { key: 'stt', width: 7 },
    { key: 'date', width: 15 },
    { key: 'dayOfWeek', width: 14 },
    { key: 'policy', width: 22 },
    { key: 'count', width: 14 },
    { key: 'staffCount', width: 16 },
    { key: 'food', width: 25 },
    { key: 'reward', width: 25 },
    { key: 'supervisors', width: 36 }
  ];

  wsByDate.mergeCells('A1:I1');
  wsByDate.getCell('A1').value = 'MÂY RESTAURANT - BẢNG ĐỐI SOÁT HOA HỒNG CMS THEO TỪNG NGÀY';
  wsByDate.getCell('A1').font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: COLOR_NAVY_DARK } };
  wsByDate.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' };
  wsByDate.getRow(1).height = 26;

  wsByDate.mergeCells('A2:I2');
  wsByDate.getCell('A2').value = `Phục vụ Thu Ngân đối chiếu doanh số & chốt sổ ca trực mỗi ngày (${dateSummaryList.length} ngày phát sinh CMS)`;
  wsByDate.getCell('A2').font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FF64748B' } };
  wsByDate.getCell('A2').alignment = { vertical: 'middle', horizontal: 'left' };
  wsByDate.getRow(2).height = 20;

  const dateHeaders = [
    'STT',
    'NGÀY GIAO DỊCH',
    'THỨ',
    'CHÍNH SÁCH % BILL',
    'SỐ PHIẾU',
    'SỐ NV HƯỞNG',
    'DOANH SỐ ĐỒ ĂN (VNĐ)',
    'TỔNG TIỀN CMS (VNĐ)',
    'GIÁM SÁT THỰC HIỆN'
  ];

  const headerRowDate = wsByDate.getRow(4);
  headerRowDate.height = 30;
  dateHeaders.forEach((text, idx) => {
    const cell = headerRowDate.getCell(idx + 1);
    cell.value = text;
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: COLOR_WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }; // Blue-900
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = thinBorder;
  });

  const getDayName = (dateStr) => {
    try {
      const d = new Date(dateStr);
      const day = d.getDay();
      const names = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      return names[day] || '';
    } catch (e) {
      return '';
    }
  };

  const getDayPolicy = (dateStr) => {
    try {
      const d = new Date(dateStr);
      const day = d.getDay();
      if (day >= 1 && day <= 4) return '2% Bill (Thứ 2 - Thứ 5)';
      return '1% Bill (Thứ 6 - CN)';
    } catch (e) {
      return '';
    }
  };

  let dateRowIdx = 5;
  dateSummaryList.forEach((item, idx) => {
    const row = wsByDate.getRow(dateRowIdx);
    row.height = 24;
    const isZebra = idx % 2 === 1;
    const bgColor = isZebra ? COLOR_ZEBRA : COLOR_WHITE;

    row.getCell(1).value = idx + 1;
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    row.getCell(2).value = item.date;
    row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(2).font = { name: 'Segoe UI', size: 10, bold: true };

    row.getCell(3).value = getDayName(item.date);
    row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };

    row.getCell(4).value = getDayPolicy(item.date);
    row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(4).font = { name: 'Segoe UI', size: 9, color: { argb: 'FF475569' } };

    row.getCell(5).value = item.count;
    row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(5).numFmt = '#,##0';

    row.getCell(6).value = item.staffs.size;
    row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(6).numFmt = '#,##0';

    row.getCell(7).value = item.food;
    row.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(7).numFmt = '#,##0 "đ"';

    row.getCell(8).value = item.reward;
    row.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(8).font = { name: 'Segoe UI', size: 10.5, bold: true, color: { argb: COLOR_GOLD } };
    row.getCell(8).numFmt = '#,##0 "đ"';

    row.getCell(9).value = Array.from(item.supervisors).join(', ');
    row.getCell(9).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(9).font = { name: 'Segoe UI', size: 9 };

    for (let c = 1; c <= 9; c++) {
      const cell = row.getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      cell.border = thinBorder;
      if (!cell.font) cell.font = { name: 'Segoe UI', size: 9.5 };
    }

    dateRowIdx++;
  });

  // Total Row in Date Sheet
  const totalRowDate = wsByDate.getRow(dateRowIdx);
  totalRowDate.height = 30;
  totalRowDate.getCell(1).value = '';
  totalRowDate.getCell(2).value = `TỔNG CỘNG (${dateSummaryList.length} NGÀY)`;
  totalRowDate.getCell(2).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: COLOR_NAVY_DARK } };
  totalRowDate.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };

  totalRowDate.getCell(5).value = { formula: `SUM(E5:E${dateRowIdx - 1})` };
  totalRowDate.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
  totalRowDate.getCell(5).numFmt = '#,##0';
  totalRowDate.getCell(5).font = { name: 'Segoe UI', size: 10, bold: true };

  totalRowDate.getCell(7).value = { formula: `SUM(G5:G${dateRowIdx - 1})` };
  totalRowDate.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
  totalRowDate.getCell(7).numFmt = '#,##0 "đ"';
  totalRowDate.getCell(7).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: COLOR_EMERALD } };

  totalRowDate.getCell(8).value = { formula: `SUM(H5:H${dateRowIdx - 1})` };
  totalRowDate.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
  totalRowDate.getCell(8).numFmt = '#,##0 "đ"';
  totalRowDate.getCell(8).font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: COLOR_GOLD } };

  for (let c = 1; c <= 9; c++) {
    const cell = totalRowDate.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TOTAL_BG } };
    cell.border = totalTopBottomBorder;
  }

  // ---------------------------------------------------------------------------
  // SHEET 4: THEO GIÁM SÁT (Trách Nhiệm Nhập Liệu Của Giám Sát Ca)
  // ---------------------------------------------------------------------------
  const wsSupervisor = workbook.addWorksheet('4. THEO_GIAM_SAT', {
    properties: { tabColor: { argb: 'FF7C3AED' } },
    pageSetup: { orientation: 'portrait', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  });
  wsSupervisor.views = [{ showGridLines: true }];

  wsSupervisor.columns = [
    { key: 'stt', width: 7 },
    { key: 'name', width: 36 },
    { key: 'count', width: 16 },
    { key: 'staffs', width: 18 },
    { key: 'food', width: 25 },
    { key: 'reward', width: 25 },
    { key: 'ratio', width: 16 }
  ];

  wsSupervisor.mergeCells('A1:G1');
  wsSupervisor.getCell('A1').value = 'MÂY RESTAURANT - BÁO CÁO TRÁCH NHIỆM GIÁM SÁT NHẬP CMS';
  wsSupervisor.getCell('A1').font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: COLOR_NAVY_DARK } };
  wsSupervisor.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' };
  wsSupervisor.getRow(1).height = 26;

  wsSupervisor.mergeCells('A2:G2');
  wsSupervisor.getCell('A2').value = 'Thống kê minh bạch: Giám sát chịu trách nhiệm tính chính xác của các hóa đơn và số tiền thưởng đã duyệt';
  wsSupervisor.getCell('A2').font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FF64748B' } };
  wsSupervisor.getCell('A2').alignment = { vertical: 'middle', horizontal: 'left' };
  wsSupervisor.getRow(2).height = 20;

  const supHeaders = [
    'STT',
    'HỌ VÀ TÊN GIÁM SÁT',
    'SỐ PHIẾU GHI NHẬN',
    'SỐ NV ĐƯỢC CHẤM',
    'DOANH SỐ ĐỒ ĂN XÁC NHẬN',
    'TỔNG TIỀN CMS ĐÃ DUYỆT',
    'TỶ TRỌNG (%)'
  ];

  const headerRowSup = wsSupervisor.getRow(4);
  headerRowSup.height = 30;
  supHeaders.forEach((text, idx) => {
    const cell = headerRowSup.getCell(idx + 1);
    cell.value = text;
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: COLOR_WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B21B6' } }; // Purple-900
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = thinBorder;
  });

  let supRowIdx = 5;
  supervisorSummaryList.forEach((sup, idx) => {
    const row = wsSupervisor.getRow(supRowIdx);
    row.height = 25;
    const isZebra = idx % 2 === 1;
    const bgColor = isZebra ? COLOR_ZEBRA : COLOR_WHITE;

    row.getCell(1).value = idx + 1;
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    row.getCell(2).value = sup.name;
    row.getCell(2).font = { name: 'Segoe UI', size: 10.5, bold: true, color: { argb: COLOR_NAVY_DARK } };
    row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };

    row.getCell(3).value = sup.count;
    row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(3).numFmt = '#,##0';

    row.getCell(4).value = sup.staffs.size;
    row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(4).numFmt = '#,##0';

    row.getCell(5).value = sup.food;
    row.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(5).numFmt = '#,##0 "đ"';

    row.getCell(6).value = sup.reward;
    row.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(6).font = { name: 'Segoe UI', size: 10.5, bold: true, color: { argb: COLOR_GOLD } };
    row.getCell(6).numFmt = '#,##0 "đ"';

    const ratio = totalRewardAll > 0 ? (sup.reward / totalRewardAll) : 0;
    row.getCell(7).value = ratio;
    row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(7).numFmt = '0.0%';

    for (let c = 1; c <= 7; c++) {
      const cell = row.getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      cell.border = thinBorder;
      if (!cell.font) cell.font = { name: 'Segoe UI', size: 9.5 };
    }

    supRowIdx++;
  });

  // Total Row in Supervisor Sheet
  const totalRowSup = wsSupervisor.getRow(supRowIdx);
  totalRowSup.height = 30;
  totalRowSup.getCell(1).value = '';
  totalRowSup.getCell(2).value = 'TỔNG CỘNG';
  totalRowSup.getCell(2).font = { name: 'Segoe UI', size: 10.5, bold: true, color: { argb: COLOR_NAVY_DARK } };
  totalRowSup.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };

  totalRowSup.getCell(3).value = { formula: `SUM(C5:C${supRowIdx - 1})` };
  totalRowSup.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
  totalRowSup.getCell(3).numFmt = '#,##0';
  totalRowSup.getCell(3).font = { name: 'Segoe UI', size: 10, bold: true };

  totalRowSup.getCell(5).value = { formula: `SUM(E5:E${supRowIdx - 1})` };
  totalRowSup.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
  totalRowSup.getCell(5).numFmt = '#,##0 "đ"';
  totalRowSup.getCell(5).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: COLOR_EMERALD } };

  totalRowSup.getCell(6).value = { formula: `SUM(F5:F${supRowIdx - 1})` };
  totalRowSup.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
  totalRowSup.getCell(6).numFmt = '#,##0 "đ"';
  totalRowSup.getCell(6).font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: COLOR_GOLD } };

  totalRowSup.getCell(7).value = 1.0;
  totalRowSup.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
  totalRowSup.getCell(7).numFmt = '100.0%';
  totalRowSup.getCell(7).font = { name: 'Segoe UI', size: 10, bold: true };

  for (let c = 1; c <= 7; c++) {
    const cell = totalRowSup.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TOTAL_BG } };
    cell.border = totalTopBottomBorder;
  }

  // File Paths to save
  const fileName = 'BANG_DUYET_CHI_HOA_HONG_CMS_MAY_RESTAURANT.xlsx';
  const targetDir1 = path.resolve(__dirname, '..');
  const targetPath1 = path.join(targetDir1, fileName);

  const targetDir2 = path.resolve('C:\\Users\\COHOTECH\\.gemini\\antigravity\\brain\\212d9d96-b2e2-45bd-afad-fc5d6bf2587b');
  const targetPath2 = path.join(targetDir2, fileName);

  const targetDir3 = path.resolve(__dirname, '..', 'public');
  const targetPath3 = path.join(targetDir3, fileName);

  console.log('3. Đang ghi workbook ra các đường dẫn file Excel...');
  await workbook.xlsx.writeFile(targetPath1);
  console.log(`=> Đã lưu thành công tại: ${targetPath1}`);

  try {
    await workbook.xlsx.writeFile(targetPath2);
    console.log(`=> Đã lưu thành công bản sao tại: ${targetPath2}`);
  } catch (err) {
    console.warn('Không thể ghi file vào brain dir:', err.message);
  }

  try {
    if (!fs.existsSync(targetDir3)) fs.mkdirSync(targetDir3, { recursive: true });
    await workbook.xlsx.writeFile(targetPath3);
    console.log(`=> Đã lưu thành công bản sao tại web public: ${targetPath3}`);
  } catch (err) {
    console.warn('Không thể ghi file vào public dir:', err.message);
  }

  console.log('HOÀN TẤT XUẤT FILE EXCEL CMS 100%!');
}

main().catch(err => {
  console.error('Lỗi thực thi:', err);
  process.exit(1);
});
