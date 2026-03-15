export const autoCategorize = (description, categoryName, categoryList) => {
  const t = ((description || "") + " " + (categoryName || "")).toLowerCase();
  let matchedName = "อื่นๆ";
  if (t.match(/เงินเดือน|salary/)) matchedName = "เงินเดือน";
  else if (t.match(/โบนัส|รายรับพิเศษ|ขายของ/)) matchedName = "รายรับพิเศษ/โบนัส";
  else if (t.match(/หุ้น|nvda|xom|ko|qqq|webull|ออมทอง|กองทุน|ลงทุน/)) matchedName = "การลงทุนและออมเงิน";
  else if (t.match(/ค่าเช่า|ค่าหอ|หอพัก|อพาร์ทเม้นท์|คอนโด|ห้องพัก/)) matchedName = "ค่าเช่า/ค่าหอพัก";
  else if (t.match(/คอม|computer|ผ่อน|mainboard|psu|ram|ryzen|cpu|case|ssd|usb|การ์ดจอ|keyboard|เมาส์|ไมค์|maono|สายรัด|จอ|ไอแพด|ipad/)) matchedName = "อุปกรณ์ไอที/คอมพิวเตอร์";
  else if (t.match(/gemini|vip|subscription|netflix|youtube|spotify|yt premium|รายเดือน|สมาชิก/)) matchedName = "บริการรายเดือน";
  else if (t.match(/max value|maxvalue|lotus|big c|tops|makro|ซุปเปอร์|ห้าง|เซเว่น|7-11|ดองกิ/)) matchedName = "ซุปเปอร์มาร์เก็ต/ห้าง";
  else if (t.match(/shopee|lazada|ออนไลน์|สั่งของ|tiktok shop/)) matchedName = "ช้อปปิ้งออนไลน์";
  else if (t.match(/ตัดผม|ยา|คลินิก|สุขภาพ|ความงาม|หาหมอ|โรงพยาบาล|ขูดหินปูน|ป่วย/)) matchedName = "สุขภาพและความงาม";
  else if (t.match(/น้ำมัน|ทางด่วน|รถ|bts|mrt|เดินทาง|taxi|grab|วิน|จอดรถ|สะพานใหม่|มีนบุรี|รังสิต|ทองหล่อ|commart/)) matchedName = "การเดินทาง";
  else if (t.match(/หนัง|gundam|เกม|ของเล่น|บันเทิง|ดูหนัง|คอนเสิร์ต|imax|เบสบอล|pool|discord/)) matchedName = "บันเทิงและสันทนาการ";
  else if (t.match(/ซักผ้า|ผงซักฟอก/)) matchedName = 'ที่อยู่อาศัยและของใช้';
  else if (t.match(/ของใช้/)) matchedName = 'ที่อยู่อาศัยและของใช้';
  else if (t.match(/ข้าว|เที่ยง|เย็น|หุง|ผลไม้|ขนม|ทำอาหาร|cook/)) matchedName = 'อาหารและเครื่องดื่ม';
  else if (t.match(/ข้าว|อาหาร|ขนม|ผลไม้|lunch|dinner|cook|เครื่องดื่ม|ชา|กาแฟ|ot/)) matchedName = "อาหารและเครื่องดื่ม";
  else if (t.match(/พ่อ|แม่|ลูก|ครอบครัว|ให้เงิน|หมา|แมว|สัตว์เลี้ยง/)) matchedName = "ครอบครัวและสัตว์เลี้ยง";
  
  const exists = categoryList.find(c => c.name === matchedName);
  return exists ? exists.name : (categoryList.filter(c=>c.type==='expense')[0]?.name || "อื่นๆ");
};

export const parseCSV = (text) => {
  let rows = [], row = [], current = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
      let char = text[i], nextChar = text[i + 1];
      if (char === '"') {
          if (inQuotes && nextChar === '"') { current += '"'; i++; } else { inQuotes = !inQuotes; }
      } else if (char === ',' && !inQuotes) {
          row.push(current); current = '';
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
          if (char === '\r' && nextChar === '\n') i++;
          row.push(current);
          if (row.some(c => c.trim() !== '')) rows.push(row);
          row = []; current = '';
      } else { current += char; }
  }
  if (current !== '' || row.length > 0) {
      row.push(current);
      if (row.some(c => c.trim() !== '')) rows.push(row);
  }
  return rows.map(r => r.map(c => c.trim()));
};

export const cleanNumber = (val) => {
  if (!val) return 0;
  let cleaned = val.replace(/[฿\s,"]/g, '');
  if (cleaned === '-' || cleaned === '') return 0;
  return parseFloat(cleaned) || 0;
};
