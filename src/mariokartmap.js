
// ここ追加
import React, { useEffect, useMemo, useRef, useState } from "react";
import { auth, onAuth, signInGoogle, signOutGoogle, loadCloud, saveCloud, subscribeCloud } from "./firebase";

/** ========= 基本設定 ========= */
const BASE_W = 1210;   // 元画像の実寸
const BASE_H = 1210;
const PADDING = 16;
const GAP = 16;


// サイド最小サイズ / マップ最小サイズ
const MIN_SB_W = 280;
const MIN_SB_H = 180;
const MIN_MAP_W = 300;
const MIN_MAP_H = 260;

function getLayout(vw) {
  if (vw <= 900) {
    return { mode: "stack", rightColW: 0 };      // 上下分割
  } else if (vw <= 1400) {
    return { mode: "side",  rightColW: 200 };    // 左右分割（中）
  } else {
    return { mode: "side",  rightColW: 240 };    // 左右分割（広）
  }
}

/** ========= ランク/ユーティリティ ========= */
const RANK_MIN = 1, RANK_MAX = 24;
const clampWrap = (v) => {
  const n = parseInt(v, 10);
  if (isNaN(n)) return RANK_MIN;
  if (n < RANK_MIN) return RANK_MAX;
  if (n > RANK_MAX) return RANK_MIN;
  return n;
};
const fmtTs = (ts) => {
  const d = new Date(ts), z = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${z(d.getMonth()+1)}/${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}`;
};
const MEMO_KEY = "mk_memo_v1";
const RANK_KEY = "mk_rank_v1";
// src/MarioKartMap.js

const LS = {
  currentProfileKey: "mk_profile_current_v1",
  profileListKey: "mk_profile_list_v1",
  memoKey: (p) => `mk_memo_${p}_v1`,
  rankKey: (p) => `mk_rank_${p}_v1`,
};
const loadJSON = (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; }};

/** ========= コース & 接続 ========= */
const courseData = [
  { id: 1,  name: "クッパキャッスル",            x: 291,  y: 246 },
  { id: 2,  name: "ほねほねツイスター",          x: 447,  y: 247 },
  { id: 3,  name: "どんぐりツリーハウス",        x: 606,  y: 167 },
  { id: 4,  name: "おばけシネマ",                x: 778,  y: 239 },
  { id: 5,  name: "キラーシップ",                x: 143,  y: 407 },
  { id: 6,  name: "キノピオファクトリー",        x: 454,  y: 444 },
  { id: 7,  name: "マリオサーキット",            x: 613,  y: 335 },
  { id: 8,  name: "ロゼッタ天文台",              x: 916,  y: 331 },
  { id: 9,  name: "ワリオスタジアム",            x: 295,  y: 528 },
  { id: 10, name: "モーモーカントリー",          x: 606,  y: 526 },
  { id: 11, name: "ショーニューロード",          x: 755,  y: 467 },
  { id: 12, name: "アイスビルディング",          x: 1064, y: 444 },
  { id: 13, name: "ヘイホーカーニバル",              x: 106,  y: 637 },
  { id: 14, name: "チョコマウンテン",            x: 446,  y: 638 },
  { id: 15, name: "プクプクフォールズ",          x: 767,  y: 642 },
  { id: 16, name: "DKスノーマウンテン",          x: 911,  y: 545 },
  { id: 17, name: "ワリオシップ",                x: 1068, y: 663 },
  { id: 18, name: "マリオブラザーズサーキット",  x: 245,  y: 729 },
  { id: 19, name: "ピーチスタジアム",            x: 602,  y: 704 },
  { id: 20, name: "ソルティータウン",            x: 926,  y: 745 },
  { id: 21, name: "サンサン砂漠",                x: 92,   y: 836 },
  { id: 22, name: "トロフィーシティ",            x: 453,  y: 860 },
  { id: 23, name: "リバーサイドサファリ",        x: 769,  y: 828 },
  { id: 24, name: "ピーチビーチ",                x: 1069, y: 836 },
  { id: 25, name: "シュポポコースター",          x: 256,  y: 948 },
  { id: 26, name: "DK宇宙センター",              x: 454,  y: 1004 },
  { id: 27, name: "ノコノコビーチ",              x: 592,  y: 978 },
  { id: 28, name: "ディノディノジャングル",      x: 783,  y: 1032 },
  { id: 29, name: "ハテナ神殿",                  x: 964,  y: 958 },
  { id: 30, name: "レインボーロード",            x: 608,  y: 840 },
];
const connections = {
  1:[2,7,14,6,9,5,1],2:[3,4,7,10,6,9,5,1,2],3:[4,11,7,6,2,3],4:[8,11,7,2,3,4],
  5:[1,2,6,9,13,5],6:[2,3,7,11,10,19,14,18,9,5,1,6],7:[3,4,8,11,10,19,6,1,2,7],
  8:[12,17,16,15,11,7,4,8],9:[1,2,6,14,22,18,13,5,9],10:[7,11,16,15,19,22,14,6,2,10],
  11:[4,8,12,16,15,10,6,7,3,11],12:[17,20,16,15,11,8,12],13:[5,9,14,18,21,13],
  14:[6,10,15,19,22,25,18,13,9,1,14],15:[11,8,16,17,20,23,19,14,10,15],16:[8,12,17,20,15,10,11,16],
  17:[24,20,15,16,8,12,17],18:[9,6,14,22,25,21,13,18],19:[10,15,23,30,22,14,6,27,19],
  20:[16,17,24,29,28,23,15,20],21:[13,18,22,27,25,21],22:[14,10,19,23,27,26,25,21,18,9,22],
  23:[15,20,24,29,28,27,22,19,23],24:[29,28,23,20,17,24],25:[21,18,14,22,27,26,25],
  26:[25,21,18,22,19,27,26],27:[26,22,19,23,28,27],28:[27,23,20,24,29,28],29:[28,27,23,20,24,29],
  30:[30],
};
const byId = Object.fromEntries(courseData.map(c => [c.id, c]));
const nameOf = (id) => byId[id]?.name ?? String(id);

/** ========= メイン ========= */
export default function MarioKartMap() {
  // ここ追加：ログインユーザー
const [user, setUser] = useState(null);
// ここ追加：クラウド購読停止用
const cloudUnsubRef = useRef(null);
// ここ追加：同期中フラグ（保存ボタンの二度押し防止などに使える）
const [syncing, setSyncing] = useState(false);
  const [layout, setLayout] = useState(() =>
    getLayout(typeof window !== "undefined" ? window.innerWidth : 1200)
  );
  const [viewport, setViewport] = useState({ w: 1200, h: 800 });

  // 選択・データ
  const [profiles, setProfiles] = useState(() => loadJSON(LS.profileListKey, ["default"]));
  const [profile, setProfile]   = useState(() => localStorage.getItem(LS.currentProfileKey) || "default");
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [memoDB, setMemoDB] = useState(() => loadJSON(LS.memoKey(profile), {}));
  const [memoText, setMemoText] = useState("");
  const [rankDB, setRankDB] = useState(() => loadJSON(LS.rankKey(profile), {}));
  const [newRank, setNewRank] = useState(1);
  // （useStateのあとで OK）
const showStartAvg = Boolean(start) && !end;   // 始点あり＆終点なし のときだけ右パネルを出す
// 始点だけ選択中なら true（＝平均のみ出す）
const showStartOnly = Boolean(start) && !end;


  
// ここ追加：ログイン状態の監視
useEffect(() => {
  const off = onAuth(async (u) => {
    setUser(u || null);

    // 既存のクラウド購読を解除
    if (cloudUnsubRef.current) {
      cloudUnsubRef.current();
      cloudUnsubRef.current = null;
    }

    if (u) {
      // ログイン時：初回ロード → 購読開始
      const initial = await loadCloud(u.uid);
      setMemoDB(initial.memoDB || {});
      setRankDB(initial.rankDB || {});
      cloudUnsubRef.current = subscribeCloud(u.uid, (data) => {
        // 自分以外の端末で更新された内容も反映される
        setMemoDB(data.memoDB || {});
        setRankDB(data.rankDB || {});
      });
    }
  });
  return () => off();
}, []);

// ここ追加：プロフィール名を保存
useEffect(() => {
  localStorage.setItem(LS.currentProfileKey, profile);
}, [profile]);

// ここ変更：プロフィール別キーで保存
useEffect(() => {
  localStorage.setItem(LS.memoKey(profile), JSON.stringify(memoDB));
}, [memoDB, profile]);

useEffect(() => {
  localStorage.setItem(LS.rankKey(profile), JSON.stringify(rankDB));
}, [rankDB, profile]);

// ここ追加：プロフィールが変わったら、そのプロフィールのデータを読み直す
useEffect(() => {
  setMemoDB(loadJSON(LS.memoKey(profile), {}));
  setRankDB(loadJSON(LS.rankKey(profile), {}));
}, [profile]);

// ここ追加：プロフィール一覧の保存
useEffect(() => {
  localStorage.setItem(LS.profileListKey, JSON.stringify(profiles));
}, [profiles]);

  // ウィンドウサイズ監視
  useEffect(() => {
    const onResize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setViewport({ w: vw, h: vh });
      setLayout(getLayout(vw));
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
// 初回マウント時に localStorage から復元
useEffect(() => {
  try {
    const raw = localStorage.getItem("mkw-data");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.memoDB) setMemoDB(parsed.memoDB);
      if (parsed.rankDB) setRankDB(parsed.rankDB);
    }
  } catch (e) {
    console.warn("local restore failed", e);
  }
}, []);

  /** ========== マップの角ドラッグで拡縮（アスペクト比固定） ========== */
  // ユーザー希望の「見かけ上のマップ幅/高」（実際は scale で描画）
  const [userScale, setUserScale] = useState(0.6);  // 初期拡大率
  // ドラッグ開始時のキャプチャ
  const cornerRef = useRef({ active: false, startX: 0, startY: 0, baseW: 0, baseH: 0, baseScale: 0 });

  // 画面に対する最大/最小スケールを算出（サイド最小を確保）
  const clampScale = (s) => {
    const availW = viewport.w - PADDING * 2;
    const availH = viewport.h - PADDING * 2;

    const minScale = Math.max(MIN_MAP_W / BASE_W, MIN_MAP_H / BASE_H);

    if (layout.mode === "side") {
      const maxW = Math.max(0, availW - MIN_SB_W - GAP);
      const maxH = availH;
      const maxScale = Math.min(maxW / BASE_W, maxH / BASE_H);
      return Math.max(minScale, Math.min(maxScale, s));
    } else {
      const maxW = availW;
      const maxH = Math.max(0, availH - MIN_SB_H - GAP);
      const maxScale = Math.min(maxW / BASE_W, maxH / BASE_H);
      return Math.max(minScale, Math.min(maxScale, s));
    }
  };

  // 実際の描画サイズとサイドサイズを計算
  const { mapScale, mapDrawW, mapDrawH, sidebarW, sidebarH } = useMemo(() => {
    const s = clampScale(userScale);
    const mapW = Math.round(BASE_W * s);
    const mapH = Math.round(BASE_H * s);

    const availW = viewport.w - PADDING * 2;
    const availH = viewport.h - PADDING * 2;

    if (layout.mode === "side") {
      // 残りをサイドに
      const sbW = Math.max(MIN_SB_W, availW - mapW - GAP);
      return { mapScale: s, mapDrawW: mapW, mapDrawH: mapH, sidebarW: sbW, sidebarH: availH };
    } else {
      // 残りをサイドに
      const sbH = Math.max(MIN_SB_H, availH - mapH - GAP);
      return { mapScale: s, mapDrawW: mapW, mapDrawH: mapH, sidebarW: availW, sidebarH: sbH };
    }
  }, [userScale, viewport, layout.mode]);

  // 右下角のドラッグ開始
  const onCornerDown = (e) => {
    e.preventDefault();
    const cap = cornerRef.current;
    cap.active = true;
    cap.startX = e.clientX;
    cap.startY = e.clientY;
    cap.baseW = mapDrawW;
    cap.baseH = mapDrawH;
    cap.baseScale = mapScale;
    window.addEventListener("pointermove", onCornerMove);
    window.addEventListener("pointerup", onCornerUp, { once: true });
  };
  // ドラッグ中：ポインタに合わせつつ縦横比固定＝min(横方向スケール, 縦方向スケール)
  const onCornerMove = (e) => {
    const cap = cornerRef.current;
    if (!cap.active) return;
    const dx = e.clientX - cap.startX;
    const dy = e.clientY - cap.startY;
    const desiredW = Math.max(MIN_MAP_W, cap.baseW + dx);
    const desiredH = Math.max(MIN_MAP_H, cap.baseH + dy);
    let nextScale = Math.min(desiredW / BASE_W, desiredH / BASE_H);
    nextScale = clampScale(nextScale);
    setUserScale(nextScale);
  };
  const onCornerUp = () => {
    cornerRef.current.active = false;
    window.removeEventListener("pointermove", onCornerMove);
  };

  /** ========== ピン選択 & メモ/順位 ========== */
  const onPinClick = (id) => {
    if (!start) { setStart(id); setEnd(null); setMemoText(memoDB[`${id}-${id}`] || ""); return; }
    if (!end) {
      if ((connections[start] || []).includes(id)) { setEnd(id); setMemoText(memoDB[`${start}-${id}`] || ""); }
      return;
    }
    setStart(id); setEnd(null); setMemoText(memoDB[`${id}-${id}`] || "");
  };
  const swap = () => { if (!start && !end) return; const s=end, e=start; setStart(s); setEnd(e); if (s!=null && e!=null) setMemoText(memoDB[`${s}-${e}`] || ""); };
  const clearSel = () => { setStart(null); setEnd(null); setMemoText(""); };

// 【メモ】既存の saveMemo をこの関数に置き換え
const saveMemo = async () => {
  if (!start || !end || !memoText.trim()) return;
  const key = `${start}-${end}`;

  // 次のメモ状態を作る（setStateは非同期なので“次状態”を変数で保持）
  const nextMemoDB = { ...memoDB, [key]: memoText };
  setMemoDB(nextMemoDB);
  setMemoText("");

  // localStorage は memoDB と rankDB を“両方”まとめて保存
  try {
    localStorage.setItem("mkw-data", JSON.stringify({ memoDB: nextMemoDB, rankDB }));
  } catch (e) {
    console.warn("local save failed", e);
  }

  // クラウドは memoDB のみを merge 更新（rankDB は維持）
  if (user?.uid) {
    try {
      await saveCloud(user.uid, { memoDB: nextMemoDB });
    } catch (e) {
      console.warn("cloud save failed", e);
    }
  }
};



  const key = start && end ? `${start}-${end}` : null;
  const rankObjs = key ? (rankDB[key] || []) : [];
  const rankNums = rankObjs.map(o => o.rank);
  const avg = (arr)=>arr.length? (arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(2):"-";
  const avgAll = avg(rankNums);
  const avgRecent15 = avg(rankNums.slice(0,15));
const addRank = () => {
  if (!key) return;
  const v = clampWrap(newRank);
  const now = Date.now();
  setRankDB(o => {
    const arr = [{ rank: v, ts: now }, ...(o[key] || [])];
    const n = { ...o, [key]: arr };
    if (user?.uid) {
      setSyncing(true);
      saveCloud(user.uid, { rankDB: n }).finally(() => setSyncing(false));
    }
    return n;
  });
};

const updateRankAt = (i, v) => {
  if (!key) return;
  const nVal = clampWrap(v);
  setRankDB(o => {
    const a = [...(o[key] || [])];
    if (!a[i]) return o;
    a[i] = { ...a[i], rank: nVal };
    const n = { ...o, [key]: a };
    if (user?.uid) {
      setSyncing(true);
      saveCloud(user.uid, { rankDB: n }).finally(() => setSyncing(false));
    }
    return n;
  });
};

const deleteRankAt = (i) => {
  if (!key) return;
  setRankDB(o => {
    const a = [...(o[key] || [])];
    a.splice(i, 1);
    const n = { ...o, [key]: a };
    if (user?.uid) {
      setSyncing(true);
      saveCloud(user.uid, { rankDB: n }).finally(() => setSyncing(false));
    }
    return n;
  });
};

const clearAllRanks = () => {
  if (!key) return;
  if (!window.confirm("このルートの順位記録をすべて削除します。")) return;
  setRankDB(o => {
    const n = { ...o, [key]: [] };
    if (user?.uid) {
      setSyncing(true);
      saveCloud(user.uid, { rankDB: n }).finally(() => setSyncing(false));
    }
    return n;
  });
};


  // 始点のみ選択時の直近15試合平均（全終点まとめ）
  const startRecent15Avg = useMemo(() => {
    if (!start) return "-";
    const items = [];
    for (const [k, arr] of Object.entries(rankDB)) {
      const [sStr] = k.split("-");
      if (Number(sStr) === start) items.push(...arr);
    }
    items.sort((a,b)=>(b.ts||0)-(a.ts||0));
    const top15 = items.slice(0,15).map(o=>o.rank);
    return top15.length ? (top15.reduce((a,b)=>a+b,0)/top15.length).toFixed(2) : "-";
  }, [start, rankDB]);

  // 始点→各終点の直近15平均（右サマリー）
  const neighborSummaries = useMemo(() => {
    if (!start) return [];
    const ends = connections[start] || [];
    return ends.map((eid) => {
      const k = `${start}-${eid}`;
      const arr = (rankDB[k] || []).map(o => o.rank);
      const mean = arr.length ? (arr.slice(0,15).reduce((a,b)=>a+b,0) / Math.min(15, arr.length)).toFixed(2) : "-";
      return { eid, name: nameOf(eid), avg15: mean };
    });
  }, [start, rankDB]);

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        display: "flex",
        flexDirection: layout.mode === "stack" ? "column" : "row",
        alignItems: "center", justifyContent: "flex-start",
        gap: GAP, background: "#f5f7fb",
        overflow: "hidden", padding: PADDING, boxSizing: "border-box",
        maxWidth: "100vw",
      }}
    >
      {/* マップ枠（右下角をドラッグして拡縮） */}
      <div
        style={{
          position: "relative",
          width: layout.mode === "side" ? `${mapDrawW}px` : "100%",
          height: `${mapDrawH}px`,
          borderRadius: 12,
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          background: "#fff",
          overflow: "hidden",
          flex: "0 0 auto",
        }}
      >
        {/* 実寸レイヤー（scale で表示） */}
        <div
          style={{
            position: "absolute", left: 0, top: 0,
            width: BASE_W, height: BASE_H,
            transform: `scale(${mapScale})`,
            transformOrigin: "top left",
          }}
        >
          <MapCanvas start={start} end={end} onPinClick={onPinClick} />
        </div>

        {/* 右下リサイズ・ハンドル（角） */}
        <div
          onPointerDown={onCornerDown}
          title="右下をドラッグしてマップの大きさを変更（縦横比固定）"
          style={{
            position: "absolute", right: 6, bottom: 6,
            width: 18, height: 18, borderRadius: 6,
            background: "rgba(0,0,0,0.55)",
            cursor: "se-resize", zIndex: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontSize: 12, userSelect: "none",
          }}
        >
          ↘
        </div>
      </div>

      {/* サイド（残りスペースに自動調整） */}
      <div
        style={{
          flex: "0 0 auto",
          width: layout.mode === "side" ? `${sidebarW}px` : "100%",
          height: layout.mode === "side" ? `${mapDrawH}px` : `${sidebarH}px`,
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          padding: 14,
          boxSizing: "border-box",
          overflow: "auto",
          display: "grid",
          gridTemplateColumns:
      layout.mode === "side"
        ? (showStartOnly ? "1fr 260px" : "1fr")
        : "1fr",
          columnGap: 14,
          /* ここ追加：行方向の自動段組みで“最下段”に押しやすくする */
          gridAutoRows: "min-content",
        }}
      >
        {/* ここ追加：サイド下部のアカウント */}
<div style={{ marginTop: 12, borderTop: "1px solid #e5e7eb", paddingTop: 10 }}>
 
</div>

        {/* 左カラム：選択・メモ・順位 */}
        <div style={{
  // 左列に固定
  gridColumn: "1 / 2",
  display: "flex", flexDirection: "column", gap: 12
}}>

          {/* ここ追加：プロフィール切替UI（小さめ） */}

          {/* 選択情報 */}
          <div>
            <div style={{ marginBottom: 6, lineHeight: 1.6 }}>
              <div><b>始点:</b> {start ? nameOf(start) : "未選択"}　　終点: {end ? nameOf(end) : (start ? "接続先をクリック" : "未選択")}</div>
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <button onClick={() => { setStart(null); setEnd(null); setMemoText(""); }}
                style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #d1d5db", background: "#f3f4f6", fontWeight: 700 }}>
                クリア
              </button>
            </div>
          </div>

          {/* メモ（始点＆終点が揃ったとき表示・編集可） */}
          {start && end ? (
            <div style={{ paddingRight: 4 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                メモ（{nameOf(start)} → {nameOf(end)}）
              </div>
              <textarea
                value={memoText}
                onChange={(e) => setMemoText(e.target.value)}
                placeholder="このルートに関するメモ"
                rows={4}
                style={{ width: "100%", maxWidth: 360, border: "1px solid #d1d5db", borderRadius: 10, padding: 10, resize: "vertical" }}
              />
              <div style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "center" }}>
                <button
                  onClick={saveMemo}
                  style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #10b981", background: "#10b981", color: "white", fontWeight: 700 }}
                >保存</button>
                
              </div>
            </div>
          ) : (
            <div style={{ border: "1px dashed #d1d5db", borderRadius: 10, padding: 12, color: "#6b7280", background: "#fafafa" }}>
              始点をクリック → 接続している終点をクリックすると、メモと順位記録が使えます。
            </div>
          )}

          {/* 順位記録 */}
          {start && end && (
            <RankSection
              start={start}
              end={end}
              nameOf={nameOf}
              rankDB={rankDB}
              setRankDB={setRankDB}
              newRank={newRank}
              setNewRank={setNewRank}
              avgAll={avgAll}
              avgRecent15={avgRecent15}
              updateRankAt={updateRankAt}
              deleteRankAt={deleteRankAt}
              clearAllRanks={clearAllRanks}
              addRank={addRank}  
            />
          )}
        </div>

        {/* 右カラム：始点だけの平均（始点のみ時）／ 始点→各終点の直近15平均 */}
          <div style={{
  // 横画面のときは右列へ、縦画面のときは全幅で下段
  gridColumn: layout.mode === "side" ? "2 / 3" : "1 / -1",
  borderLeft: layout.mode === "side" ? "1px solid #e5e7eb" : "none",
  paddingLeft: layout.mode === "side" ? 12 : 0,
  marginTop: layout.mode !== "side" ? 12 : 0,
  width: "100%",
  overflow: "hidden",
  minWidth: 0  // 折り返しレイアウトでのはみ出し防止
}}>

                  <div
          style={{
            gridColumn: "1 / -1",      // 2カラムを跨ぐ
            marginTop: 12,
            borderTop: "1px solid #e5e7eb",
            paddingTop: 10,
            alignSelf: "end"           // 余白がある場合は下寄せ
          }}
        >
          <details>
            <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 13, color: "#374151" }}>
              アカウント（ログインすると端末間で同期）
            </summary>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
              {user ? (
                <>
                  <span style={{ fontSize: 12, color: "#374151" }}>
                    ログイン中：{user.displayName || user.email || user.uid}
                  </span>
                  <button onClick={signOutGoogle}
                    style={{ height: 32, borderRadius: 8, border: "1px solid #d1d5db", padding: "0 12px", background: "#fff" }}>
                    ログアウト
                  </button>
                  {syncing && <span style={{ fontSize: 12, color: "#6b7280" }}>同期中...</span>}
                </>
              ) : (
                <>
                  <span style={{ fontSize: 12, color: "#374151" }}>未ログイン（この端末に保存中）</span>
                  <button onClick={signInGoogle}
                    style={{
                      height: 32, borderRadius: 8, border: "1px solid #3b82f6", padding: "0 12px",
                      background: "#3b82f6", color: "#fff", fontWeight: 700
                    }}>
                    Googleでログイン
                  </button>
                </>
              )}
            </div>
          </details>
        </div>
       
{/* 始点だけのときのみ平均を表示 */}



{showStartOnly && (
  <>
    <div style={{ fontWeight: 800, marginBottom: 8, whiteSpace: "nowrap" }}>直近15試合 平均</div>
    {!start ? (
      <div style={{ color: "#6b7280", fontSize: 13 }}>始点を選択すると表示されます。</div>
    ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {(connections[start] || []).map((eid)=> {
                const k = `${start}-${eid}`;
                const arr = (rankDB[k] || []).map(o => o.rank);
                const avg15 = arr.length ? (arr.slice(0,15).reduce((a,b)=>a+b,0)/Math.min(15,arr.length)).toFixed(2) : "-";
                return (
                  <div key={eid} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "6px 8px", border: "1px solid #e5e7eb", borderRadius: 10,
                    background: (end === eid ? "#eef2ff" : "#fff"), whiteSpace: "nowrap",
                  }}>
                    <div style={{ fontSize: 12, color: "#374151", overflow: "hidden", textOverflow: "ellipsis" }}>
                      → <b>{nameOf(eid)}</b>
                    </div>
                    <div style={{ fontWeight: 800, marginLeft: 8 }}>{avg15}</div>
                  </div>
                );
              })}
            </div>
          )}
          </>
)}
        </div>
      </div>
    </div>
  );
}

/** ========= 順位セクション（分離） ========= */
function RankSection({
  start, end, nameOf,
  rankDB, setRankDB,
  newRank, setNewRank,
  avgAll, avgRecent15,
  updateRankAt, deleteRankAt, clearAllRanks,
  addRank  
}) {
  const key = `${start}-${end}`;
  const ranks = rankDB[key] || [];
  const clamp = (v) => clampWrap(v);
  

  return (
    <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <h3 style={{ fontWeight: 800, fontSize: 16, margin: 0 }}>順位記録</h3>
        <span style={{ color: "#6b7280", fontSize: 12 }}>（{nameOf(start)} → {nameOf(end)}）</span>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "140px 160px 1fr auto auto",
        gap: 10, marginBottom: 10, alignItems: "center"
      }}>
        <input type="number" value={newRank} onChange={(e)=>setNewRank(clamp(e.target.value))}
          style={{ width: "100%", padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 10, height: 36 }} />
        <select value={newRank} onChange={(e)=>setNewRank(clamp(e.target.value))}
          style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 10, height: 36 }}>
          {Array.from({length:24},(_,i)=>i+1).map(n=><option key={n} value={n}>{n} 位</option>)}
        </select>
        <div />
        <button onClick={addRank}
          style={{ padding: "8px 18px", borderRadius: 10, border: "1px solid #3b82f6", background: "#3b82f6", color: "white", fontWeight: 700, height: 36 }}>追加</button>
        <button onClick={clearAllRanks}
          style={{ padding: "8px 18px", borderRadius: 10, border: "1px solid #ef4444", background: "#fff1f2", color: "#ef4444", fontWeight: 700, height: 36 }}
          disabled={!ranks.length}>全消去</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10, marginBottom: 8 }}>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 10, background: "#f9fafb" }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>平均順位</div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>{avgAll}</div>
        </div>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 10, background: "#f9fafb" }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>直近15試合</div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>{avgRecent15}</div>
        </div>
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 10, maxHeight: 220, overflowY: "auto", background: "#fff" }}>
        {ranks.length === 0 ? (
          <div style={{ color: "#6b7280", fontSize: 13 }}>記録はまだありません。</div>
        ) : (
          ranks.map((o, i) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "auto 120px 1fr auto",
              alignItems: "center", gap: 10, padding: "4px 0",
              borderBottom: i === ranks.length - 1 ? "none" : "1px dashed #e5e7eb",
            }}>
              <div style={{ fontSize: 13, color: "#6b7280" }}>#{ranks.length - i}</div>
              <input type="number" value={o.rank} onChange={(e)=>updateRankAt(i, e.target.value)}
                style={{ width: "100%", padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 10, height: 32 }} />
              <div style={{ fontSize: 12, color: "#374151" }}>{fmtTs(o.ts)}</div>
              <div style={{ textAlign: "right" }}>
                <button onClick={()=>deleteRankAt(i)}
                  style={{ padding: "4px 10px", borderRadius: 10, border: "1px solid #ef4444", background: "#fff1f2", color: "#ef4444", fontWeight: 700, height: 32 }}>削除</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/** ========= マップ描画 ========= */
function MapCanvas({ start, end, onPinClick }) {
  const bg = (
    <img
      src={process.env.PUBLIC_URL + "/map.png"}
      alt="map"
      style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", objectFit: "cover",
               zIndex: 0, userSelect: "none", pointerEvents: "none" }}
    />
  );
  const s = byId[start], e = byId[end];
  const line = (s && e) ? (
    <svg width={BASE_W} height={BASE_H}
         style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none", zIndex: 4 }}>
      <line x1={s.x+12} y1={s.y+12} x2={e.x+12} y2={e.y+12}
            stroke="#10b981" strokeWidth="4" opacity="0.95" />
    </svg>
  ) : null;

  const pins = courseData.map((c) => {
    const isStart = c.id === start;
    const isEnd   = c.id === end;
    const canPickAsEnd = start && !end && (connections[start] || []).includes(c.id);
    const isDisabled = !!start && !end && !canPickAsEnd && c.id !== start;

    let bg = "#6b7280";
    if (isStart) bg = "#2563eb";
    else if (isEnd) bg = "#16a34a";
    else if (canPickAsEnd) bg = "#f59e0b";

    return (
      <button
        key={c.id}
        onClick={() => !isDisabled && onPinClick(c.id)}
        title={nameOf(c.id)}
        aria-label={nameOf(c.id)}
        style={{
          position: "absolute", left: c.x, top: c.y, width: 24, height: 24,
          borderRadius: 9999, border: "2px solid #111827", background: bg,
          cursor: isDisabled ? "not-allowed" : "pointer",
          opacity: isDisabled ? 0.35 : 1, zIndex: 5,
          boxShadow: (isStart || isEnd) ? "0 0 0 3px rgba(255,255,255,0.75)" : "none",
        }}
      />
    );
  });

  return (
    <div style={{ position: "relative", width: BASE_W, height: BASE_H }}>
      {bg}
      {line}
      {pins}
    </div>
  );
}
