import React, { useRef, useState } from 'react';
import { contactDetails } from '../data/contact.js';
import './print-quote.css';

const materials = [
  { id: 'PLA', note: 'اختيار عملي لمعظم المجسمات' },
  { id: 'PETG', note: 'مرن ومناسب للاستخدام اليومي' },
  { id: 'ABS', note: 'متين ويتحمّل الحرارة' },
  { id: 'Resin', note: 'تفاصيل دقيقة وتشطيب ناعم' },
];

const colors = [
  { name: 'فحمي', value: '#343b2d' },
  { name: 'زيتوني', value: '#64754a' },
  { name: 'ليموني', value: '#d5ed85' },
  { name: 'عاجي', value: '#f4f3eb' },
  { name: 'رملي', value: '#b7a988' },
];

const layers = ['0.1', '0.2', '0.3'];
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ['stl', 'obj', '3mf'];

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + ' كيلوبايت';
  return (bytes / (1024 * 1024)).toFixed(1) + ' ميجابايت';
}

export default function PrintQuote() {
  const [material, setMaterial] = useState('PLA');
  const [color, setColor] = useState(colors[1]);
  const [infill, setInfill] = useState(20);
  const [layer, setLayer] = useState('0.2');
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [draggingFile, setDraggingFile] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [rotation, setRotation] = useState(0);
  const fileInput = useRef(null);
  const dragStart = useRef(null);

  function chooseFile(candidate) {
    if (!candidate) return;
    setSubmitted(false);
    const extension = candidate.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      setFile(null);
      setFileError('اختار ملف STL أو OBJ أو 3MF.');
      return;
    }
    if (candidate.size > MAX_FILE_SIZE) {
      setFile(null);
      setFileError('حجم الملف لازم يكون 50 ميجابايت أو أقل.');
      return;
    }
    setFile(candidate);
    setFileError('');
    setSubmitted(false);
  }

  function handleFileChange(event) {
    chooseFile(event.currentTarget.files?.[0]);
    event.currentTarget.value = '';
  }

  function startRotation(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    dragStart.current = { x: event.clientX, rotation };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function rotateModel(event) {
    if (!dragStart.current) return;
    setRotation(dragStart.current.rotation + (event.clientX - dragStart.current.x) * 0.45);
  }

  function finishRotation() {
    dragStart.current = null;
  }

  function submitQuote(event) {
    event.preventDefault();
    if (!file) {
      setFileError('ارفع ملف المجسم الأول عشان نراجع طلب التسعير.');
      fileInput.current?.focus();
      return;
    }

    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') || '').trim();
    const phone = String(form.get('phone') || '').trim();
    const notes = String(form.get('notes') || '').trim();
    const message = [
      'طلب تسعير طباعة ثلاثية الأبعاد من موقع Scene',
      'الاسم: ' + name,
      'رقم الموبايل: ' + phone,
      'الخامة: ' + material,
      'اللون: ' + color.name,
      'نسبة الحشو: ' + infill + '%',
      'دقة الطبقة: ' + layer + ' مم',
      'الملف: ' + file.name + ' (' + formatFileSize(file.size) + ')',
      notes ? 'ملاحظات: ' + notes : '',
      'سأرفق ملف المجسم في المحادثة بعد فتح واتساب.',
    ].filter(Boolean).join('\n');

    const whatsapp = contactDetails.whatsapp.replace(/[^0-9]/g, '');
    if (whatsapp) {
      const url = 'https://wa.me/' + whatsapp + '?text=' + encodeURIComponent(message);
      const opened = window.open(url, '_blank');
      if (opened) opened.opener = null;
      if (!opened) window.location.assign(url);
      setSubmitted(true);
      return;
    }

    const subject = encodeURIComponent('طلب تسعير طباعة ثلاثية الأبعاد');
    window.location.href = 'mailto:' + contactDetails.email + '?subject=' + subject + '&body=' + encodeURIComponent(message);
    setSubmitted(true);
  }

  return (
    <section className="print-quote-section" id="print-request" aria-labelledby="print-quote-title">
      <div className="print-quote-inner">
        <div className="print-quote-meta">
          <span><i aria-hidden="true" /> مساحة لطباعة فكرتك</span>
          <span dir="ltr">س / من الملف للمجسم</span>
        </div>

        <header className="print-quote-heading">
          <div>
            <span className="print-quote-kicker">استوديو الطباعة</span>
            <h2 id="print-quote-title">ملفك، خامتك،<br /><span>ومجسمك على مزاجك.</span></h2>
          </div>
          <p>ارفع ملف التصميم واختار تفاصيل الطباعة. هنراجع المجسم ونبعتلك الوزن والسعر قبل التنفيذ.</p>
        </header>

        <form className="print-quote-form" onSubmit={submitQuote} onInput={() => setSubmitted(false)}>
          <div className="print-quote-grid">
            <aside className="print-quote-options">
              <article className="print-quote-card print-options-card">
                <div className="print-quote-card-heading">
                  <span>01 / التخصيص</span>
                  <h3>اختيارات الطباعة</h3>
                </div>

                <fieldset className="print-setting">
                  <legend>اختار الخامة</legend>
                  <div className="print-materials">
                    {materials.map((item) => (
                      <button
                        className="print-choice"
                        key={item.id}
                        type="button"
                        aria-pressed={material === item.id}
                        onClick={() => { setMaterial(item.id); setSubmitted(false); }}
                      >
                        <strong>{item.id}</strong>
                      </button>
                    ))}
                  </div>
                  <p className="print-setting-note">{materials.find((item) => item.id === material)?.note}</p>
                </fieldset>

                <fieldset className="print-setting">
                  <legend>اختار اللون</legend>
                  <div className="print-colors">
                    {colors.map((item) => (
                      <button
                        className="print-color-choice"
                        key={item.name}
                        type="button"
                        aria-label={'لون ' + item.name}
                        aria-pressed={color.name === item.name}
                        onClick={() => { setColor(item); setSubmitted(false); }}
                      >
                        <span className="print-color-swatch" style={{ '--swatch-color': item.value }} />
                        <small>{item.name}</small>
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="print-setting">
                  <div className="print-setting-line">
                    <legend>نسبة الحشو</legend>
                    <strong>{infill}%</strong>
                  </div>
                  <input
                    className="print-infill-range"
                    type="range"
                    min="20"
                    max="100"
                    step="10"
                    value={infill}
                    style={{ '--range-progress': ((infill - 20) / 80) * 100 + '%' }}
                    onChange={(event) => { setInfill(Number(event.target.value)); setSubmitted(false); }}
                    aria-label="نسبة الحشو"
                  />
                  <div className="print-range-labels"><span>أخف · 20%</span><span>أمتن · 100%</span></div>
                </fieldset>

                <fieldset className="print-setting print-layer-setting">
                  <legend>دقة الطبقة (مم)</legend>
                  <div className="print-layer-options">
                    {layers.map((value) => (
                      <button
                        className="print-layer-choice"
                        key={value}
                        type="button"
                        aria-pressed={layer === value}
                        onClick={() => { setLayer(value); setSubmitted(false); }}
                      >
                        {value} مم
                      </button>
                    ))}
                  </div>
                  <p className="print-setting-note">الطبقة الأدق بتظهر تفاصيل أكتر وبتحتاج وقت أطول.</p>
                </fieldset>
              </article>

              <article className="print-quote-estimate" aria-live="polite">
                <div className="print-estimate-label"><i aria-hidden="true" /> تقدير مبدئي</div>
                <div className="print-estimate-value">
                  <span>الوزن التقديري</span>
                  <strong>بعد فحص الملف</strong>
                </div>
                <div className="print-estimate-value">
                  <span>السعر التقديري</span>
                  <strong>بعد مراجعة التفاصيل</strong>
                </div>
                <p>هنأكد الوزن والتكلفة قبل ما نبدأ الطباعة.</p>
              </article>
            </aside>

            <div className="print-quote-workspace">
              <article className="print-quote-card print-preview-card">
                <div className="print-quote-card-heading print-preview-heading">
                  <div><span>02 / المعاينة</span><h3>تخيّل مجسمك من كل زاوية</h3></div>
                  <span className="print-preview-badge"><i aria-hidden="true" /> معاينة استرشادية</span>
                </div>

                <div
                  className="print-model-stage"
                  onPointerDown={startRotation}
                  onPointerMove={rotateModel}
                  onPointerUp={finishRotation}
                  onPointerCancel={finishRotation}
                  role="img"
                  aria-label="معاينة توضيحية لمجسم ثلاثي الأبعاد"
                >
                  <div className="print-model-grid" aria-hidden="true" />
                  <svg
                    className="print-model-art"
                    viewBox="0 0 420 360"
                    aria-hidden="true"
                    style={{ '--model-color': color.value, '--model-rotation': rotation + 'deg' }}
                  >
                    <defs>
                      <filter id="print-model-shadow" x="-35%" y="-35%" width="170%" height="170%">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="7" />
                        <feOffset dy="12" />
                        <feComponentTransfer><feFuncA type="linear" slope="0.28" /></feComponentTransfer>
                        <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                    </defs>
                    <g className="print-model-outline" aria-hidden="true">
                      <ellipse cx="210" cy="177" rx="67" ry="118" transform="rotate(-28 210 177)" />
                      <ellipse cx="210" cy="177" rx="131" ry="58" transform="rotate(-28 210 177)" />
                      <ellipse cx="210" cy="177" rx="67" ry="118" transform="rotate(34 210 177)" />
                    </g>
                    <g className="print-model-loops" filter="url(#print-model-shadow)">
                      <ellipse cx="210" cy="177" rx="67" ry="118" transform="rotate(-28 210 177)" />
                      <ellipse cx="210" cy="177" rx="131" ry="58" transform="rotate(-28 210 177)" />
                      <ellipse cx="210" cy="177" rx="67" ry="118" transform="rotate(34 210 177)" />
                    </g>
                    <g className="print-model-highlights" aria-hidden="true">
                      <path d="M153 74c-26 24-37 63-30 100" />
                      <path d="M113 200c27 28 69 42 106 40" />
                      <path d="M272 86c18 27 24 60 16 91" />
                    </g>
                  </svg>
                  <div className="print-model-axis" aria-hidden="true"><span>Y</span><span>Z</span><span>X</span></div>
                  <span className="print-model-hint">اسحب للتدوير</span>
                  {file && <div className="print-model-file-tag"><span>ملفك جاهز للمراجعة</span><strong dir="ltr">{file.name}</strong></div>}
                </div>

                <label
                  className={'print-file-picker' + (draggingFile ? ' is-dragging' : '') + (file ? ' has-file' : '')}
                  onDragOver={(event) => { event.preventDefault(); setDraggingFile(true); }}
                  onDragLeave={() => setDraggingFile(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDraggingFile(false);
                    chooseFile(event.dataTransfer.files?.[0]);
                  }}
                >
                  <input
                    ref={fileInput}
                    type="file"
                    accept=".stl,.obj,.3mf,model/stl,model/obj,application/vnd.ms-package.3dmanufacturing-3dmodel+xml"
                    aria-label="ارفع ملف المجسم ثلاثي الأبعاد"
                    aria-describedby={fileError ? 'print-file-error' : 'print-file-note'}
                    onChange={handleFileChange}
                  />
                  <span className="print-upload-icon" aria-hidden="true">↥</span>
                  <span className="print-upload-copy">
                    <strong>{file ? file.name : 'اسحب ملفك هنا أو اضغط لاختياره'}</strong>
                    <small>{file ? formatFileSize(file.size) + ' · اضغط لاختيار ملف تاني' : 'STL · OBJ · 3MF · حتى 50 ميجابايت'}</small>
                  </span>
                  <span className="print-upload-action">{file ? 'تغيير الملف' : 'اختار ملف'}</span>
                </label>
                <p className="print-file-note" id="print-file-note">بعد فتح واتساب، ارفق الملف في المحادثة عشان نراجعه.</p>
                {fileError && <p className="print-file-error" id="print-file-error" role="alert">{fileError}</p>}
              </article>
            </div>
          </div>

          <section className="print-quote-contact" aria-labelledby="print-contact-title">
            <div className="print-contact-heading">
              <div className="print-quote-card-heading"><span>03 / إرسال الطلب</span><h3 id="print-contact-title">بيانات التواصل</h3></div>
              <span className="print-contact-note">تفاصيلك هتساعدنا نرجعلك بعرض سعر واضح.</span>
            </div>
            <div className="print-contact-fields">
              <label>اسمك<input name="name" required minLength="2" maxLength="100" autoComplete="name" placeholder="اكتب اسمك" /></label>
              <label>رقم الموبايل<input name="phone" type="tel" required minLength="10" maxLength="30" autoComplete="tel" placeholder="01X XXX XXXX" dir="ltr" /></label>
              <label className="print-notes-field">ملاحظات على التصميم <span>اختياري</span><textarea name="notes" maxLength="1000" rows="2" placeholder="المقاس، الاستخدام، أو أي تفاصيل تحب نعرفها…" /></label>
            </div>
            <div className="print-contact-submit">
              <p>السعر النهائي بيتحدد بعد مراجعة الملف والخامة والتفاصيل.</p>
              <button className="print-submit-button" type="submit">أرسل طلب التسعير <span aria-hidden="true">↙</span></button>
            </div>
            {submitted && <p className="print-submit-status" role="status">فتحنا واتساب برسالة الطلب. ارفق ملف المجسم في المحادثة وبعدها ابعت الرسالة.</p>}
          </section>
        </form>
      </div>
    </section>
  );
}

