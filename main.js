const SB_URL = "https://udxlfpdekfiasaclbgzx.supabase.co";
const SB_KEY = "sb_publishable_sDNeViN0pnjCk3qiENGxGw_8GVb1R4t";
const SB_BUCKET = "payment-proofs";
const EJ_SVC = "service_yqxlth8";
const EJ_TPL = "template_ge6fbmm";
const EJ_KEY = "4Pfej9tJc7yGqsj1_";
const PASS = "SUcamp2026";
const FEES = { Adult: 2500, Youth: 2000, Children: 1500 };

const sb = supabase.createClient(SB_URL, SB_KEY);
emailjs.init({ publicKey: EJ_KEY });

let curFilter = "all",
  allRegs = [],
  selFile = null;

function fileSelect(inp) {
  const f = inp.files[0];
  if (!f) return;
  if (f.size > 5 * 1024 * 1024) {
    alert("File too large. Max 5MB.");
    inp.value = "";
    return;
  }
  selFile = f;
  document.getElementById("pfname").textContent = f.name;
  document.getElementById("upprev").style.display = "flex";
  document.querySelector(".upzone").style.background = "var(--g2)";
}
function rmFile() {
  selFile = null;
  document.getElementById("pfile").value = "";
  document.getElementById("upprev").style.display = "none";
  document.querySelector(".upzone").style.background = "var(--g1)";
}
function alert2(id, type, msg) {
  document.getElementById(id).innerHTML =
    `<div class="alert ${type === "error" ? "ae" : "as"}">${msg}</div>`;
}
function clearA(id) {
  document.getElementById(id).innerHTML = "";
}

function showView(n) {
  document
    .querySelectorAll(".view")
    .forEach((v) => v.classList.remove("active"));
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  if (n === "admin-gate") {
    const ok = sessionStorage.getItem("su_admin");
    document
      .getElementById(ok ? "view-admin" : "view-admin-gate")
      .classList.add("active");
    if (ok) loadRegs();
  } else {
    document.getElementById("view-" + n).classList.add("active");
  }
  document
    .querySelectorAll(".tab")
    [n === "register" ? 0 : 1].classList.add("active");
}

function adminLogin() {
  if (document.getElementById("admin-pass").value === PASS) {
    sessionStorage.setItem("su_admin", "1");
    document.getElementById("view-admin-gate").classList.remove("active");
    document.getElementById("view-admin").classList.add("active");
    loadRegs();
  } else {
    alert2("login-alert", "error", "Incorrect password. Please try again.");
  }
}

function catChange() {
  const c = document.getElementById("r-category").value;
  const iy = c === "Youth",
    ic = c === "Children",
    ns = iy || ic;
  tf("f-school", ns);
  tf("f-class", ns);
  tf("f-gname", ic);
  tf("f-gphone", ic);
  if (c) {
    document.getElementById("fee-def").style.display = "none";
    document.getElementById("fee-sel").style.display = "block";
    document.getElementById("fcat").textContent = c;
    document.getElementById("famt").textContent =
      "₦" + FEES[c].toLocaleString();
  } else {
    document.getElementById("fee-def").style.display = "block";
    document.getElementById("fee-sel").style.display = "none";
  }
}
function tf(id, show) {
  const el = document.getElementById(id);
  show ? el.classList.add("vis") : el.classList.remove("vis");
}

async function submitReg() {
  clearA("reg-alert");
  const btn = document.getElementById("reg-btn");
  const name = document.getElementById("r-name").value.trim();
  const gender = document.getElementById("r-gender").value;
  const phone = document.getElementById("r-phone").value.trim();
  const email = document.getElementById("r-email").value.trim();
  const group = document.getElementById("r-group").value;
  const cat = document.getElementById("r-category").value;
  const iy = cat === "Youth",
    ic = cat === "Children";
  const school =
    iy || ic ? document.getElementById("r-school").value.trim() : "";
  const cls = iy || ic ? document.getElementById("r-class").value.trim() : "";
  const gname = ic ? document.getElementById("r-gname").value.trim() : "";
  const gphone = ic ? document.getElementById("r-gphone").value.trim() : "";

  if (!name || !gender || !phone || !email || !group || !cat) {
    alert2("reg-alert", "error", "Please fill in all required fields.");
    return;
  }
  if (!email.includes("@")) {
    alert2("reg-alert", "error", "Please enter a valid email address.");
    return;
  }
  if ((iy || ic) && (!school || !cls)) {
    alert2("reg-alert", "error", "Please fill in school and class.");
    return;
  }
  if (ic && (!gname || !gphone)) {
    alert2("reg-alert", "error", "Please fill in guardian details.");
    return;
  }
  if (!selFile) {
    alert2("reg-alert", "error", "Please upload your proof of payment.");
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="sp"></span>Uploading receipt...';
  try {
    const ext = selFile.name.split(".").pop();
    const fp = Date.now() + "_" + name.replace(/\s+/g, "_") + "." + ext;
    const { error: ue } = await sb.storage.from(SB_BUCKET).upload(fp, selFile);
    if (ue) throw ue;
    const { data: ud } = sb.storage.from(SB_BUCKET).getPublicUrl(fp);
    btn.innerHTML = '<span class="sp"></span>Saving registration...';
    const { error: ie } = await sb.from("registrations").insert([
      {
        full_name: name,
        gender,
        phone,
        email,
        group_name: group,
        category: cat,
        fee: FEES[cat],
        school: school || null,
        class_level: cls || null,
        guardian_name: gname || null,
        guardian_phone: gphone || null,
        proof_url: ud.publicUrl,
        status: "pending",
        created_at: new Date().toISOString(),
      },
    ]);
    if (ie) throw ie;
    alert2(
      "reg-alert",
      "success",
      "Registration submitted! Your payment will be verified and a confirmation email sent to " +
        email +
        ".",
    );
    document
      .querySelectorAll("#view-register input,#view-register select")
      .forEach((el) => {
        el.value = "";
      });
    document
      .querySelectorAll(".cond")
      .forEach((el) => el.classList.remove("vis"));
    document.getElementById("fee-sel").style.display = "none";
    document.getElementById("fee-def").style.display = "block";
    rmFile();
  } catch (e) {
    alert2("reg-alert", "error", "Submission failed: " + e.message);
  }
  btn.disabled = false;
  btn.innerHTML = "Submit Registration";
}

async function loadRegs() {
  document.getElementById("reg-list").innerHTML =
    '<div class="empty">Loading...</div>';
  const { data, error } = await sb
    .from("registrations")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    document.getElementById("reg-list").innerHTML =
      `<div class="alert ae">${error.message}</div>`;
    return;
  }
  allRegs = data || [];
  updateStats();
  renderList();
}

function updateStats() {
  const conf = allRegs.filter((r) => r.status === "confirmed");
  const rev = conf.reduce((s, r) => s + (r.fee || 0), 0);
  document.getElementById("st-total").textContent = allRegs.length;
  document.getElementById("st-pending").textContent = allRegs.filter(
    (r) => r.status === "pending",
  ).length;
  document.getElementById("st-confirmed").textContent = conf.length;
  document.getElementById("st-revenue").textContent =
    rev >= 1000 ? "₦" + Math.round(rev / 1000) + "k" : "₦" + rev;
}

function setFilter(f, btn) {
  curFilter = f;
  document
    .querySelectorAll(".fbtn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  renderList();
}

function renderList() {
  const list =
    curFilter === "all"
      ? allRegs
      : allRegs.filter((r) => r.status === curFilter);
  const el = document.getElementById("reg-list");
  if (!list.length) {
    el.innerHTML = '<div class="empty">No registrations found.</div>';
    return;
  }
  el.innerHTML = list
    .map((r) => {
      const isImg =
        r.proof_url && /\.(jpg|jpeg|png|webp|gif)$/i.test(r.proof_url);
      const safe = encodeURIComponent(JSON.stringify(r));
      return `<div class="rc" id="rc-${r.id}">
      <div class="rctop">
        <div><div class="rname">${r.full_name}</div><div class="rmeta">${r.category} · ${r.group_name} · ${r.gender}</div></div>
        <span class="badge ${r.status === "pending" ? "bp" : r.status === "confirmed" ? "bc" : "br"}">${r.status}</span>
      </div>
      <div class="rd">Email: <span>${r.email}</span> &nbsp; Phone: <span>${r.phone}</span></div>
      <div class="rd">Fee: <span>₦${r.fee.toLocaleString()}</span></div>
      ${r.school ? `<div class="rd">School: <span>${r.school}</span> &nbsp; Class: <span>${r.class_level}</span></div>` : ""}
      ${r.guardian_name ? `<div class="rd">Guardian: <span>${r.guardian_name}</span> — <span>${r.guardian_phone}</span></div>` : ""}
      ${r.proof_url ? (isImg ? `<img src="${r.proof_url}" class="pthumb" alt="Receipt">` : `<div style="margin-top:.5rem"><a href="${r.proof_url}" target="_blank" style="color:var(--g7);font-size:.82rem">View receipt (PDF)</a></div>`) : ""}
      <div style="font-size:.72rem;color:var(--mu);margin-top:.4rem">${new Date(r.created_at).toLocaleString("en-NG")}</div>
      <div class="ract">
        ${
          r.status === "pending"
            ? `
          <button class="btn btnsm btnok" onclick="confirmReg('${r.id}',decodeURIComponent('${safe}'))">Confirm & Send Email</button>
          <button class="btn btnsm btnrj" onclick="rejectReg('${r.id}')">Reject</button>
        `
            : ""
        }
        <button class="btn btnsm" style="background:var(--rl);color:var(--red);border:1px solid #fca5a5;margin-left:auto" onclick="deleteReg('${r.id}')">Delete</button>
      </div>
    </div>`;
    })
    .join("");
}

async function confirmReg(id, str) {
  const reg = JSON.parse(str);
  const btn = document.querySelector(`#rc-${id} .btnok`);
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="sp"></span>Processing...';
  }
  try {
    const { error } = await sb
      .from("registrations")
      .update({ status: "confirmed" })
      .eq("id", id);
    if (error) throw error;
    await emailjs.send(EJ_SVC, EJ_TPL, {
      to_name: reg.full_name,
      email: reg.email,
      category: reg.category,
      group_name: reg.group_name,
      fee: "₦" + reg.fee.toLocaleString(),
      phone: reg.phone,
    });
    alert2(
      "admin-alert",
      "success",
      reg.full_name + " confirmed and email sent!",
    );
    setTimeout(() => clearA("admin-alert"), 5000);
    await loadRegs();
  } catch (e) {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = "Confirm & Send Email";
    }
    alert2("admin-alert", "error", "Error: " + e.message);
  }
}

async function rejectReg(id) {
  if (!confirm("Reject this registration?")) return;
  const { error } = await sb
    .from("registrations")
    .update({ status: "rejected" })
    .eq("id", id);
  if (error) {
    alert2("admin-alert", "error", "Could not reject: " + error.message);
    return;
  }
  await loadRegs();
}

async function deleteReg(id) {
  if (!confirm('Permanently delete this registration? This cannot be undone.')) return;
  const { error } = await sb.from('registrations').delete().eq('id', id);
  if (error) { alert2('admin-alert', 'error', 'Could not delete: ' + error.message); return; }
  alert2('admin-alert', 'success', 'Registration deleted.');
  setTimeout(() => clearA('admin-alert'), 4000);
  await loadRegs();
}

function downloadCSV() {
  if (!allRegs.length) { alert2('admin-alert', 'error', 'No records to download.'); return; }
  const headers = ['Full Name','Gender','Phone','Email','Group','Category','Fee','School','Class','Guardian Name','Guardian Phone','Status','Date Registered'];
  const rows = allRegs.map(r => [
    r.full_name, r.gender, r.phone, r.email, r.group_name, r.category,
    r.fee, r.school || '', r.class_level || '', r.guardian_name || '',
    r.guardian_phone || '', r.status,
    new Date(r.created_at).toLocaleString('en-NG')
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'SU_Camp_2026_Registrations.csv';
  a.click(); URL.revokeObjectURL(url);
}

