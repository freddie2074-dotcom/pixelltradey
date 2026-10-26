import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

const BUCKET = "kyc";
const MAX_MB = 5;
const DOC_TYPES = [
  { id: "passport", label: "Passport", back: false },
  { id: "national_id", label: "National ID Card", back: true },
  { id: "driver_license", label: "Driver's License", back: true },
];

const css = `
.vf {
  --bg: #0a0e1a;
  --surface: #121a2e;
  --border: #1f2842;
  --text: #8a93b3;
  --strong: #f2f4ff;
  --blue: var(--accent, #5b6ef5);
  --blue-bg: color-mix(in srgb, var(--blue) 12%, transparent);
  --blue-border: color-mix(in srgb, var(--blue) 28%, transparent);
  --green: #1fd18b;
  --red: #ff3b4e;
  --amber: #f5b13d;
  max-width: 760px;
  margin: 0 auto;
  padding: 15px 24px 48px;
  color: var(--text);
  box-sizing: border-box;
}
.vf *, .vf *::before, .vf *::after { box-sizing: border-box; }
.vf h1 { margin: 0 0 6px; font-size: 26px; font-weight: 700; color: var(--strong); }
.vf__sub { margin: 0 0 24px; font-size: 14px; }

/* ---------- top bar ---------- */
.vf__bar {
  display: flex; align-items: center; gap: 14px; margin-bottom: 16px; padding-bottom: 14px;
  font-size: 14px; color: var(--text);
}
.vf__back {
  display: grid; place-items: center; width: 34px; height: 34px; padding: 0; cursor: pointer;
  color: var(--text); background: none; border: 0; border-radius: 8px; transition: color .15s, background .15s;
}
.vf__back:hover { color: var(--strong); background: var(--surface); }
.vf__back svg { width: 20px; height: 20px; }

/* ---------- intro ---------- */
.vf__intro { max-width: 448px; margin: 0 auto; text-align: center; }
.vf__hero {
  display: grid; place-items: center; width: 64px; height: 64px; margin: 0 auto 26px;
  border-radius: 50%; color: var(--blue); background: var(--blue-bg); border: 1px solid var(--blue-border);
}
.vf__hero svg { width: 26px; height: 26px; }
.vf__intro h1 { margin: 0 0 16px; font-size: 26px; line-height: 1.2; }
.vf__lead { margin: 0 0 28px; font-size: 15px; line-height: 1.7; }
.vf__lead b { color: var(--strong); font-weight: 600; }
.vf__feat {
  display: flex; align-items: center; gap: 14px; margin-bottom: 12px; padding: 14px 16px; text-align: left;
  background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
}
.vf__feat-ic { flex-shrink: 0; width: 28px; font-size: 20px; line-height: 1; text-align: center; }
.vf__feat b { display: block; font-size: 14.5px; font-weight: 600; color: var(--strong); }
.vf__feat span { display: block; margin-top: 2px; font-size: 12.5px; }
.vf__privacy {
  display: flex; align-items: flex-start; gap: 12px; margin-top: 24px; padding: 14px 16px; text-align: left;
  font-size: 12.5px; line-height: 1.7; background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
}
.vf__privacy-ic { flex-shrink: 0; width: 28px; font-size: 18px; line-height: 1.5; text-align: center; }
.vf__privacy b { color: var(--strong); font-weight: 600; }
.vf__start {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  width: 100%; height: 44px; margin-top: 24px; font-family: inherit; font-size: 14px; font-weight: 600;
  color: #fff; background: var(--blue); border: 1px solid var(--blue); border-radius: 8px;
  cursor: pointer; transition: opacity .15s;
}
.vf__start:hover { opacity: .9; }
.vf__start svg { width: 16px; height: 16px; }

/* ---------- choose document type ---------- */
.vf__choose { max-width: 448px; margin: 8px auto 0; text-align: center; }
.vf__choose h1 { margin: 0 0 10px; font-size: 22px; line-height: 1.2; }
.vf__choose .vf__sub { margin: 0 0 30px; font-size: 14px; }
.vf__opt {
  display: flex; align-items: center; gap: 16px; width: 100%; height: 66px; margin-bottom: 12px; padding: 0 20px;
  font-family: inherit; font-size: 15px; font-weight: 500; text-align: left; cursor: pointer;
  color: var(--text); background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
  transition: border-color .15s, background .15s, color .15s;
}
.vf__opt:hover, .vf__opt:focus-visible, .vf__opt.is-on {
  color: var(--strong); background: var(--blue-bg); border-color: var(--blue); outline: none;
}
.vf__opt-ic { flex-shrink: 0; display: grid; place-items: center; width: 28px; color: var(--blue); }
.vf__opt .vf__opt-ic svg { width: 24px; height: 24px; }
.vf__opt-label { flex: 1; min-width: 0; }
.vf__opt svg { flex-shrink: 0; width: 16px; height: 16px; }

/* ---------- cards + form ---------- */
.vf__card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; margin-bottom: 20px; }
.vf__card h2 { margin: 0 0 14px; font-size: 15px; font-weight: 600; color: var(--strong); }
.vf__status { display: flex; gap: 14px; align-items: flex-start; }
.vf__badge {
  flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  width: 44px; height: 44px; border-radius: 50%; border: 1px solid;
}
.vf__badge svg { width: 22px; height: 22px; }
.vf__badge--pending { color: var(--amber); border-color: color-mix(in srgb, var(--amber) 35%, transparent); background: color-mix(in srgb, var(--amber) 12%, transparent); }
.vf__badge--approved { color: var(--green); border-color: color-mix(in srgb, var(--green) 35%, transparent); background: color-mix(in srgb, var(--green) 12%, transparent); }
.vf__badge--rejected { color: var(--red); border-color: color-mix(in srgb, var(--red) 35%, transparent); background: color-mix(in srgb, var(--red) 12%, transparent); }
.vf__status b { display: block; margin-bottom: 4px; font-size: 16px; color: var(--strong); }
.vf__status p { margin: 0; font-size: 13px; line-height: 1.5; }
.vf__row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.vf__label { display: block; margin: 16px 0 8px; font-size: 12px; font-weight: 500; }
.vf__row2 .vf__label, .vf__card h2 + .vf__label { margin-top: 0; }
.vf__field { margin-top: 16px; }
.vf__row2 .vf__field { margin-top: 0; }
.vf__field > .vf__label { margin-top: 0; }
.vf__input {
  width: 100%; height: 42px; padding: 0 14px; font-family: inherit; font-size: 14px;
  background: var(--bg); border: 1px solid var(--border); border-radius: 8px;
  color: var(--strong); outline: none; transition: border-color .15s;
}
.vf__input:focus { border-color: var(--blue-border); }
.vf__input::placeholder { color: var(--text); }
.vf__checks { margin: 0 0 24px; padding: 0; list-style: none; text-align: left; font-size: 12.5px; line-height: 1; }
.vf__checks li { display: flex; align-items: center; gap: 10px; height: 24px; }
.vf__checks li::before { content: "✓"; font-size: 13px; color: var(--green); }
.vf__shot {
  position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center;
  width: 100%; max-width: 382px; height: 216px; margin: 0 auto 24px; padding: 20px; text-align: center; cursor: pointer;
  background: var(--bg); border: 2px dashed #2f3a5c; border-radius: 16px; overflow: hidden;
  transition: border-color .15s;
}
.vf__shot:hover, .vf__shot:focus-within { border-color: var(--blue-border); }
.vf__shot svg { width: 34px; height: 34px; margin-bottom: 18px; color: var(--text); }
.vf__shot b { font-size: 14px; font-weight: 600; color: var(--text); }
.vf__shot span { margin-top: 12px; font-size: 12px; line-height: 1.5; }
.vf__shot input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
.vf__shot img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.vf__shot.has-file { border-style: solid; border-color: var(--blue-border); }
.vf__fname {
  position: absolute; left: 0; right: 0; bottom: 0; padding: 6px 8px; font-size: 11px;
  color: var(--strong); background: rgba(10,14,26,.85); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.vf__go {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  width: 100%; height: 40px; font-family: inherit; font-size: 14px; font-weight: 600;
  color: #fff; background: var(--blue); border: 1px solid var(--blue); border-radius: 8px;
  cursor: pointer; transition: opacity .15s;
}
.vf__go:hover:not(:disabled) { opacity: .9; }
.vf__go:disabled { opacity: .5; cursor: not-allowed; }
.vf__go svg { width: 16px; height: 16px; }
.vf__tips { margin: 16px 0 0; padding: 12px 14px 12px 30px; font-size: 12px; line-height: 1.6; border-radius: 8px; background: var(--blue-bg); border: 1px solid var(--blue-border); }
.vf__btn {
  width: 100%; height: 44px; margin-top: 18px; font-family: inherit; font-size: 14px; font-weight: 600;
  color: #fff; background: var(--blue); border: 1px solid var(--blue); border-radius: 8px;
  cursor: pointer; transition: opacity .15s;
}
.vf__btn:hover { opacity: .9; }
.vf__btn:disabled { opacity: .5; cursor: not-allowed; }
.vf__msg { margin-top: 14px; padding: 10px 12px; font-size: 13px; border-radius: 8px; border: 1px solid; }
.vf__msg--err { color: var(--red); border-color: color-mix(in srgb, var(--red) 35%, transparent); background: color-mix(in srgb, var(--red) 10%, transparent); }
.vf__reason { margin-top: 10px; padding: 10px 12px; font-size: 13px; border-radius: 8px; color: var(--red); background: color-mix(in srgb, var(--red) 10%, transparent); }

/* ---------- review step ---------- */
.vr { max-width: 448px; margin: 0 auto; text-align: center; }
.vr h1 { margin: 0 0 8px; font-size: 26px; line-height: 1.2; color: var(--strong); }
.vr .vf__sub { margin: 0 0 18px; line-height: 1.8; }
.vr__steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
.vr__step {
  display: flex; align-items: center; gap: 8px; padding: 10px 12px; text-align: left;
  font-size: 13px; font-weight: 600; color: var(--strong);
  background: #0f0f0f; border: 1px solid var(--border); border-radius: 10px;
}
.vr__step.is-active { border-color: color-mix(in srgb, var(--green) 45%, transparent); }
.vr__dot {
  flex-shrink: 0; display: grid; place-items: center; width: 22px; height: 22px;
  border-radius: 50%; background: var(--green); color: #04210f; font-size: 12px; font-weight: 700;
}
.vr__dot svg { width: 13px; height: 13px; stroke-width: 3; }
.vr__card {
  padding: 20px; text-align: left; background: #111; border: 1px solid var(--border); border-radius: 12px;
}
.vr__head { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; font-size: 17px; font-weight: 700; color: var(--strong); }
.vr__head svg { width: 18px; height: 18px; color: var(--green); }
.vr__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 18px; }
.vr__thumb { margin: 0; }
.vr__thumb .vr__img {
  display: grid; place-items: center; width: 100%; aspect-ratio: 3 / 2; overflow: hidden;
  font-size: 12px; background: var(--bg); border: 1px solid var(--border); border-radius: 8px;
}
.vr__thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.vr__thumb figcaption { margin-top: 8px; font-size: 13px; color: var(--text); }
.vr__fields { display: grid; gap: 12px; margin-bottom: 18px; }
.vr__note { margin: 0 0 18px; font-size: 13.5px; line-height: 1.6; color: var(--text); }
.vr__actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.vr__back, .vr__submit {
  display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 20px;
  font-family: inherit; font-size: 14px; font-weight: 600; border-radius: 8px; cursor: pointer;
}
.vr__back { color: var(--strong); background: #0f0f0f; border: 1px solid var(--border); }
.vr__back svg { width: 16px; height: 16px; }
.vr__submit { color: #04210f; background: var(--green); border: 1px solid var(--green); transition: opacity .15s; }
.vr__submit:hover:not(:disabled) { opacity: .9; }
.vr__submit:disabled { opacity: .5; cursor: not-allowed; }

@media (max-width: 600px) {
  .vf { padding: 8px 14px 32px; }
  .vf__row2 { grid-template-columns: 1fr; }
  .vf__row2 .vf__field + .vf__field { margin-top: 16px; }
  .vr__steps { grid-template-columns: 1fr; }
}
`;

const ICON_OK = <path d="m5 12 5 5L20 7" />;
const ICON_CLOCK = (
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </>
);
const ICON_X = <path d="M18 6 6 18M6 6l12 12" />;
const ICON_UP = (
  <>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="m17 8-5-5-5 5" />
    <path d="M12 3v12" />
  </>
);
const ICON_CAMERA = (
  <>
    <path d="M14.5 4h-5L8 6H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3z" />
    <circle cx="12" cy="13" r="3.5" />
  </>
);
const ICON_BACK = <path d="M19 12H5M12 19l-7-7 7-7" />;
const ICON_NEXT = <path d="m9 6 6 6-6 6" />;
const ICON_PASSPORT = (
  <>
    <rect x="5" y="2.5" width="14" height="19" rx="2" />
    <circle cx="12" cy="10" r="3.5" />
    <path d="M8.5 17h7" />
  </>
);
const ICON_ID = (
  <>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <circle cx="9" cy="11" r="2" />
    <path d="M6.2 16a3 3 0 0 1 5.6 0M15 10h3M15 14h3" />
  </>
);
const ICON_CAR = (
  <>
    <path d="M19 17h2a1 1 0 0 0 1-1v-3a2 2 0 0 0-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3A3 3 0 0 0 12 7H5a1.5 1.5 0 0 0-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4a1 1 0 0 0 1 1h2" />
    <circle cx="7" cy="17" r="2" />
    <path d="M9 17h6" />
    <circle cx="17" cy="17" r="2" />
  </>
);
const DOC_ICONS = { passport: ICON_PASSPORT, national_id: ICON_ID, driver_license: ICON_CAR };

function Icon({ children }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

function CaptureBox({ id, file, hint, onPick, live }) {
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreview(null);
  }, [file]);

  return (
    <label className={`vf__shot ${file ? "has-file" : ""}`} htmlFor={id}>
      {preview && <img src={preview} alt="" />}
      {!preview && (
        <>
          <Icon>{ICON_CAMERA}</Icon>
          <b>{file ? "File selected" : "Tap to open camera"}</b>
          <span>{file ? file.name : hint}</span>
        </>
      )}
      {preview && file && <span className="vf__fname">{file.name}</span>}
      <input
        id={id}
        type="file"
        accept={live ? "image/*" : "image/jpeg,image/png,image/webp,application/pdf"}
        {...(live ? { capture: "user" } : {})}
        onChange={(e) => onPick(e.target.files?.[0] || null)}
      />
    </label>
  );
}

function Thumb({ file, label }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (file && file.type.startsWith("image/")) {
      const u = URL.createObjectURL(file);
      setUrl(u);
      return () => URL.revokeObjectURL(u);
    }
    setUrl(null);
  }, [file]);

  if (!file) return null;
  return (
    <figure className="vr__thumb">
      <div className="vr__img">{url ? <img src={url} alt={label} /> : <span>{file.name}</span>}</div>
      <figcaption>{label}</figcaption>
    </figure>
  );
}

export default function Verify() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState("intro"); // intro | type | front | back | selfie | details

  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [front, setFront] = useState(null);
  const [back, setBack] = useState(null);
  const [selfie, setSelfie] = useState(null);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function load() {
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return;
      setUser(u);
      const { data, error } = await supabase
        .from("verifications")
        .select("*")
        .eq("user_id", u.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      setRecord(data?.[0] || null);
    } catch (e) {
      console.error("Failed to load verification:", e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function pick(setter) {
    return (file) => {
      setMsg(null);
      if (file && file.size > MAX_MB * 1024 * 1024) {
        setMsg({ text: `Each file must be under ${MAX_MB} MB.` });
        return;
      }
      setter(file);
    };
  }

  async function upload(file, tag) {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${user.id}/${Date.now()}-${tag}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) throw error;
    return path;
  }

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    if (!fullName.trim() || !country.trim() || !docNumber.trim()) {
      setMsg({ text: "Fill in your name, country and document number." });
      return;
    }
    if (!front || (docType.back && !back) || !selfie) {
      setMsg({ text: "Upload every photo listed above before submitting." });
      return;
    }
    setBusy(true);
    try {
      const frontPath = await upload(front, "front");
      const backPath = docType.back && back ? await upload(back, "back") : null;
      const selfiePath = await upload(selfie, "selfie");

      const { error } = await supabase.from("verifications").insert({
        user_id: user.id,
        full_name: fullName.trim(),
        country: country.trim(),
        doc_type: docType.id,
        doc_number: docNumber.trim(),
        front_path: frontPath,
        back_path: backPath,
        selfie_path: selfiePath,
        status: "pending",
      });
      if (error) throw error;

      setFront(null);
      setBack(null);
      setSelfie(null);
      await load();
    } catch (err) {
      setMsg({ text: err.message || "Could not submit your documents. Try again." });
    } finally {
      setBusy(false);
    }
  }

  const status = record?.status;
  const showForm = !loading && status !== "pending" && status !== "approved";
  const showIntro = showForm && step === "intro";

  const flow = ["intro", "type", "front", ...(docType.back ? ["back"] : []), "selfie", "details"];
  const goNext = () => setStep(flow[Math.min(flow.indexOf(step) + 1, flow.length - 1)]);

  function goBack() {
    const i = flow.indexOf(step);
    if (showForm && i > 0) setStep(flow[i - 1]);
    else navigate(-1);
  }

  const CAPTURE = {
    front: {
      title: docType.back ? "Front of Document" : "Photo Page",
      sub: `Place your ${docType.label} on a flat surface in good lighting`,
      hint: "Ensure all four corners are visible and text is clear",
      file: front,
      set: setFront,
    },
    back: {
      title: "Back of Document",
      sub: `Flip your ${docType.label} over and take a photo of the back`,
      hint: "Make sure the barcode or magnetic stripe is clearly visible",
      file: back,
      set: setBack,
    },
    selfie: {
      title: "Take a Live Selfie",
      sub: "Look directly at the camera in a well-lit area",
      hint: "Front-facing camera will open automatically",
      tips: [
        "Remove sunglasses or hats",
        "Ensure your full face is visible",
        "Use good lighting — avoid strong backlighting",
      ],
      live: true,
      file: selfie,
      set: setSelfie,
    },
  };
  const cap = CAPTURE[step];

  const STATUS = {
    pending: {
      icon: ICON_CLOCK,
      title: "Review in progress",
      text: "We received your documents and are checking them. This usually takes 1–2 business days.",
    },
    approved: {
      icon: ICON_OK,
      title: "Identity verified",
      text: "Your account is fully verified. You don't need to do anything else.",
    },
    rejected: {
      icon: ICON_X,
      title: "Verification declined",
      text: "We couldn't verify your documents. Fix the issue below and submit them again.",
    },
  };

  return (
    <>
      <style>{css}</style>
      <div className="vf">
        <div className="vf__bar">
          <button className="vf__back" type="button" onClick={goBack} aria-label="Go back">
            <Icon>{ICON_BACK}</Icon>
          </button>
          <span>Identity Verification</span>
        </div>

        {loading && <div className="vf__card">Loading...</div>}

        {!loading && status && STATUS[status] && (
          <div className="vf__card">
            <div className="vf__status">
              <div className={`vf__badge vf__badge--${status}`}>
                <Icon>{STATUS[status].icon}</Icon>
              </div>
              <div>
                <b>{STATUS[status].title}</b>
                <p>{STATUS[status].text}</p>
                {status === "rejected" && record.rejection_reason && (
                  <div className="vf__reason">{record.rejection_reason}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {showIntro && (
          <div className="vf__intro">
            <div className="vf__hero">
              <Icon>{ICON_UP}</Icon>
            </div>
            <h1>Verify Your Identity</h1>
            <p className="vf__lead">
              Complete a quick identity check to unlock <b>higher withdrawal limits</b> and gain full
              access to all platform features.
            </p>

            <div className="vf__feat">
              <span className="vf__feat-ic" aria-hidden="true">🪪</span>
              <div>
                <b>Government-issued ID</b>
                <span>Passport, national ID, or driver's license</span>
              </div>
            </div>
            <div className="vf__feat">
              <span className="vf__feat-ic" aria-hidden="true">🤳</span>
              <div>
                <b>Live selfie</b>
                <span>A photo of your face taken in real time</span>
              </div>
            </div>
            <div className="vf__feat">
              <span className="vf__feat-ic" aria-hidden="true">⏱️</span>
              <div>
                <b>Quick process</b>
                <span>Takes less than 2 minutes to complete</span>
              </div>
            </div>

            <div className="vf__privacy">
              <span className="vf__privacy-ic" aria-hidden="true">🔒</span>
              <p style={{ margin: 0 }}>
                Your documents are <b>used solely for identity verification</b> and are permanently
                deleted from our systems once verification is complete. We do not share your data with
                third parties.
              </p>
            </div>

            <button className="vf__start" type="button" onClick={() => setStep("type")}>
              Start Verification
              <Icon>{ICON_NEXT}</Icon>
            </button>
          </div>
        )}

        {showForm && step === "type" && (
          <div className="vf__choose">
            <h1>Choose Document Type</h1>
            <p className="vf__sub">Select the type of ID you'll be using</p>
            {DOC_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`vf__opt ${t.id === docType.id ? "is-on" : ""}`}
                onClick={() => {
                  setDocType(t);
                  if (!t.back) setBack(null);
                  setStep("front");
                }}
              >
                <span className="vf__opt-ic" aria-hidden="true"><Icon>{DOC_ICONS[t.id]}</Icon></span>
                <span className="vf__opt-label">{t.label}</span>
                <Icon>{ICON_NEXT}</Icon>
              </button>
            ))}
          </div>
        )}

        {showForm && cap && (
          <div className="vf__choose">
            <h1>{cap.title}</h1>
            <p className="vf__sub">{cap.sub}</p>
            {cap.tips && (
              <ul className="vf__checks">
                {cap.tips.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            )}
            <CaptureBox id={`vf-${step}`} file={cap.file} hint={cap.hint} live={cap.live} onPick={pick(cap.set)} />
            <button className="vf__go" type="button" disabled={!cap.file} onClick={goNext}>
              Continue
              <Icon>{ICON_NEXT}</Icon>
            </button>
            {msg && <div className="vf__msg vf__msg--err">{msg.text}</div>}
          </div>
        )}

        {showForm && step === "details" && (
          <form className="vr" onSubmit={submit}>
            <h1>Verify your identity</h1>
            <p className="vf__sub">
              ID document and a live face photo. Required for withdrawals of $500 or more.
            </p>

            <div className="vr__steps">
              <div className="vr__step">
                <span className="vr__dot"><Icon>{ICON_OK}</Icon></span>ID document
              </div>
              <div className="vr__step">
                <span className="vr__dot"><Icon>{ICON_OK}</Icon></span>Face check
              </div>
              <div className="vr__step is-active">
                <span className="vr__dot">3</span>Review
              </div>
            </div>

            <div className="vr__card">
              <div className="vr__head">
                <Icon>{ICON_OK}</Icon>
                Review and submit
              </div>

              <div className="vr__grid">
                <Thumb file={front} label={`${docType.label}${docType.back ? " (front)" : ""}`} />
                {docType.back && <Thumb file={back} label={`${docType.label} (back)`} />}
                <Thumb file={selfie} label="Face photo" />
              </div>

              {/* Needed by submit(); remove these and the check in submit() if your table doesn't require them */}
              <div className="vr__fields">
                <input className="vf__input" placeholder="Full name (as on your ID)" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
                <input className="vf__input" placeholder="Country of issue" value={country} onChange={(e) => setCountry(e.target.value)} autoComplete="country-name" />
                <input className="vf__input" placeholder="Document number" value={docNumber} onChange={(e) => setDocNumber(e.target.value)} autoComplete="off" />
              </div>

              <p className="vr__note">Your photos are stored privately and only used to verify your identity.</p>

              <div className="vr__actions">
                <button type="button" className="vr__back" onClick={() => setStep("selfie")}>
                  <Icon>{ICON_BACK}</Icon>
                  Back
                </button>
                <button type="submit" className="vr__submit" disabled={busy}>
                  {busy ? "Uploading..." : "Submit for review"}
                </button>
              </div>

              {msg && <div className="vf__msg vf__msg--err">{msg.text}</div>}
            </div>
          </form>
        )}
      </div>
    </>
  );
}
