import React, { useEffect, useRef, useState } from 'react';
import { Check, Pencil, StickyNote } from 'lucide-react';
import CategoryGlyph from '@/components/shared/CategoryGlyph';
import FieldError from '@/components/shared/FieldError';
import IconPicker from '@/components/shared/IconPicker';
import { DEFAULT_NOTE_ICON } from '@/constants/categoryIcons';
import { tc } from '@/constants/theme';
import type { DayNote } from '@/types';

const MAX_LENGTH = 200; // เท่ากับ calendarDaySchema ฝั่ง backend

export interface DayNoteFieldProps {
  dateStr: string;
  /** โน้ตที่บันทึกไว้ (text '' = ไม่มี) */
  note: DayNote;
  /** ไม่ส่งมา = ดูอย่างเดียว: โชว์โน้ตที่มี แต่ไม่มีปุ่มเพิ่ม/แก้ */
  onSave?: (dateStr: string, text: string, icon: string) => Promise<boolean>;
}

/**
 * โน้ตประจำวัน (วันเกิด, วันแรกทำงาน ...) มี 2 สถานะสลับกันได้:
 *  - ปิด: ชิป (ไอคอน + ข้อความ + ดินสอ) หน้าตาเดียวกับในปฏิทินและอ่านข้อมูลชุดเดียวกัน — เห็นทันทีว่าบันทึกแล้วและขึ้นแบบไหน
 *    (ยังไม่มีโน้ต = ปุ่มจาง "+ โน้ต")
 *  - เปิด: ปุ่มไอคอน + ช่องพิมพ์ + ปุ่ม ✓ — Enter / ✓ / คลิกออก = บันทึกแล้วหุบกลับเป็นชิป · Esc = ยกเลิกแล้วหุบ ·
 *    ล้างข้อความแล้วบันทึก = ลบโน้ต · บันทึกพลาด = ไม่หุบ แสดง error ใต้ช่อง
 * ช่องพิมพ์เป็น uncontrolled: บันทึกพลาดแล้วข้อความที่พิมพ์ยังอยู่ ไม่ต้องพิมพ์ใหม่
 */
export default function DayNoteField({ dateStr, note, onSave }: DayNoteFieldProps) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // ไอคอนที่เลือกแล้วแต่ยังไม่ได้บันทึก (เลือกก่อนมีข้อความ หรือบันทึกพลาด) — ไอคอนอย่างเดียวไม่นับเป็นโน้ต
  const [pickedIcon, setPickedIcon] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const input = inputRef.current;
    if (editing && input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }, [editing]);

  const icon = pickedIcon ?? note.icon;
  const glyph = <CategoryGlyph icon={icon || DEFAULT_NOTE_ICON} size={14} className="shrink-0 text-ink-soft" />;

  if (!onSave) {
    return note.text ? (
      <div className="w-full flex items-center gap-1.5 text-[11px] text-ink-body">
        {glyph}
        <span>{note.text}</span>
      </div>
    ) : null;
  }

  if (!editing && !note.text) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        title="เพิ่มโน้ตประจำวัน เช่น วันเกิด วันแรกทำงาน"
        className="flex items-center gap-1 px-2 py-0.5 rounded-pill border border-transparent text-[11px] font-medium text-ink-muted hover:text-ink-display hover:border-line-strong cursor-pointer"
      >
        <StickyNote className="w-3 h-3" aria-hidden="true" />
        <span>+ โน้ต</span>
      </button>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        title="คลิกเพื่อแก้ไขโน้ต — ในปฏิทินแสดงแบบนี้"
        aria-label={`แก้ไขโน้ต: ${note.text}`}
        className="group flex items-center gap-1.5 min-w-0 max-w-[320px] px-2 py-0.5 rounded-pill border border-line-strong bg-surface text-[11px] font-medium text-ink-body hover:text-ink-display hover:border-accent-ink cursor-pointer"
      >
        {glyph}
        <span className="truncate">{note.text}</span>
        <Pencil className="w-3 h-3 shrink-0 text-ink-muted group-hover:text-ink-display" aria-hidden="true" />
      </button>
    );
  }

  const save = async (text: string, nextIcon: string): Promise<boolean> => {
    setError(null);
    const ok = await onSave(dateStr, text, nextIcon);
    if (ok) {
      setPickedIcon(null);
      if (inputRef.current) inputRef.current.value = text;
    } else {
      setPickedIcon(nextIcon); // จำไอคอนที่เลือกไว้ด้วย ไม่งั้น Enter ลองใหม่จะไม่ส่งซ้ำ
      setError('บันทึกโน้ตไม่สำเร็จ แก้แล้วกด Enter เพื่อลองอีกครั้ง');
    }
    return ok;
  };

  // keepOpen: โฟกัสแค่ย้ายไปปุ่มไอคอน/✓ ในช่องเดียวกัน — ห้ามหุบช่อง ไม่งั้นตัวเลือกไอคอนหายก่อนได้เลือก
  const commit = async (input: HTMLInputElement, keepOpen: boolean) => {
    const text = input.value.trim();
    setError(null);
    // ไม่มีอะไรต้องบันทึก: ยังไม่มีโน้ตและไม่ได้พิมพ์ (ไอคอนอย่างเดียวไม่นับ) หรือค่าเท่าเดิม
    if ((!text && !note.text) || (text === note.text && icon === note.icon)) {
      if (!keepOpen) {
        setPickedIcon(null);
        setEditing(false);
      }
      return;
    }
    if ((await save(text, icon)) && !keepOpen) setEditing(false);
  };

  const handlePick = (key: string) => {
    const text = inputRef.current?.value.trim() ?? '';
    if (!text) {
      setPickedIcon(key); // ยังไม่มีข้อความ: จำไว้ก่อน ใช้ตอนบันทึกโน้ต
      return;
    }
    void save(text, key);
  };

  const handleDone = () => {
    const input = inputRef.current;
    if (!input) return;
    if (document.activeElement === input) input.blur(); // บันทึกผ่าน onBlur ทางเดียว
    else void commit(input, false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      // Esc ปิดช่องแก้ไขก่อน ไม่ปิดโมดัล (โมดัลปิดด้วย Esc ที่ window) — กดอีกครั้งจึงปิดโมดัล
      e.stopPropagation(); // the input unmounts; it reopens on note.text (defaultValue)
      setError(null);
      setPickedIcon(null);
      setEditing(false);
    }
  };

  return (
    <div ref={wrapRef} className="w-full min-w-[320px] max-w-[460px]">
      <div className="flex items-center gap-1.5">
        <IconPicker icon={icon || DEFAULT_NOTE_ICON} color={tc('ink-soft')} onChange={handlePick} />
        <input
          ref={inputRef}
          type="text"
          defaultValue={note.text}
          maxLength={MAX_LENGTH}
          placeholder="โน้ตประจำวัน เช่น วันเกิด, วันแรกทำงาน"
          aria-label="โน้ตประจำวัน"
          aria-invalid={!!error}
          aria-describedby={error ? 'day-note-err' : undefined}
          onBlur={e => void commit(e.currentTarget, !!wrapRef.current?.contains(e.relatedTarget as Node | null))}
          onKeyDown={handleKeyDown}
          className={`h-8 flex-1 min-w-0 px-2.5 rounded-sm border outline-none focus:ring-1 text-sm font-medium ${
            error ? 'bg-canvas tint-danger text-ink-display focus:ring-danger/30' : 'bg-canvas border-line-strong text-white focus:border-accent-ink focus:ring-accent/30'
          }`}
        />
        {/* mousedown ไม่ย้ายโฟกัสออกจากช่องพิมพ์ → คลิก ✓ บันทึกผ่านทางเดียวกับ Enter */}
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={handleDone}
          title="เสร็จ — บันทึกแล้วหุบเป็นชิป (Enter)"
          aria-label="เสร็จ บันทึกโน้ตและหุบช่องแก้ไข"
          className="w-8 h-8 shrink-0 flex items-center justify-center rounded-sm border border-line-strong bg-surface text-ink-soft hover:border-accent-ink hover:text-ink-display cursor-pointer"
        >
          <Check className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
      <FieldError id="day-note-err" message={error} />
    </div>
  );
}
