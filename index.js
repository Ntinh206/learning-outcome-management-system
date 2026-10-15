'use strict';
/* =====================================================================
   HỆ THỐNG QUẢN LÝ KẾT QUẢ HỌC TẬP – THPT HÀN THUYÊN
   Dữ liệu được lưu trong localStorage (mô phỏng các bảng SQL – xem database.sql)
   ===================================================================== */
const KEY = 'hanthuyen_qlkq_v1';
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nowStr = () => new Date().toLocaleString('vi-VN');
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDate = d => d ? d.split('-').reverse().join('/') : '';
const pad = n => String(n).padStart(2, '0');
const round1 = x => Math.round(x * 10) / 10;
const isNum = v => v !== null && v !== undefined && v !== '' && !isNaN(v);
const clone = o => JSON.parse(JSON.stringify(o));
const GRADE_LETTER = { 10: 'C', 11: 'B', 12: 'A' };
const ROLE_NAME = { hs: 'Học sinh', gv: 'Giáo viên', bgh: 'Ban giám hiệu', admin: 'Quản trị viên' };
const STATUS_NAME = { draft: 'Nháp', pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Bị từ chối' };
const CONDUCT = ['Tốt', 'Khá', 'Trung bình', 'Yếu'];

let DB, S = null;
const state = { page: 'home', hk: 1, asg: '', cls: '', view: 'hk' };

/* ----------------------------- DỮ LIỆU MẪU ----------------------------- */
function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }

function seedDB() {
  const r = rng(20261015);
  const pick = a => a[Math.floor(r() * a.length)];
  const subjects = [
    ['toan', 'Toán'], ['van', 'Ngữ văn'], ['anh', 'Tiếng Anh'], ['ly', 'Vật lí'], ['hoa', 'Hóa học'],
    ['sinh', 'Sinh học'], ['su', 'Lịch sử'], ['dia', 'Địa lí'], ['gdcd', 'GDCD'], ['tin', 'Tin học']
  ].map(([id, name]) => ({ id, name }));
  const teachers = [
    { id: 'gv01', name: 'Nguyễn Thị Hoa', tobm: 'Tổ Toán – Tin' },
    { id: 'gv02', name: 'Trần Văn Nam', tobm: 'Tổ Ngữ văn' },
    { id: 'gv03', name: 'Lê Minh Tuấn', tobm: 'Tổ Ngoại ngữ' },
    { id: 'gv04', name: 'Phạm Thu Hà', tobm: 'Tổ Vật lí' },
    { id: 'gv05', name: 'Hoàng Quốc Bảo', tobm: 'Tổ Hóa – Sinh' },
    { id: 'gv06', name: 'Vũ Ngọc Lan', tobm: 'Tổ Sử – Địa – GDCD' },
    { id: 'gv07', name: 'Đặng Hải Long', tobm: 'Tổ Toán – Tin' }
  ];
  const classes = [
    { id: '10-1', grade: 10, num: 1, gvcn: 'gv01' }, { id: '10-2', grade: 10, num: 2, gvcn: 'gv02' },
    { id: '11-1', grade: 11, num: 1, gvcn: 'gv03' }, { id: '12-1', grade: 12, num: 1, gvcn: 'gv04' }
  ];
  const tmap = { toan: 'gv01', van: 'gv02', anh: 'gv03', ly: 'gv04', hoa: 'gv05', sinh: 'gv05', su: 'gv06', dia: 'gv06', gdcd: 'gv06', tin: 'gv07' };
  const assign = [];
  classes.forEach(c => subjects.forEach(s => assign.push({ classId: c.id, sub: s.id, teacher: (s.id === 'toan' && c.id === '12-1') ? 'gv07' : tmap[s.id] })));

  const ho = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi'];
  const dem = ['Văn', 'Thị', 'Minh', 'Ngọc', 'Anh', 'Quốc', 'Thu', 'Hải'];
  const ten = ['An', 'Bình', 'Chi', 'Dũng', 'Giang', 'Hà', 'Hiếu', 'Khánh', 'Lan', 'Linh', 'Nam', 'Phúc', 'Quân', 'Trang', 'Vy', 'Yến'];
  const students = [], users = [
    { username: 'admin', password: 'admin123', role: 'admin', name: 'Quản trị hệ thống', ref: 'admin', locked: false },
    { username: 'bgh', password: 'bgh123', role: 'bgh', name: 'Thầy Hiệu trưởng', ref: 'bgh', locked: false }
  ];
  teachers.forEach(t => users.push({ username: t.id, password: '123', role: 'gv', name: t.name, ref: t.id, locked: false }));
  classes.forEach(c => {
    for (let i = 1; i <= 10; i++) {
      const id = GRADE_LETTER[c.grade] + c.num + pad(i);
      const st = {
        id, stt: i, classId: c.id, gender: r() > .5 ? 'Nam' : 'Nữ',
        name: pick(ho) + ' ' + pick(dem) + ' ' + pick(ten),
        dob: `${2026 - 15 - (c.grade - 10)}-${pad(1 + Math.floor(r() * 12))}-${pad(1 + Math.floor(r() * 28))}`,
        ability: 5 + r() * 4
      };
      students.push(st);
      users.push({ username: id, password: '123', role: 'hs', name: st.name, ref: id, locked: false });
    }
  });
  const clamp = v => Math.max(0, Math.min(10, round1(v)));
  const scores = {};
  students.forEach(st => subjects.forEach(sb => {
    const g = () => clamp(st.ability + (r() - .5) * 3);
    const d = { tx: [g(), g(), g()], gk: g(), ck: g() };
    const pendingCase = (st.classId === '10-2' && sb.id === 'van') || (st.classId === '12-1' && sb.id === 'hoa');
    scores[`${st.id}|${sb.id}|1`] = pendingCase ? { draft: d, pub: null, status: 'pending', reason: '' } : { draft: d, pub: clone(d), status: 'approved', reason: '' };
  }));
  const conduct = {};
  const nx = ['Chăm ngoan, có tinh thần học tập tốt.', 'Cần phát huy thêm trong học tập.', 'Hòa đồng, tích cực tham gia phong trào.', 'Cần chú ý hơn việc học ở nhà.'];
  students.forEach(st => { conduct[`${st.id}|1`] = { hk: st.ability > 6.5 ? 'Tốt' : st.ability > 5.5 ? 'Khá' : 'Trung bình', nx: pick(nx) }; });
  const absences = [
    { sid: 'C101', date: '2026-09-22', permit: true, reason: 'Ốm' },
    { sid: 'C103', date: '2026-10-05', permit: false, reason: 'Nghỉ không lý do' },
    { sid: 'C124'.replace('24', '05'), date: '2026-10-09', permit: true, reason: 'Việc gia đình' }
  ];
  return {
    settings: {
      year: '2026 - 2027',
      hk: {
        1: { start: '2026-09-05', end: '2026-12-25', locked: false },
        2: { start: '2027-01-05', end: '2027-05-25', locked: true }
      },
      rules: { txCols: 3, wTx: 1, wGk: 2, wCk: 3, gioi: 8, kha: 6.5, tb: 5, yeu: 3.5, wHk1: 1, wHk2: 2 }
    },
    subjects, teachers, classes, assign, students, users, scores, conduct, absences, logs: []
  };
}

function loadDB() {
  try { DB = JSON.parse(localStorage.getItem(KEY)); } catch (e) { DB = null; }
  if (!DB || !DB.settings) { DB = seedDB(); saveDB(); }
}
function saveDB() { localStorage.setItem(KEY, JSON.stringify(DB)); }

/* ----------------------------- TRUY VẤN ----------------------------- */
const subj = id => DB.subjects.find(x => x.id === id);
const cls = id => DB.classes.find(x => x.id === id);
const stu = id => DB.students.find(x => x.id === id);
const tea = id => DB.teachers.find(x => x.id === id);
const studentsOf = cid => DB.students.filter(s => s.classId === cid).sort((a, b) => a.stt - b.stt);
const rec = (sid, sub, hk) => DB.scores[`${sid}|${sub}|${hk}`];
const rules = () => DB.settings.rules;
const hkSet = hk => DB.settings.hk[hk];
const isGvcn = () => DB.classes.some(c => c.gvcn === S.ref);
const teacherName = id => (tea(id) || {}).name || '—';

/* ----------------------------- TÍNH ĐIỂM ----------------------------- */
function calcAvg(d) {
  if (!d || !isNum(d.gk) || !isNum(d.ck)) return null;
  const R = rules(), tx = (d.tx || []).slice(0, R.txCols).filter(isNum).map(Number);
  if (tx.length < R.txCols) return null;
  const sum = tx.reduce((a, b) => a + b, 0) * R.wTx + d.gk * R.wGk + d.ck * R.wCk;
  return round1(sum / (tx.length * R.wTx + R.wGk + R.wCk));
}
function xepLoai(avg) {
  if (avg === null || avg === undefined) return '—';
  const R = rules();
  return avg >= R.gioi ? 'Giỏi' : avg >= R.kha ? 'Khá' : avg >= R.tb ? 'Trung bình' : avg >= R.yeu ? 'Yếu' : 'Kém';
}
const badge = t => {
  const m = { 'Giỏi': 'gioi', 'Khá': 'kha', 'Trung bình': 'tb', 'Yếu': 'yeu', 'Kém': 'kem', 'Tốt': 'tot' };
  return t && t !== '—' ? `<span class="badge b-${m[t] || 'tb'}">${esc(t)}</span>` : '—';
};
const sBadge = s => `<span class="badge b-${s}">${STATUS_NAME[s] || s}</span>`;
const fmt = v => isNum(v) ? Number(v).toFixed(1).replace(/\.0$/, '') : '—';

function hkResult(sid, hk, pub = true, subs = null) {
  const list = subs || DB.subjects.map(s => s.id);
  const rows = list.map(id => { const r = rec(sid, id, hk); const d = r ? (pub ? r.pub : r.draft) : null; return { sub: id, d, avg: calcAvg(d), status: r && r.status }; });
  const av = rows.map(x => x.avg), complete = av.length && av.every(v => v !== null);
  const avg = complete ? round1(av.reduce((a, b) => a + b, 0) / av.length) : null;
  return { rows, avg, hl: xepLoai(avg) };
}
function yearRows(sid) {
  const R = rules();
  return DB.subjects.map(s => {
    const a = calcAvg((rec(sid, s.id, 1) || {}).pub), b = calcAvg((rec(sid, s.id, 2) || {}).pub);
    const cn = (a !== null && b !== null) ? round1((a * R.wHk1 + b * R.wHk2) / (R.wHk1 + R.wHk2)) : null;
    return { sub: s.id, a, b, cn };
  });
}

/* ----------------------------- TIỆN ÍCH UI ----------------------------- */
function toast(msg, type = 'ok') {
  const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg;
  $('#toastRoot').appendChild(t); setTimeout(() => t.remove(), 3800);
}
function modal(title, body, okText = 'Lưu', onOk = null, okClass = 'btn-success') {
  const root = $('#modalRoot');
  root.innerHTML = `<div class="overlay"><div class="modal"><div class="modal-h">${title}</div><div class="modal-b">${body}</div>
    <div class="modal-f"><button class="btn btn-gray" id="mdCancel">Đóng</button>${onOk ? `<button class="btn ${okClass}" id="mdOk">${okText}</button>` : ''}</div></div></div>`;
  $('#mdCancel').onclick = closeModal;
  if (onOk) $('#mdOk').onclick = () => { if (onOk() !== false) closeModal(); };
}
const closeModal = () => { $('#modalRoot').innerHTML = ''; };
const val = id => ($('#' + id) || {}).value;
const opts = (arr, sel) => arr.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(sel) ? 'selected' : ''}>${esc(l)}</option>`).join('');
const hkSelect = (withYear = false) => `<select onchange="A.setHk(this.value)">${opts([[1, 'Học kỳ 1'], [2, 'Học kỳ 2']].concat(withYear ? [[3, 'Cả năm']] : []), state.hk)}</select>`;
function dl(name, rows) {
  const csv = '\ufeff' + rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = name; a.click();
}
function addLog(o) { DB.logs.unshift({ time: nowStr(), ...o }); if (DB.logs.length > 800) DB.logs.length = 800; }
const content = html => { $('#content').innerHTML = html; };
const title = (icon, t) => `<div class="page-title">${icon} ${t}</div>`;

function windowInfo(hk) {
  const h = hkSet(hk), t = todayISO();
  const outside = t < h.start || t > h.end;
  return { h, outside, text: `Hạn nhập điểm HK${hk}: ${fmtDate(h.start)} → ${fmtDate(h.end)}`, locked: h.locked };
}
function banner(hk) {
  const w = windowInfo(hk);
  if (w.locked) return `<div class="notice err">🔒 Học kỳ ${hk} đang <b>bị khóa</b> nhập/sửa điểm. ${w.text}. Liên hệ quản trị viên để mở.</div>`;
  if (w.outside) return `<div class="notice warn">⏰ Hiện đang <b>ngoài thời hạn</b> nhập điểm. ${w.text}. Mọi chỉnh sửa cần ghi lý do giải trình và gửi BGH duyệt lại.</div>`;
  return `<div class="notice">📅 ${w.text} – đang trong thời gian nhập điểm.</div>`;
}

/* ----------------------------- ĐĂNG NHẬP ----------------------------- */
const MENU = {
  hs: [['home', '🏠', 'Trang chủ'], ['kqht', '📊', 'Kết quả học tập'], ['nghi', '📅', 'Ngày nghỉ'], ['info', '👤', 'Thông tin cá nhân']],
  gv: [['home', '🏠', 'Trang chủ'], ['nhapdiem', '✏️', 'Nhập điểm'], ['bangdiem', '📋', 'Bảng điểm & tra cứu'], ['chunhiem', '👨‍🏫', 'Lớp chủ nhiệm'], ['lichsu', '🕘', 'Lịch sử sửa điểm']],
  bgh: [['home', '🏠', 'Trang chủ'], ['duyet', '✅', 'Duyệt điểm'], ['han', '⏰', 'Thiết lập hạn nhập điểm'], ['baocao', '📈', 'Báo cáo tổng hợp'], ['lichsu', '🕘', 'Lịch sử sửa điểm']],
  admin: [['home', '🏠', 'Trang chủ'], ['taikhoan', '🔑', 'Tài khoản & phân quyền'], ['hocsinh', '🧑‍🎓', 'Học sinh'], ['lop', '🏫', 'Lớp học'], ['mon', '📚', 'Môn học'], ['phancong', '🗂️', 'Phân công giảng dạy'], ['kyhoc', '🗓️', 'Năm học & khóa điểm'], ['quydinh', '⚙️', 'Quy định tính điểm'], ['lichsu', '🕘', 'Nhật ký hệ thống']]
};

const A = {};
A.login = e => {
  e.preventDefault();
  const u = val('lgUser').trim().toLowerCase(), p = val('lgPass');
  const acc = DB.users.find(x => x.username.toLowerCase() === u);
  if (!acc || acc.password !== p) return toast('Sai tài khoản hoặc mật khẩu!', 'err');
  if (acc.locked) return toast('Tài khoản đã bị khóa. Liên hệ quản trị viên.', 'err');
  S = acc; sessionStorage.setItem('ht_user', acc.username);
  state.page = 'home'; state.hk = 1; enterApp();
};
A.logout = () => { S = null; sessionStorage.removeItem('ht_user'); $('#appView').hidden = true; $('#loginView').hidden = false; $('#lgPass').value = ''; document.body.classList.remove('nav-open'); };
A.resetDemo = () => { if (confirm('Xóa toàn bộ dữ liệu hiện tại và khôi phục dữ liệu mẫu?')) { DB = seedDB(); saveDB(); toast('Đã khôi phục dữ liệu mẫu', 'info'); } };
A.forgot = () => modal('🔓 Quên mật khẩu (học sinh)', `<p>Nhập mã học sinh và ngày sinh để đặt lại mật khẩu về mặc định <b>123</b>.</p>
  <div class="form-grid"><label>Mã học sinh<input id="fgId" placeholder="VD: C124"></label><label>Ngày sinh<input id="fgDob" type="date"></label></div>`, 'Đặt lại mật khẩu', () => {
  const s = stu(val('fgId').trim().toUpperCase());
  if (!s || s.dob !== val('fgDob')) { toast('Mã học sinh hoặc ngày sinh không đúng', 'err'); return false; }
  DB.users.find(u => u.ref === s.id && u.role === 'hs').password = '123'; saveDB(); toast('Đã đặt lại mật khẩu về 123'); 
}, 'btn-warn');
A.chpw = () => modal('🔐 Đổi mật khẩu', `<div class="form-grid"><label>Mật khẩu hiện tại<input id="pwOld" type="password"></label>
  <label>Mật khẩu mới<input id="pwNew" type="password"></label><label>Nhập lại mật khẩu mới<input id="pwNew2" type="password"></label></div>`, 'Đổi mật khẩu', () => {
  if (val('pwOld') !== S.password) { toast('Mật khẩu hiện tại không đúng', 'err'); return false; }
  if (val('pwNew').length < 3) { toast('Mật khẩu mới tối thiểu 3 ký tự', 'err'); return false; }
  if (val('pwNew') !== val('pwNew2')) { toast('Nhập lại mật khẩu chưa khớp', 'err'); return false; }
  S.password = val('pwNew'); saveDB(); toast('Đổi mật khẩu thành công');
});
A.setHk = v => { state.hk = +v; go(state.page); };
A.go = p => go(p);

function enterApp() {
  $('#loginView').hidden = true; $('#appView').hidden = false;
  $('#userName').textContent = S.name; $('#userRole').textContent = ROLE_NAME[S.role];
  $('#userAvatar').textContent = S.name.trim().split(' ').pop()[0].toUpperCase();
  $('#yearChip').textContent = 'Năm học ' + DB.settings.year;
  const menu = MENU[S.role].filter(m => m[0] !== 'chunhiem' || isGvcn());
  $('#nav').innerHTML = menu.map(([id, ic, t]) => `<button data-p="${id}" onclick="go('${id}')"><span>${ic}</span>${t}</button>`).join('');
  go(state.page);
}
function go(page) {
  const menu = MENU[S.role].map(m => m[0]);
  if (!menu.includes(page)) page = 'home';
  state.page = page; document.body.classList.remove('nav-open');
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('active', b.dataset.p === page));
  const fn = PAGES[S.role][page]; fn();
  window.scrollTo(0, 0);
}
window.go = go; window.A = A;

/* ----------------------------- BẢNG ĐIỂM DÙNG CHUNG ----------------------------- */
function resultHTML(sid, hk, o = {}) {
  const R = rules(), res = hkResult(sid, hk, o.pub !== false, o.subs);
  const head = `<tr><th class="left">Môn học</th>${Array.from({ length: R.txCols }, (_, i) => `<th>TX${i + 1}</th>`).join('')}<th>Giữa kỳ</th><th>Cuối kỳ</th><th>ĐTB môn</th><th>Học lực môn</th></tr>`;
  const body = res.rows.map(x => {
    const d = x.d || {};
    return `<tr><td class="left"><b>${esc(subj(x.sub).name)}</b></td>${Array.from({ length: R.txCols }, (_, i) => `<td>${fmt((d.tx || [])[i])}</td>`).join('')}<td>${fmt(d.gk)}</td><td>${fmt(d.ck)}</td><td><b>${fmt(x.avg)}</b></td><td>${badge(xepLoai(x.avg))}</td></tr>`;
  }).join('');
  let foot = '';
  if (!o.subs) {
    const c = DB.conduct[`${sid}|${hk}`] || {};
    foot = `<tfoot><tr><td class="left" colspan="${R.txCols + 3}">Điểm trung bình các môn</td><td colspan="2">${fmt(res.avg)}</td></tr>
      <tr><td class="left" colspan="${R.txCols + 3}">Học lực</td><td colspan="2">${badge(res.hl)}</td></tr>
      <tr><td class="left" colspan="${R.txCols + 3}">Hạnh kiểm</td><td colspan="2">${badge(c.hk)}</td></tr>
      <tr><td class="left" colspan="${R.txCols + 5}">Nhận xét của giáo viên chủ nhiệm: <i>${esc(c.nx || 'Chưa có nhận xét')}</i></td></tr></tfoot>`;
  }
  return `<div class="table-wrap"><table><thead>${head}</thead><tbody>${body}</tbody>${foot}</table></div>`;
}
function yearHTML(sid) {
  const rows = yearRows(sid);
  const cn = rows.map(r => r.cn), full = cn.every(v => v !== null), avg = full ? round1(cn.reduce((a, b) => a + b, 0) / cn.length) : null;
  return `<div class="table-wrap"><table><thead><tr><th class="left">Môn học</th><th>ĐTB HK1</th><th>ĐTB HK2</th><th>Cả năm</th><th>Xếp loại</th></tr></thead><tbody>
    ${rows.map(r => `<tr><td class="left"><b>${esc(subj(r.sub).name)}</b></td><td>${fmt(r.a)}</td><td>${fmt(r.b)}</td><td><b>${fmt(r.cn)}</b></td><td>${badge(xepLoai(r.cn))}</td></tr>`).join('')}
    </tbody><tfoot><tr><td class="left">Trung bình cả năm</td><td colspan="2"></td><td>${fmt(avg)}</td><td>${badge(xepLoai(avg))}</td></tr></tfoot></table></div>`;
}

/* ============================== TRANG HỌC SINH ============================== */
const PAGES = { hs: {}, gv: {}, bgh: {}, admin: {} };

PAGES.hs.home = () => {
  const s = stu(S.ref), c = cls(s.classId), res = hkResult(s.id, 1);
  const abs = DB.absences.filter(a => a.sid === s.id);
  content(`${title('🏠', 'Trang chủ học sinh')}
  <div class="card"><h3>👤 Thông tin học sinh</h3><div class="info-grid">
    <div><small>Họ và tên</small><b>${esc(s.name)}</b></div><div><small>Mã học sinh</small><b>${s.id}</b></div>
    <div><small>Lớp</small><b>${c.id}</b></div><div><small>Ngày sinh</small><b>${fmtDate(s.dob)}</b></div>
    <div><small>Giới tính</small><b>${s.gender}</b></div><div><small>Giáo viên chủ nhiệm</small><b>${esc(teacherName(c.gvcn))}</b></div>
    <div><small>Năm học</small><b>${DB.settings.year}</b></div></div></div>
  <div class="grid-cards">
    <div class="stat s-blue">ĐTB HK1<b>${fmt(res.avg)}</b></div>
    <div class="stat s-green">Học lực HK1<b style="font-size:24px">${res.hl}</b></div>
    <div class="stat s-orange">Ngày nghỉ<b>${abs.length}</b></div>
    <div class="stat s-purple">Số môn học<b>${DB.subjects.length}</b></div></div>
  <div class="card"><h3>⚡ Truy cập nhanh</h3><div class="shortcuts">
    <button class="btn btn-primary" onclick="go('kqht')"><span>📊</span>Kết quả học tập</button>
    <button class="btn btn-success" onclick="go('nghi')"><span>📅</span>Ngày nghỉ</button>
    <button class="btn btn-purple" onclick="go('info')"><span>👤</span>Thông tin cá nhân</button>
    <button class="btn btn-warn" onclick="A.chpw()"><span>🔐</span>Đổi mật khẩu</button></div></div>
  <div class="card"><h3>📚 Môn học</h3><div class="subject-grid">
    ${DB.subjects.map(sb => { const a = DB.assign.find(x => x.classId === c.id && x.sub === sb.id); return `<div class="subject-chip"><b>${esc(sb.name)}</b><small>GV: ${esc(a ? teacherName(a.teacher) : '—')}</small></div>`; }).join('')}
  </div></div>`);
};
PAGES.hs.kqht = () => {
  const s = stu(S.ref);
  content(`${title('📊', 'Kết quả học tập – ' + esc(s.name) + ' (' + s.classId + ')')}
  <div class="notice">ℹ️ Chỉ hiển thị điểm đã được Ban giám hiệu <b>duyệt và chốt</b>.</div>
  <div class="card"><div class="toolbar">${hkSelect(true)}<span class="grow"></span><button class="btn btn-info btn-sm" onclick="window.print()">🖨️ In bảng điểm</button></div>
  ${state.hk === 3 ? yearHTML(s.id) : resultHTML(s.id, state.hk)}</div>`);
};
PAGES.hs.nghi = () => {
  const list = DB.absences.filter(a => a.sid === S.ref).sort((a, b) => b.date.localeCompare(a.date));
  content(`${title('📅', 'Ngày nghỉ học')}
  <div class="grid-cards"><div class="stat s-blue">Tổng số ngày nghỉ<b>${list.length}</b></div><div class="stat s-green">Có phép<b>${list.filter(a => a.permit).length}</b></div><div class="stat s-red">Không phép<b>${list.filter(a => !a.permit).length}</b></div></div>
  <div class="card"><div class="table-wrap"><table><thead><tr><th>Ngày</th><th>Loại</th><th class="left">Lý do</th></tr></thead><tbody>
  ${list.map(a => `<tr><td>${fmtDate(a.date)}</td><td>${a.permit ? '<span class="badge b-tot">Có phép</span>' : '<span class="badge b-kem">Không phép</span>'}</td><td class="left">${esc(a.reason)}</td></tr>`).join('') || '<tr><td colspan="3">Chưa có ngày nghỉ nào 🎉</td></tr>'}
  </tbody></table></div></div>`);
};
PAGES.hs.info = () => {
  const s = stu(S.ref), c = cls(s.classId);
  content(`${title('👤', 'Thông tin cá nhân')}<div class="card"><div class="info-grid">
  <div><small>Họ và tên</small><b>${esc(s.name)}</b></div><div><small>Mã học sinh (tên đăng nhập)</small><b>${s.id}</b></div>
  <div><small>Lớp</small><b>${c.id} (Khối ${c.grade})</b></div><div><small>Số thứ tự</small><b>${s.stt}</b></div>
  <div><small>Ngày sinh</small><b>${fmtDate(s.dob)}</b></div><div><small>Giới tính</small><b>${s.gender}</b></div>
  <div><small>GVCN</small><b>${esc(teacherName(c.gvcn))}</b></div></div><br>
  <button class="btn btn-warn" onclick="A.chpw()">🔐 Đổi mật khẩu</button>
  <p><small>Học sinh chỉ được xem thông tin của mình, không được chỉnh sửa điểm.</small></p></div>`);
};

/* ============================== TRANG GIÁO VIÊN ============================== */
const myAssign = () => DB.assign.filter(a => a.teacher === S.ref);
const pendingCount = () => Object.values(DB.scores).filter(x => x.status === 'pending').length;

PAGES.gv.home = () => {
  const as = myAssign(), mine = Object.entries(DB.scores).filter(([k]) => { const [sid, sb] = k.split('|'); return as.some(a => a.classId === (stu(sid) || {}).classId && a.sub === sb); });
  const cnt = s => mine.filter(([, v]) => v.status === s).length;
  content(`${title('🏠', 'Xin chào, ' + esc(S.name))}${banner(1)}
  <div class="grid-cards"><div class="stat s-blue">Lớp–môn được phân công<b>${as.length}</b></div>
  <div class="stat s-orange">Chờ duyệt<b>${cnt('pending')}</b></div><div class="stat s-green">Đã duyệt<b>${cnt('approved')}</b></div>
  <div class="stat s-red">Bị từ chối<b>${cnt('rejected')}</b></div></div>
  <div class="card"><h3>📚 Phân công giảng dạy của bạn</h3><div class="table-wrap"><table><thead><tr><th>Lớp</th><th>Môn</th><th>Sĩ số</th><th>Thao tác</th></tr></thead><tbody>
  ${as.map(a => `<tr><td>${a.classId}</td><td>${esc(subj(a.sub).name)}</td><td>${studentsOf(a.classId).length}</td><td><button class="btn btn-sm btn-success" onclick="state.asg='${a.classId}|${a.sub}';go('nhapdiem')">✏️ Nhập điểm</button></td></tr>`).join('') || '<tr><td colspan="4">Chưa được phân công</td></tr>'}
  </tbody></table></div>${isGvcn() ? `<p>👨‍🏫 Bạn là GVCN lớp <b>${DB.classes.filter(c => c.gvcn === S.ref).map(c => c.id).join(', ')}</b>. <a href="#" onclick="go('chunhiem');return false">Xem thống kê lớp</a></p>` : ''}</div>`);
};
window.state = state;

PAGES.gv.nhapdiem = () => {
  const as = myAssign();
  if (!as.length) return content(title('✏️', 'Nhập điểm') + '<div class="notice warn">Bạn chưa được phân công giảng dạy.</div>');
  if (!as.some(a => `${a.classId}|${a.sub}` === state.asg)) state.asg = `${as[0].classId}|${as[0].sub}`;
  const R = rules();
  content(`${title('✏️', 'Nhập điểm')}
  <div class="card"><div class="toolbar">
    <select onchange="state.asg=this.value;go('nhapdiem')">${opts(as.map(a => [`${a.classId}|${a.sub}`, `Lớp ${a.classId} – ${subj(a.sub).name}`]), state.asg)}</select>${hkSelect()}
    <span class="grow"></span>
    <button class="btn btn-warn" onclick="A.saveScores(false)">💾 Lưu điểm</button>
    <button class="btn btn-success" onclick="A.saveScores(true)">📨 Chốt & gửi BGH duyệt</button></div>
  ${banner(state.hk)}
  <div class="notice">Thang điểm 0–10 · ${R.txCols} cột thường xuyên (hệ số ${R.wTx}) · Giữa kỳ (hệ số ${R.wGk}) · Cuối kỳ (hệ số ${R.wCk}). Điểm chỉ hiển thị cho học sinh sau khi BGH duyệt.</div>
  <div class="table-wrap"><table><thead><tr><th>STT</th><th>Mã HS</th><th class="left">Họ và tên</th>${Array.from({ length: R.txCols }, (_, i) => `<th>TX${i + 1}</th>`).join('')}<th>GK</th><th>CK</th><th>ĐTB</th><th>Trạng thái</th></tr></thead><tbody id="scBody">${scoreRows()}</tbody></table></div></div>`);
};
function scoreRows() {
  const [cid, sb] = state.asg.split('|'), hk = state.hk, R = rules(), lock = hkSet(hk).locked;
  const inp = (sid, k, v) => `<td><input class="sc" type="number" min="0" max="10" step="0.1" data-sid="${sid}" data-k="${k}" value="${isNum(v) ? v : ''}" ${lock ? 'disabled' : ''} oninput="A.live('${sid}')"></td>`;
  return studentsOf(cid).map(s => {
    const r = rec(s.id, sb, hk), d = r ? r.draft : {}, st = r ? r.status : 'draft';
    return `<tr><td>${s.stt}</td><td>${s.id}</td><td class="left">${esc(s.name)}</td>
      ${Array.from({ length: R.txCols }, (_, i) => inp(s.id, 'tx' + i, (d.tx || [])[i])).join('')}${inp(s.id, 'gk', d.gk)}${inp(s.id, 'ck', d.ck)}
      <td><b id="avg_${s.id}">${fmt(calcAvg(d))}</b></td><td title="${esc(st === 'rejected' ? (r.rejectReason || '') : (r && r.reason) || '')}">${r ? sBadge(st) : '<span class="badge b-draft">Chưa nhập</span>'}</td></tr>`;
  }).join('');
}
const readRow = sid => {
  const R = rules(), get = k => { const e = document.querySelector(`input[data-sid="${sid}"][data-k="${k}"]`); return e ? e.value.trim() : ''; };
  return { tx: Array.from({ length: R.txCols }, (_, i) => get('tx' + i)), gk: get('gk'), ck: get('ck') };
};
const normRow = d => ({ tx: d.tx.map(v => v === '' ? null : Number(v)), gk: d.gk === '' ? null : Number(d.gk), ck: d.ck === '' ? null : Number(d.ck) });
const brief = d => d ? `TX:${(d.tx || []).map(fmt).join(',')} | GK:${fmt(d.gk)} | CK:${fmt(d.ck)}` : '(trống)';
A.live = sid => { const d = normRow(readRow(sid)); const el = $('#avg_' + sid); if (el) el.textContent = fmt(calcAvg(d)); };

A.saveScores = submit => {
  const [cid, sb] = state.asg.split('|'), hk = state.hk, R = rules();
  if (hkSet(hk).locked) return toast('Học kỳ đang bị khóa điểm!', 'err');
  const list = studentsOf(cid), errs = [], rows = {};
  document.querySelectorAll('input.sc').forEach(i => i.classList.remove('bad'));
  list.forEach(s => {
    const raw = readRow(s.id); rows[s.id] = normRow(raw);
    const all = [...raw.tx.map((v, i) => ['tx' + i, v]), ['gk', raw.gk], ['ck', raw.ck]];
    all.forEach(([k, v]) => {
      const bad = v !== '' && (isNaN(v) || Number(v) < 0 || Number(v) > 10);
      const miss = submit && v === '';
      if (bad || miss) { errs.push(`${s.name}: ${bad ? 'điểm ' + v + ' không hợp lệ (0–10)' : 'thiếu điểm'}`); const e = document.querySelector(`input[data-sid="${s.id}"][data-k="${k}"]`); if (e) e.classList.add('bad'); }
    });
  });
  if (errs.length) return toast(`Lỗi: ${errs[0]}${errs.length > 1 ? ` (và ${errs.length - 1} lỗi khác)` : ''}`, 'err');
  const w = windowInfo(hk);
  const changed = list.filter(s => { const r = rec(s.id, sb, hk); return JSON.stringify(rows[s.id]) !== JSON.stringify(r ? r.draft : { tx: Array(R.txCols).fill(null), gk: null, ck: null }); });
  const needReason = changed.some(s => { const r = rec(s.id, sb, hk); return w.outside || (r && (r.status === 'approved')); });
  const apply = reason => {
    list.forEach(s => {
      const key = `${s.id}|${sb}|${hk}`, r = DB.scores[key], nd = rows[s.id];
      if (changed.includes(s)) {
        addLog({ by: S.ref, byName: S.name, sid: s.id, sname: s.name, cid, sub: sb, hk, old: brief(r && r.draft), neu: brief(nd), reason: reason || '' });
        if (!r) DB.scores[key] = { draft: nd, pub: null, status: 'draft', reason: reason || '' };
        else { r.draft = nd; if (reason) r.reason = reason; if (r.status === 'approved' || r.status === 'rejected') r.status = 'draft'; }
      }
      if (submit) { const x = DB.scores[key]; if (x && (x.status === 'draft' || x.status === 'rejected')) { x.status = 'pending'; x.rejectReason = ''; } }
    });
    saveDB(); toast(submit ? 'Đã chốt điểm và gửi Ban giám hiệu duyệt 📨' : 'Đã lưu điểm ✔'); go('nhapdiem');
  };
  if (needReason) modal('📝 Lý do giải trình chỉnh sửa điểm', `<div class="notice warn">Bạn đang chỉnh sửa điểm đã duyệt hoặc ngoài thời hạn nhập điểm. Vui lòng nêu lý do để Ban giám hiệu xem xét.</div><textarea id="rsn" rows="4" style="width:100%" placeholder="Ví dụ: Nhập nhầm điểm kiểm tra giữa kỳ của học sinh..."></textarea>`, 'Xác nhận', () => {
    const t = val('rsn').trim(); if (t.length < 5) { toast('Vui lòng nhập lý do (tối thiểu 5 ký tự)', 'err'); return false; } apply(t);
  }, 'btn-warn');
  else apply('');
};

/* ---- Bảng điểm lớp & tra cứu ---- */
PAGES.gv.bangdiem = () => {
  const ids = [...new Set([...myAssign().map(a => a.classId), ...DB.classes.filter(c => c.gvcn === S.ref).map(c => c.id)])].sort();
  if (!ids.length) return content(title('📋', 'Bảng điểm') + '<div class="notice warn">Chưa có lớp nào.</div>');
  if (!ids.includes(state.cls)) state.cls = ids[0];
  const homeroom = cls(state.cls).gvcn === S.ref;
  const subs = homeroom ? DB.subjects.map(s => s.id) : myAssign().filter(a => a.classId === state.cls).map(a => a.sub);
  const list = studentsOf(state.cls);
  content(`${title('📋', 'Bảng điểm lớp & tra cứu học sinh')}<div class="card"><div class="toolbar">
    <select onchange="state.cls=this.value;go('bangdiem')">${opts(ids.map(i => [i, 'Lớp ' + i]), state.cls)}</select>${hkSelect()}
    <input id="qs" placeholder="🔍 Tra cứu mã / tên học sinh" oninput="A.filterRows(this.value)" style="min-width:230px"><span class="grow"></span>
    <button class="btn btn-info btn-sm" onclick="A.expClass()">⬇️ Xuất CSV</button></div>
    <div class="notice">${homeroom ? 'Bạn là GVCN: xem được tất cả môn của lớp.' : 'Bạn chỉ xem được môn mình dạy.'} Dữ liệu là điểm đã được duyệt. Nhấn tên học sinh để xem chi tiết.</div>
    <div class="table-wrap"><table><thead><tr><th>STT</th><th>Mã</th><th class="left">Họ tên</th>${subs.map(s => `<th>${esc(subj(s).name)}</th>`).join('')}${homeroom ? '<th>ĐTB</th><th>Học lực</th>' : ''}</tr></thead><tbody id="clsBody">
    ${list.map(s => { const r = hkResult(s.id, state.hk, true, subs); return `<tr data-q="${esc((s.id + ' ' + s.name).toLowerCase())}"><td>${s.stt}</td><td>${s.id}</td><td class="left"><a href="#" onclick="A.viewStu('${s.id}',${homeroom});return false">${esc(s.name)}</a></td>${r.rows.map(x => `<td>${fmt(x.avg)}</td>`).join('')}${homeroom ? `<td><b>${fmt(r.avg)}</b></td><td>${badge(r.hl)}</td>` : ''}</tr>`; }).join('')}
    </tbody></table></div></div>`);
};
A.filterRows = q => { q = q.toLowerCase(); document.querySelectorAll('#clsBody tr').forEach(tr => tr.hidden = !tr.dataset.q.includes(q)); };
A.viewStu = (sid, full) => {
  const s = stu(sid), c = cls(s.classId);
  const subs = full ? null : myAssign().filter(a => a.classId === c.id).map(a => a.sub);
  modal(`📄 Kết quả học tập – ${esc(s.name)} (${s.id}) · HK${state.hk}`, resultHTML(sid, state.hk === 3 ? 1 : state.hk, { subs }));
};
A.expClass = () => {
  const homeroom = cls(state.cls).gvcn === S.ref;
  const subs = homeroom ? DB.subjects.map(s => s.id) : myAssign().filter(a => a.classId === state.cls).map(a => a.sub);
  const rows = [['STT', 'Mã', 'Họ tên', ...subs.map(s => subj(s).name), 'ĐTB', 'Học lực']];
  studentsOf(state.cls).forEach(s => { const r = hkResult(s.id, state.hk, true, subs); rows.push([s.stt, s.id, s.name, ...r.rows.map(x => x.avg ?? ''), r.avg ?? '', r.hl]); });
  dl(`bang-diem-${state.cls}-HK${state.hk}.csv`, rows);
};

/* ---- Lớp chủ nhiệm ---- */
PAGES.gv.chunhiem = () => {
  const mine = DB.classes.filter(c => c.gvcn === S.ref);
  if (!mine.some(c => c.id === state.cls)) state.cls = mine[0].id;
  const list = studentsOf(state.cls), hk = state.hk;
  const cnt = { 'Giỏi': 0, 'Khá': 0, 'Trung bình': 0, 'Yếu': 0, 'Kém': 0, '—': 0 }, hkc = { 'Tốt': 0, 'Khá': 0, 'Trung bình': 0, 'Yếu': 0 };
  list.forEach(s => { cnt[hkResult(s.id, hk).hl]++; const c = DB.conduct[`${s.id}|${hk}`]; if (c && hkc[c.hk] !== undefined) hkc[c.hk]++; });
  const bar = (o, colors) => Object.entries(o).filter(([k]) => k !== '—').map(([k, v], i) => `<div class="bar-row"><span class="lbl">${k}</span><div class="bar"><i style="width:${list.length ? v / list.length * 100 : 0}%;background:${colors[i]}"></i></div><span class="val">${v} HS (${list.length ? Math.round(v / list.length * 100) : 0}%)</span></div>`).join('');
  content(`${title('👨‍🏫', 'Lớp chủ nhiệm ' + state.cls)}<div class="card"><div class="toolbar">
    <select onchange="state.cls=this.value;go('chunhiem')">${opts(mine.map(c => [c.id, 'Lớp ' + c.id]), state.cls)}</select>${hkSelect()}<span class="grow"></span>
    <button class="btn btn-pink btn-sm" onclick="A.addAbsence()">📅 Ghi ngày nghỉ</button><button class="btn btn-success btn-sm" onclick="A.saveConduct()">💾 Lưu hạnh kiểm & nhận xét</button></div></div>
  <div class="grid-cards"><div class="stat s-blue">Sĩ số<b>${list.length}</b></div><div class="stat s-green">Giỏi<b>${cnt['Giỏi']}</b></div><div class="stat s-teal">Khá<b>${cnt['Khá']}</b></div>
   <div class="stat s-orange">Trung bình<b>${cnt['Trung bình']}</b></div><div class="stat s-red">Yếu/Kém<b>${cnt['Yếu'] + cnt['Kém']}</b></div><div class="stat s-purple">Chưa đủ điểm<b>${cnt['—']}</b></div></div>
  <div class="card"><h3>📊 Thống kê học lực</h3>${bar(cnt, ['#2e9e5b', '#1e88e5', '#f59e0b', '#ef6c00', '#e53935'])}<h3 style="margin-top:18px">💚 Thống kê hạnh kiểm</h3>${bar(hkc, ['#2e9e5b', '#1e88e5', '#f59e0b', '#e53935'])}</div>
  <div class="card"><h3>📋 Danh sách học sinh lớp ${state.cls}</h3><div class="table-wrap"><table><thead><tr><th>STT</th><th>Mã</th><th class="left">Họ tên</th><th>Ngày sinh</th><th>ĐTB</th><th>Học lực</th><th>Hạnh kiểm</th><th class="left">Nhận xét</th><th>Nghỉ</th></tr></thead><tbody>
  ${list.map(s => { const r = hkResult(s.id, hk), c = DB.conduct[`${s.id}|${hk}`] || {}; return `<tr><td>${s.stt}</td><td>${s.id}</td><td class="left"><a href="#" onclick="A.viewStu('${s.id}',true);return false">${esc(s.name)}</a></td><td>${fmtDate(s.dob)}</td><td><b>${fmt(r.avg)}</b></td><td>${badge(r.hl)}</td>
   <td><select data-cd="${s.id}"><option value="">—</option>${opts(CONDUCT.map(x => [x, x]), c.hk)}</select></td><td><input data-nx="${s.id}" value="${esc(c.nx || '')}" style="width:100%;min-width:200px"></td><td>${DB.absences.filter(a => a.sid === s.id).length}</td></tr>`; }).join('')}
  </tbody></table></div></div>`);
};
A.saveConduct = () => {
  studentsOf(state.cls).forEach(s => {
    const hkv = document.querySelector(`[data-cd="${s.id}"]`).value, nx = document.querySelector(`[data-nx="${s.id}"]`).value.trim();
    DB.conduct[`${s.id}|${state.hk}`] = { hk: hkv, nx };
  });
  saveDB(); toast('Đã lưu hạnh kiểm và nhận xét'); go('chunhiem');
};
A.addAbsence = () => modal('📅 Ghi ngày nghỉ học', `<div class="form-grid"><label>Học sinh<select id="abS">${opts(studentsOf(state.cls).map(s => [s.id, `${s.id} – ${s.name}`]), '')}</select></label>
  <label>Ngày nghỉ<input id="abD" type="date" value="${todayISO()}"></label><label>Loại<select id="abP"><option value="1">Có phép</option><option value="0">Không phép</option></select></label>
  <label>Lý do<input id="abR"></label></div>`, 'Ghi nhận', () => { DB.absences.push({ sid: val('abS'), date: val('abD'), permit: val('abP') === '1', reason: val('abR').trim() || '—' }); saveDB(); toast('Đã ghi ngày nghỉ'); go('chunhiem'); });

/* ---- Lịch sử (GV / BGH / Admin) ---- */
const logPage = () => {
  const logs = S.role === 'gv' ? DB.logs.filter(l => l.by === S.ref) : DB.logs;
  content(`${title('🕘', S.role === 'admin' ? 'Nhật ký hệ thống' : 'Lịch sử sửa điểm')}<div class="card"><div class="table-wrap"><table><thead><tr><th>Thời điểm</th><th>Người thực hiện</th><th>Học sinh</th><th>Môn</th><th>HK</th><th class="left">Giá trị cũ</th><th class="left">Giá trị mới</th><th class="left">Lý do / Ghi chú</th></tr></thead><tbody>
  ${logs.slice(0, 300).map(l => `<tr><td>${esc(l.time)}</td><td>${esc(l.byName || l.by)}</td><td>${esc(l.sname || '')} <small>${esc(l.sid || '')}</small></td><td>${l.sub ? esc(subj(l.sub) ? subj(l.sub).name : l.sub) : ''}</td><td>${l.hk || ''}</td><td class="left">${esc(l.old || '')}</td><td class="left">${esc(l.neu || '')}</td><td class="left">${esc(l.reason || l.note || '')}</td></tr>`).join('') || '<tr><td colspan="8">Chưa có lịch sử.</td></tr>'}
  </tbody></table></div></div>`);
};
PAGES.gv.lichsu = PAGES.bgh.lichsu = PAGES.admin.lichsu = logPage;

/* ============================== BAN GIÁM HIỆU ============================== */
function pendingGroups() {
  const g = {};
  Object.entries(DB.scores).forEach(([k, v]) => {
    if (v.status !== 'pending') return;
    const [sid, sb, hk] = k.split('|'), s = stu(sid); if (!s) return;
    const key = `${s.classId}|${sb}|${hk}`; (g[key] = g[key] || { cid: s.classId, sub: sb, hk: +hk, keys: [] }).keys.push(k);
  });
  return Object.values(g);
}
PAGES.bgh.home = () => {
  const total = DB.students.length, pg = pendingGroups();
  content(`${title('🏠', 'Tổng quan – Ban giám hiệu')}
  <div class="grid-cards"><div class="stat s-blue">Học sinh<b>${total}</b></div><div class="stat s-teal">Lớp học<b>${DB.classes.length}</b></div>
  <div class="stat s-orange">Bảng điểm chờ duyệt<b>${pg.length}</b></div><div class="stat s-purple">Giáo viên<b>${DB.teachers.length}</b></div></div>
  <div class="card"><h3>⚡ Truy cập nhanh</h3><div class="shortcuts">
  <button class="btn btn-success" onclick="go('duyet')"><span>✅</span>Duyệt điểm</button><button class="btn btn-warn" onclick="go('han')"><span>⏰</span>Giao hạn nhập điểm</button>
  <button class="btn btn-purple" onclick="go('baocao')"><span>📈</span>Báo cáo tổng hợp</button><button class="btn btn-info" onclick="go('lichsu')"><span>🕘</span>Lịch sử sửa điểm</button></div></div>
  ${[1, 2].map(banner).join('')}`);
};
PAGES.bgh.duyet = () => {
  const pg = pendingGroups().sort((a, b) => a.cid.localeCompare(b.cid));
  content(`${title('✅', 'Duyệt điểm')}<div class="notice">Sau khi giáo viên nhập điểm và chốt, Ban giám hiệu duyệt thì điểm mới hiển thị cho học sinh. Bản chỉnh sửa sau hạn sẽ kèm lý do giải trình.</div>
  <div class="card"><div class="table-wrap"><table><thead><tr><th>Lớp</th><th>Môn</th><th>HK</th><th>Giáo viên</th><th>Số HS</th><th class="left">Lý do giải trình</th><th>Thao tác</th></tr></thead><tbody>
  ${pg.map((g, i) => { const a = DB.assign.find(x => x.classId === g.cid && x.sub === g.sub); const reasons = [...new Set(g.keys.map(k => DB.scores[k].reason).filter(Boolean))].join('; ');
    return `<tr><td>${g.cid}</td><td>${esc(subj(g.sub).name)}</td><td>${g.hk}</td><td>${esc(teacherName(a && a.teacher))}</td><td>${g.keys.length}</td><td class="left">${esc(reasons || '—')}</td>
    <td><button class="btn btn-sm btn-info" onclick="A.previewGroup(${i})">👁️ Xem</button> <button class="btn btn-sm btn-success" onclick="A.approve(${i})">✔ Duyệt</button> <button class="btn btn-sm btn-danger" onclick="A.reject(${i})">✖ Từ chối</button></td></tr>`; }).join('') || '<tr><td colspan="7">Không có bảng điểm nào chờ duyệt 🎉</td></tr>'}
  </tbody></table></div></div>`);
  A._pg = pg;
};
A.previewGroup = i => {
  const g = A._pg[i], R = rules();
  modal(`👁️ Lớp ${g.cid} – ${esc(subj(g.sub).name)} – HK${g.hk}`, `<div class="table-wrap"><table><thead><tr><th>Mã</th><th class="left">Họ tên</th>${Array.from({ length: R.txCols }, (_, k) => `<th>TX${k + 1}</th>`).join('')}<th>GK</th><th>CK</th><th>ĐTB</th><th>Điểm đã duyệt trước</th></tr></thead><tbody>
  ${g.keys.map(k => { const [sid] = k.split('|'), r = DB.scores[k], d = r.draft; return `<tr><td>${sid}</td><td class="left">${esc(stu(sid).name)}</td>${Array.from({ length: R.txCols }, (_, x) => `<td>${fmt((d.tx || [])[x])}</td>`).join('')}<td>${fmt(d.gk)}</td><td>${fmt(d.ck)}</td><td><b>${fmt(calcAvg(d))}</b></td><td>${r.pub ? fmt(calcAvg(r.pub)) : '—'}</td></tr>`; }).join('')}</tbody></table></div>`);
};
A.approve = i => {
  const g = A._pg[i];
  g.keys.forEach(k => { const r = DB.scores[k]; r.pub = clone(r.draft); r.status = 'approved'; r.rejectReason = ''; });
  addLog({ by: S.ref, byName: S.name, cid: g.cid, sub: g.sub, hk: g.hk, note: `BGH duyệt ${g.keys.length} bảng điểm lớp ${g.cid}` });
  saveDB(); toast('Đã duyệt và chốt điểm ✔'); go('duyet');
};
A.reject = i => modal('✖ Từ chối bảng điểm', '<textarea id="rj" rows="4" style="width:100%" placeholder="Nêu lý do để giáo viên chỉnh sửa..."></textarea>', 'Từ chối', () => {
  const t = val('rj').trim(); if (!t) { toast('Hãy nhập lý do từ chối', 'err'); return false; }
  const g = A._pg[i]; g.keys.forEach(k => { DB.scores[k].status = 'rejected'; DB.scores[k].rejectReason = t; });
  addLog({ by: S.ref, byName: S.name, cid: g.cid, sub: g.sub, hk: g.hk, note: `BGH từ chối lớp ${g.cid}: ${t}` }); saveDB(); toast('Đã từ chối, giáo viên sẽ chỉnh sửa lại', 'info'); go('duyet');
}, 'btn-danger');

PAGES.bgh.han = () => content(`${title('⏰', 'Thiết lập hạn bắt đầu nhập điểm và chốt')}
  ${[1, 2].map(hk => `<div class="card"><h3>Học kỳ ${hk} ${hkSet(hk).locked ? '<span class="badge b-kem">Đang khóa (do Quản trị viên)</span>' : '<span class="badge b-tot">Đang mở</span>'}</h3>
  <div class="form-grid"><label>Bắt đầu nhập điểm<input type="date" id="hs${hk}" value="${hkSet(hk).start}"></label><label>Hạn chốt điểm<input type="date" id="he${hk}" value="${hkSet(hk).end}"></label></div><br>
  <button class="btn btn-success" onclick="A.saveWindow(${hk})">💾 Lưu hạn học kỳ ${hk}</button></div>`).join('')}`);
A.saveWindow = hk => {
  const s = val('hs' + hk), e = val('he' + hk);
  if (!s || !e || s > e) return toast('Khoảng thời gian không hợp lệ', 'err');
  hkSet(hk).start = s; hkSet(hk).end = e; addLog({ by: S.ref, byName: S.name, hk, note: `Đặt hạn nhập điểm HK${hk}: ${fmtDate(s)} → ${fmtDate(e)}` }); saveDB(); toast('Đã lưu hạn nhập điểm');
};

function computeReport(scope, hk) {
  let list = DB.students;
  if (scope.startsWith('K')) list = list.filter(s => cls(s.classId).grade === +scope.slice(1));
  else if (scope !== 'all') list = list.filter(s => s.classId === scope);
  const cnt = { 'Giỏi': 0, 'Khá': 0, 'Trung bình': 0, 'Yếu': 0, 'Kém': 0, '—': 0 };
  const rows = list.map(s => { const r = hkResult(s.id, hk); cnt[r.hl]++; return { s, avg: r.avg, hl: r.hl }; });
  return { rows, cnt, total: list.length };
}
PAGES.bgh.baocao = () => {
  const scope = state.scope || 'all'; const rp = computeReport(scope, state.hk);
  const colors = ['#2e9e5b', '#1e88e5', '#f59e0b', '#ef6c00', '#e53935'];
  const scopeOpts = [['all', 'Toàn trường'], ['K10', 'Khối 10'], ['K11', 'Khối 11'], ['K12', 'Khối 12'], ...DB.classes.map(c => [c.id, 'Lớp ' + c.id])];
  const low = rp.rows.filter(x => x.avg !== null && x.avg < rules().tb).sort((a, b) => a.avg - b.avg);
  content(`${title('📈', 'Báo cáo tổng hợp kết quả học tập')}<div class="card"><div class="toolbar">
    <select onchange="state.scope=this.value;go('baocao')">${opts(scopeOpts, scope)}</select>${hkSelect()}<span class="grow"></span>
    <button class="btn btn-info btn-sm" onclick="A.expReport()">⬇️ Xuất file CSV</button><button class="btn btn-purple btn-sm" onclick="window.print()">🖨️ In báo cáo</button></div>
  <h3>Tỷ lệ học sinh theo xếp loại – ${scopeOpts.find(o => o[0] === scope)[1]} – HK${state.hk} (${DB.settings.year})</h3>
  ${Object.entries(rp.cnt).filter(([k]) => k !== '—').map(([k, v], i) => `<div class="bar-row"><span class="lbl">${k}</span><div class="bar"><i style="width:${rp.total ? v / rp.total * 100 : 0}%;background:${colors[i]}"></i></div><span class="val">${v} HS (${rp.total ? (v / rp.total * 100).toFixed(1) : 0}%)</span></div>`).join('')}
  <p><small>Tổng ${rp.total} học sinh · ${rp.cnt['—']} học sinh chưa đủ điểm đã duyệt (không tính xếp loại).</small></p></div>
  <div class="card"><h3>⚠️ Học sinh có điểm trung bình thấp (&lt; ${rules().tb})</h3><div class="table-wrap"><table><thead><tr><th>Lớp</th><th>Mã</th><th class="left">Họ tên</th><th>ĐTB</th><th>Học lực</th></tr></thead><tbody>
  ${low.map(x => `<tr><td>${x.s.classId}</td><td>${x.s.id}</td><td class="left">${esc(x.s.name)}</td><td><b>${fmt(x.avg)}</b></td><td>${badge(x.hl)}</td></tr>`).join('') || '<tr><td colspan="5">Không có học sinh nào 🎉</td></tr>'}</tbody></table></div></div>
  <div class="card"><h3>📊 Tổng hợp theo lớp</h3><div class="table-wrap"><table><thead><tr><th>Lớp</th><th>Sĩ số</th><th>Giỏi</th><th>Khá</th><th>TB</th><th>Yếu</th><th>Kém</th><th>Chưa đủ điểm</th></tr></thead><tbody>
  ${DB.classes.map(c => { const r = computeReport(c.id, state.hk); return `<tr><td><b>${c.id}</b></td><td>${r.total}</td><td>${r.cnt['Giỏi']}</td><td>${r.cnt['Khá']}</td><td>${r.cnt['Trung bình']}</td><td>${r.cnt['Yếu']}</td><td>${r.cnt['Kém']}</td><td>${r.cnt['—']}</td></tr>`; }).join('')}</tbody></table></div></div>`);
};
A.expReport = () => {
  const rp = computeReport(state.scope || 'all', state.hk);
  dl(`bao-cao-HK${state.hk}.csv`, [['Lớp', 'Mã HS', 'Họ tên', 'ĐTB', 'Học lực'], ...rp.rows.map(x => [x.s.classId, x.s.id, x.s.name, x.avg ?? '', x.hl])]);
};

/* ============================== QUẢN TRỊ VIÊN ============================== */
PAGES.admin.home = () => content(`${title('🏠', 'Tổng quan – Quản trị viên')}
  <div class="grid-cards"><div class="stat s-blue">Tài khoản<b>${DB.users.length}</b></div><div class="stat s-green">Học sinh<b>${DB.students.length}</b></div><div class="stat s-purple">Giáo viên<b>${DB.teachers.length}</b></div>
  <div class="stat s-orange">Lớp<b>${DB.classes.length}</b></div><div class="stat s-red">Tài khoản bị khóa<b>${DB.users.filter(u => u.locked).length}</b></div></div>
  <div class="card"><h3>⚡ Truy cập nhanh</h3><div class="shortcuts">
  <button class="btn btn-primary" onclick="go('taikhoan')"><span>🔑</span>Tài khoản</button><button class="btn btn-success" onclick="go('hocsinh')"><span>🧑‍🎓</span>Học sinh</button>
  <button class="btn btn-purple" onclick="go('phancong')"><span>🗂️</span>Phân công</button><button class="btn btn-warn" onclick="go('kyhoc')"><span>🔒</span>Khóa/mở điểm</button>
  <button class="btn btn-pink" onclick="go('quydinh')"><span>⚙️</span>Quy định</button></div></div>
  <div class="notice warn">⚠️ Quản trị viên và Ban giám hiệu <b>không</b> có quyền nhập/sửa điểm – chỉ giáo viên bộ môn được tác động lên điểm.</div>`);

PAGES.admin.taikhoan = () => {
  const f = state.uf || { q: '', role: '' };
  const list = DB.users.filter(u => (!f.role || u.role === f.role) && (u.username + ' ' + u.name).toLowerCase().includes(f.q.toLowerCase())).slice(0, 200);
  content(`${title('🔑', 'Quản lý tài khoản & phân quyền')}<div class="card"><div class="toolbar">
  <input placeholder="🔍 Tìm tài khoản / tên" value="${esc(f.q)}" oninput="state.uf={q:this.value,role:state.uf?state.uf.role:''};A.keepFocus('taikhoan')">
  <select onchange="state.uf={q:state.uf?state.uf.q:'',role:this.value};go('taikhoan')">${opts([['', 'Tất cả vai trò'], ...Object.entries(ROLE_NAME)], f.role)}</select><span class="grow"></span>
  <button class="btn btn-success" onclick="A.addTeacher()">➕ Thêm giáo viên</button></div>
  <div class="table-wrap"><table><thead><tr><th class="left">Tên đăng nhập</th><th class="left">Họ tên</th><th>Vai trò</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>
  ${list.map(u => `<tr><td class="left"><b>${esc(u.username)}</b></td><td class="left">${esc(u.name)}</td>
  <td>${u.role === 'hs' ? 'Học sinh' : `<select onchange="A.setRole('${u.username}',this.value)">${opts([['gv', 'Giáo viên'], ['bgh', 'Ban giám hiệu'], ['admin', 'Quản trị viên']], u.role)}</select>`}</td>
  <td>${u.locked ? '<span class="badge b-kem">Đã khóa</span>' : '<span class="badge b-tot">Hoạt động</span>'}</td>
  <td><button class="btn btn-sm btn-warn" onclick="A.resetPw('${u.username}')">🔄 Cấp lại MK</button> <button class="btn btn-sm ${u.locked ? 'btn-success' : 'btn-danger'}" onclick="A.toggleLock('${u.username}')">${u.locked ? '🔓 Mở khóa' : '🔒 Khóa'}</button></td></tr>`).join('')}
  </tbody></table></div><p><small>Hiển thị tối đa 200 tài khoản. Mật khẩu cấp lại mặc định: 123.</small></p></div>`);
};
A.keepFocus = p => { go(p); const i = document.querySelector('.toolbar input'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } };
A.setRole = (u, r) => { const x = DB.users.find(a => a.username === u); if (x.username === S.username && r !== 'admin') { toast('Không thể tự hạ quyền chính mình', 'err'); return go('taikhoan'); } x.role = r; saveDB(); toast('Đã cập nhật phân quyền'); };
A.resetPw = u => { if (confirm('Cấp lại mật khẩu về 123 cho ' + u + '?')) { DB.users.find(a => a.username === u).password = '123'; saveDB(); toast('Đã cấp lại mật khẩu: 123'); } };
A.toggleLock = u => { const x = DB.users.find(a => a.username === u); if (x.username === S.username) return toast('Không thể khóa chính mình', 'err'); x.locked = !x.locked; saveDB(); go('taikhoan'); };
A.addTeacher = () => modal('➕ Thêm giáo viên', `<div class="form-grid"><label>Họ và tên<input id="tn"></label><label>Tổ bộ môn<input id="tt" placeholder="VD: Tổ Toán – Tin"></label></div><p><small>Tài khoản được tạo tự động, mật khẩu mặc định 123.</small></p>`, 'Thêm', () => {
  const n = val('tn').trim(); if (!n) { toast('Nhập họ tên', 'err'); return false; }
  let k = DB.teachers.length + 1, id; do { id = 'gv' + pad(k++); } while (DB.users.some(u => u.username === id));
  DB.teachers.push({ id, name: n, tobm: val('tt').trim() }); DB.users.push({ username: id, password: '123', role: 'gv', name: n, ref: id, locked: false }); saveDB(); toast('Đã tạo tài khoản ' + id); go('taikhoan');
});

PAGES.admin.hocsinh = () => {
  const q = (state.sq || '').toLowerCase(), cf = state.sc || '';
  const list = DB.students.filter(s => (!cf || s.classId === cf) && (s.id + ' ' + s.name).toLowerCase().includes(q));
  content(`${title('🧑‍🎓', 'Danh sách học sinh')}<div class="card"><div class="toolbar">
  <input placeholder="🔍 Tìm mã / tên" value="${esc(state.sq || '')}" oninput="state.sq=this.value;A.keepFocus('hocsinh')">
  <select onchange="state.sc=this.value;go('hocsinh')">${opts([['', 'Tất cả lớp'], ...DB.classes.map(c => [c.id, 'Lớp ' + c.id])], cf)}</select><span class="grow"></span>
  <button class="btn btn-success" onclick="A.studentForm()">➕ Thêm học sinh</button></div>
  <div class="table-wrap"><table><thead><tr><th>Mã HS</th><th class="left">Họ tên</th><th>Lớp</th><th>STT</th><th>Ngày sinh</th><th>Giới tính</th><th>Thao tác</th></tr></thead><tbody>
  ${list.map(s => `<tr><td><b>${s.id}</b></td><td class="left">${esc(s.name)}</td><td>${s.classId}</td><td>${s.stt}</td><td>${fmtDate(s.dob)}</td><td>${s.gender}</td>
  <td><button class="btn btn-sm btn-info" onclick="A.studentForm('${s.id}')">✏️ Sửa</button> <button class="btn btn-sm btn-danger" onclick="A.delStudent('${s.id}')">🗑️ Xóa</button></td></tr>`).join('')}
  </tbody></table></div><p><small>Mã học sinh = [C: lớp 10 · B: lớp 11 · A: lớp 12] + số lớp + STT (2 chữ số). VD: C124 = lớp 10-1, STT 24. Mật khẩu mặc định: 123.</small></p></div>`);
};
A.studentForm = id => {
  const s = id ? stu(id) : { name: '', dob: '2011-01-01', gender: 'Nam', classId: DB.classes[0] && DB.classes[0].id };
  modal(id ? '✏️ Sửa học sinh ' + id : '➕ Thêm học sinh', `<div class="form-grid"><label>Họ và tên<input id="sn" value="${esc(s.name)}"></label><label>Ngày sinh<input id="sd" type="date" value="${s.dob}"></label>
  <label>Giới tính<select id="sg">${opts([['Nam', 'Nam'], ['Nữ', 'Nữ']], s.gender)}</select></label>
  ${id ? '' : `<label>Lớp<select id="sc">${opts(DB.classes.map(c => [c.id, c.id]), s.classId)}</select></label>`}</div>`, 'Lưu', () => {
    const n = val('sn').trim(); if (!n || !val('sd')) { toast('Nhập đủ họ tên và ngày sinh', 'err'); return false; }
    if (id) { Object.assign(s, { name: n, dob: val('sd'), gender: val('sg') }); DB.users.find(u => u.ref === id && u.role === 'hs').name = n; }
    else {
      const c = cls(val('sc')), stt = Math.max(0, ...studentsOf(c.id).map(x => x.stt)) + 1, nid = GRADE_LETTER[c.grade] + c.num + pad(stt);
      DB.students.push({ id: nid, stt, classId: c.id, name: n, dob: val('sd'), gender: val('sg') });
      DB.users.push({ username: nid, password: '123', role: 'hs', name: n, ref: nid, locked: false }); toast('Đã tạo học sinh, mã: ' + nid);
    }
    saveDB(); go('hocsinh');
  });
};
A.delStudent = id => { if (!confirm('Xóa học sinh ' + id + ' cùng toàn bộ điểm?')) return; DB.students = DB.students.filter(s => s.id !== id); DB.users = DB.users.filter(u => u.ref !== id); Object.keys(DB.scores).filter(k => k.startsWith(id + '|')).forEach(k => delete DB.scores[k]); saveDB(); go('hocsinh'); };

PAGES.admin.lop = () => content(`${title('🏫', 'Lớp học & giáo viên chủ nhiệm')}<div class="card"><div class="toolbar"><span class="grow"></span><button class="btn btn-success" onclick="A.addClass()">➕ Thêm lớp</button></div>
  <div class="table-wrap"><table><thead><tr><th>Lớp</th><th>Khối</th><th>Sĩ số</th><th>Giáo viên chủ nhiệm</th><th>Thao tác</th></tr></thead><tbody>
  ${DB.classes.map(c => `<tr><td><b>${c.id}</b></td><td>${c.grade}</td><td>${studentsOf(c.id).length}</td><td><select onchange="A.setGvcn('${c.id}',this.value)">${opts([['', '— Chưa có —'], ...DB.teachers.map(t => [t.id, t.name])], c.gvcn)}</select></td>
  <td><button class="btn btn-sm btn-danger" onclick="A.delClass('${c.id}')">🗑️ Xóa</button></td></tr>`).join('')}</tbody></table></div></div>`);
A.setGvcn = (c, t) => { cls(c).gvcn = t; saveDB(); toast('Đã cập nhật GVCN'); };
A.addClass = () => modal('➕ Thêm lớp', `<div class="form-grid"><label>Khối<select id="cg">${opts([[10, 'Khối 10'], [11, 'Khối 11'], [12, 'Khối 12']], 10)}</select></label><label>Số lớp<input id="cn" type="number" min="1" value="1"></label></div>`, 'Thêm', () => {
  const g = +val('cg'), n = +val('cn'), id = `${g}-${n}`; if (!n || cls(id)) { toast('Lớp đã tồn tại hoặc không hợp lệ', 'err'); return false; }
  DB.classes.push({ id, grade: g, num: n, gvcn: '' }); DB.subjects.forEach(s => { const a = DB.assign.find(x => x.sub === s.id); if (a) DB.assign.push({ classId: id, sub: s.id, teacher: a.teacher }); }); saveDB(); go('lop');
});
A.delClass = id => { if (studentsOf(id).length) return toast('Lớp còn học sinh, không thể xóa', 'err'); DB.classes = DB.classes.filter(c => c.id !== id); DB.assign = DB.assign.filter(a => a.classId !== id); saveDB(); go('lop'); };

PAGES.admin.mon = () => content(`${title('📚', 'Môn học')}<div class="card"><div class="toolbar"><input id="ms" placeholder="Tên môn học mới"><button class="btn btn-success" onclick="A.addSubject()">➕ Thêm môn</button></div>
  <div class="table-wrap"><table><thead><tr><th>Mã môn</th><th class="left">Tên môn</th><th>Thao tác</th></tr></thead><tbody>${DB.subjects.map(s => `<tr><td>${s.id}</td><td class="left">${esc(s.name)}</td><td><button class="btn btn-sm btn-danger" onclick="A.delSubject('${s.id}')">🗑️ Xóa</button></td></tr>`).join('')}</tbody></table></div></div>`);
A.addSubject = () => {
  const n = val('ms').trim(); if (!n) return toast('Nhập tên môn', 'err');
  const id = n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '') || 'mon' + Date.now();
  if (subj(id)) return toast('Môn học đã tồn tại', 'err'); DB.subjects.push({ id, name: n }); saveDB(); go('mon');
};
A.delSubject = id => { if (!confirm('Xóa môn học và toàn bộ điểm của môn?')) return; DB.subjects = DB.subjects.filter(s => s.id !== id); DB.assign = DB.assign.filter(a => a.sub !== id); Object.keys(DB.scores).filter(k => k.split('|')[1] === id).forEach(k => delete DB.scores[k]); saveDB(); go('mon'); };

PAGES.admin.phancong = () => {
  const cf = state.pc || '';
  const list = DB.assign.filter(a => !cf || a.classId === cf).sort((a, b) => a.classId.localeCompare(b.classId));
  content(`${title('🗂️', 'Phân công giảng dạy')}<div class="card"><div class="toolbar"><select onchange="state.pc=this.value;go('phancong')">${opts([['', 'Tất cả lớp'], ...DB.classes.map(c => [c.id, 'Lớp ' + c.id])], cf)}</select><span class="grow"></span>
  <button class="btn btn-success" onclick="A.addAssign()">➕ Thêm phân công</button></div>
  <div class="table-wrap"><table><thead><tr><th>Lớp</th><th>Môn</th><th>Giáo viên phụ trách (HK1 & HK2)</th><th>Thao tác</th></tr></thead><tbody>
  ${list.map(a => `<tr><td>${a.classId}</td><td>${esc(subj(a.sub).name)}</td><td><select onchange="A.chgAssign('${a.classId}','${a.sub}',this.value)">${opts(DB.teachers.map(t => [t.id, t.name]), a.teacher)}</select></td>
  <td><button class="btn btn-sm btn-danger" onclick="A.delAssign('${a.classId}','${a.sub}')">🗑️</button></td></tr>`).join('')}</tbody></table></div></div>`);
};
A.chgAssign = (c, s, t) => { DB.assign.find(a => a.classId === c && a.sub === s).teacher = t; saveDB(); toast('Đã đổi giáo viên'); };
A.delAssign = (c, s) => { DB.assign = DB.assign.filter(a => !(a.classId === c && a.sub === s)); saveDB(); go('phancong'); };
A.addAssign = () => modal('➕ Thêm phân công', `<div class="form-grid"><label>Lớp<select id="pl">${opts(DB.classes.map(c => [c.id, c.id]), '')}</select></label><label>Môn<select id="pm">${opts(DB.subjects.map(s => [s.id, s.name]), '')}</select></label>
  <label>Giáo viên<select id="pt">${opts(DB.teachers.map(t => [t.id, t.name]), '')}</select></label></div>`, 'Thêm', () => {
  if (DB.assign.some(a => a.classId === val('pl') && a.sub === val('pm'))) { toast('Lớp–môn này đã được phân công', 'err'); return false; }
  DB.assign.push({ classId: val('pl'), sub: val('pm'), teacher: val('pt') }); saveDB(); go('phancong');
});

PAGES.admin.kyhoc = () => content(`${title('🗓️', 'Năm học, học kỳ & khóa nhập điểm')}
  <div class="card"><h3>Năm học hiện hành</h3><div class="toolbar"><input id="yr" value="${esc(DB.settings.year)}"><button class="btn btn-success" onclick="DB.settings.year=val('yr');saveDB();$('#yearChip').textContent='Năm học '+DB.settings.year;toast('Đã lưu năm học')">💾 Lưu</button></div></div>
  ${[1, 2].map(hk => `<div class="card"><h3>Học kỳ ${hk} ${hkSet(hk).locked ? '<span class="badge b-kem">Đang khóa nhập/sửa điểm</span>' : '<span class="badge b-tot">Đang mở nhập/sửa điểm</span>'}</h3>
  <p>Hạn nhập điểm (do BGH giao): <b>${fmtDate(hkSet(hk).start)} → ${fmtDate(hkSet(hk).end)}</b></p>
  <button class="btn ${hkSet(hk).locked ? 'btn-success' : 'btn-danger'}" onclick="A.toggleHk(${hk})">${hkSet(hk).locked ? '🔓 Mở nhập/sửa điểm' : '🔒 Khóa nhập/sửa điểm'}</button></div>`).join('')}`);
A.toggleHk = hk => { hkSet(hk).locked = !hkSet(hk).locked; addLog({ by: S.ref, byName: S.name, hk, note: (hkSet(hk).locked ? 'Khóa' : 'Mở') + ` nhập điểm HK${hk}` }); saveDB(); go('kyhoc'); };

PAGES.admin.quydinh = () => {
  const R = rules(), f = (id, l, v, st = '1') => `<label>${l}<input id="${id}" type="number" step="${st}" min="0" value="${v}"></label>`;
  content(`${title('⚙️', 'Quy định tính điểm & xếp loại')}<div class="card"><h3>Cột điểm & hệ số</h3><div class="form-grid">
  ${f('r_tx', 'Số cột điểm thường xuyên', R.txCols)}${f('r_wtx', 'Hệ số điểm thường xuyên', R.wTx)}${f('r_wgk', 'Hệ số giữa kỳ', R.wGk)}${f('r_wck', 'Hệ số cuối kỳ', R.wCk)}${f('r_h1', 'Hệ số ĐTB HK1', R.wHk1)}${f('r_h2', 'Hệ số ĐTB HK2', R.wHk2)}</div>
  <h3 style="margin-top:18px">Ngưỡng xếp loại học lực (ĐTB ≥)</h3><div class="form-grid">
  ${f('r_g', 'Giỏi', R.gioi, '0.1')}${f('r_k', 'Khá', R.kha, '0.1')}${f('r_t', 'Trung bình', R.tb, '0.1')}${f('r_y', 'Yếu', R.yeu, '0.1')}</div>
  <p><small>Công thức: ĐTB môn HK = (Σ TX×hệ số + GK×hệ số + CK×hệ số) ÷ tổng hệ số · ĐTB cả năm = (HK1×h1 + HK2×h2) ÷ (h1+h2). Dưới ngưỡng Yếu là loại Kém. Thay đổi số cột TX sẽ ảnh hưởng đến điểm đã nhập.</small></p>
  <button class="btn btn-success" onclick="A.saveRules()">💾 Lưu quy định</button></div>`);
};
A.saveRules = () => {
  const n = id => Number(val(id)), R = { txCols: n('r_tx'), wTx: n('r_wtx'), wGk: n('r_wgk'), wCk: n('r_wck'), wHk1: n('r_h1'), wHk2: n('r_h2'), gioi: n('r_g'), kha: n('r_k'), tb: n('r_t'), yeu: n('r_y') };
  if (R.txCols < 1 || R.txCols > 6 || [R.wTx, R.wGk, R.wCk, R.wHk1, R.wHk2].some(x => !(x > 0))) return toast('Số cột TX từ 1–6 và hệ số phải > 0', 'err');
  if (!(R.gioi > R.kha && R.kha > R.tb && R.tb > R.yeu)) return toast('Ngưỡng xếp loại phải giảm dần: Giỏi > Khá > TB > Yếu', 'err');
  DB.settings.rules = R; saveDB(); toast('Đã lưu quy định tính điểm');
};

/* ----------------------------- KHỞI ĐỘNG ----------------------------- */
loadDB();
const saved = sessionStorage.getItem('ht_user');
if (saved) { const u = DB.users.find(x => x.username === saved); if (u && !u.locked) { S = u; enterApp(); } }