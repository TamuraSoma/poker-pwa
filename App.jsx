import { useState, useEffect } from "react";

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
const POSITIONS = ["UTG", "UTG+1", "MP", "HJ", "CO", "BTN", "SB", "BB"];
const STREETS = ["プリフロップ", "フロップ", "ターン", "リバー"];
const ACTIONS = ["フォールド", "チェック", "コール", "ベット", "レイズ", "3ベット", "4ベット", "オールイン"];
const RESULTS = ["ウィン", "ルーズ", "チョップ"];

const SUIT_COLOR = { "♠": "#94a3b8", "♥": "#f87171", "♦": "#fb923c", "♣": "#4ade80" };
const SUIT_BG   = { "♠": "rgba(148,163,184,0.12)", "♥": "rgba(248,113,113,0.12)", "♦": "rgba(251,146,60,0.12)", "♣": "rgba(74,222,128,0.12)" };

const newVillain = () => ({ id: Date.now() + Math.random(), name: "", cards: ["", ""] });
const newAction  = (actor) => ({ id: Date.now() + Math.random(), actor, action: "", amount: "" });
const initialStreetActions = () => STREETS.reduce((acc, s) => ({ ...acc, [s]: [] }), {});

const initialHand = () => ({
  id: Date.now(),
  date: new Date().toISOString().slice(0, 10),
  tournament: "",
  sb: "",              // SB額
  bbMultiplier: 2,     // BB = SB × 1.5 or 2
  ante: true,
  position: "",
  heroCards: ["", ""],
  boardCards: ["", "", "", "", ""],
  villains: [newVillain()],
  streetActions: initialStreetActions(),
  result: "",
  profitLoss: "",
  stackBefore: "",     // このハンド前のスタック
  memo: "",
});

// hand.sb + hand.bbMultiplier から blinds 文字列を生成
function handToBlinds(hand) {
  const sb = parseFloat(hand.sb);
  if (isNaN(sb) || sb <= 0) return "";
  const bb = Math.round(sb * (hand.bbMultiplier || 2) * 10) / 10;
  return sb + "/" + bb;
}

// Parse card string "A♠" -> { rank, suit }
function parseCard(val) {
  if (!val) return { rank: "", suit: "" };
  // suit is always last character
  const suit = val.slice(-1);
  const rank = val.slice(0, -1);
  return { rank, suit };
}

/* ══════════════════════════════════════
   CardPicker  — modal-style picker
══════════════════════════════════════ */
function CardPicker({ value, onChange, small, usedCards = [] }) {
  const [open, setOpen] = useState(false);
  const { rank, suit } = parseCard(value);

  const pick = (r, s) => {
    onChange(r + s);
    setOpen(false);
  };
  const clear = (e) => { e.stopPropagation(); onChange(""); setOpen(false); };

  const sz = small ? { w: 40, h: 56 } : { w: 52, h: 68 };
  const hasCard = rank && suit;

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {/* Card face button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: sz.w, height: sz.h,
          borderRadius: 8,
          border: `2px solid ${hasCard ? (SUIT_COLOR[suit] || "#475569") : "#1e293b"}`,
          background: hasCard ? SUIT_BG[suit] || "#1e293b" : "#0f172a",
          cursor: "pointer",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 1,
          transition: "all 0.15s",
          outline: open ? `2px solid #3b82f6` : "none",
          outlineOffset: 2,
        }}>
        {hasCard ? (
          <>
            <span style={{ fontSize: small ? 13 : 15, fontWeight: 700, color: SUIT_COLOR[suit], lineHeight: 1 }}>{rank}</span>
            <span style={{ fontSize: small ? 16 : 20, color: SUIT_COLOR[suit], lineHeight: 1 }}>{suit}</span>
          </>
        ) : (
          <span style={{ fontSize: 18, color: "#334155" }}>+</span>
        )}
      </button>

      {/* Clear button */}
      {hasCard && (
        <button onClick={clear} style={{
          position: "absolute", top: -6, right: -6,
          width: 16, height: 16, borderRadius: "50%",
          background: "#334155", border: "none", cursor: "pointer",
          color: "#94a3b8", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center",
          lineHeight: 1,
        }}>×</button>
      )}

      {/* Picker dropdown */}
      {open && (
        <div style={{
          position: "fixed", zIndex: 9999,
          background: "#0f172a", border: "1px solid #334155",
          borderRadius: 12, padding: 10,
          boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
          width: 260,
          // Position will be handled by JS ref trick — use simple fixed center for now
          top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: "#64748b", fontWeight: 700, letterSpacing: 1 }}>カードを選択</span>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 14 }}>✕</button>
          </div>
          {SUITS.map(s => (
            <div key={s} style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 11, color: SUIT_COLOR[s], marginBottom: 4, paddingLeft: 2 }}>{s}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {RANKS.map(r => {
                  const active = rank === r && suit === s;
                  const card = r + s;
                  const isUsed = !active && usedCards.includes(card);
                  return (
                    <button key={r} onClick={() => !isUsed && pick(r, s)}
                      disabled={isUsed}
                      style={{
                        width: 32, height: 32, borderRadius: 6,
                        border: `1px solid ${active ? SUIT_COLOR[s] : isUsed ? "#1e293b" : "#1e293b"}`,
                        background: active ? SUIT_BG[s] : isUsed ? "#0a0f1a" : "#1e293b",
                        color: active ? SUIT_COLOR[s] : isUsed ? "#1e293b" : "#94a3b8",
                        fontSize: 11, fontWeight: 700,
                        cursor: isUsed ? "not-allowed" : "pointer",
                        transition: "all 0.1s",
                        textDecoration: isUsed ? "line-through" : "none",
                        opacity: isUsed ? 0.3 : 1,
                      }}>{r}</button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Backdrop */}
      {open && (
        <div onClick={() => setOpen(false)} style={{
          position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.5)"
        }} />
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   MultiCardPicker — 複数枚まとめて選ぶモーダル
   count: 選ぶ枚数 (2=ホールカード, 3=フロップ)
══════════════════════════════════════ */
function MultiCardPicker({ values, onChange, count, label, usedCards = [] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(values || []);

  // open するたびに現在値をリセット
  const openPicker = () => { setSelected(values || []); setOpen(true); };

  const toggleCard = (card) => {
    setSelected(prev => {
      if (prev.includes(card)) return prev.filter(c => c !== card);
      if (prev.length >= count) return [...prev.slice(1), card]; // 超えたら古いのを捨てる
      return [...prev, card];
    });
  };

  const confirm = () => { onChange(selected); setOpen(false); };
  const clearAll = () => { onChange(Array(count).fill("")); setSelected([]); setOpen(false); };

  const CardFaceSmall = ({ val, selected: isSel, onClick }) => {
    if (!val) return null;
    const suit = val.slice(-1), rank = val.slice(0, -1);
    return (
      <button onClick={onClick} style={{
        width: 36, height: 48, borderRadius: 7,
        border: `2px solid ${isSel ? SUIT_COLOR[suit] : "#334155"}`,
        background: isSel ? SUIT_BG[suit] : "#0f172a",
        cursor: "pointer", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 0, padding: 0,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: SUIT_COLOR[suit], lineHeight: 1 }}>{rank}</span>
        <span style={{ fontSize: 14, color: SUIT_COLOR[suit], lineHeight: 1 }}>{suit}</span>
      </button>
    );
  };

  // 表示用カード群
  const displayCards = Array(count).fill("").map((_, i) => values?.[i] || "");
  const hasAny = displayCards.some(Boolean);

  return (
    <div style={{ display: "inline-block", position: "relative" }}>
      {/* 表示エリア */}
      <button onClick={openPicker} style={{
        display: "flex", gap: 4, alignItems: "center",
        padding: "6px 10px", borderRadius: 10, cursor: "pointer",
        background: hasAny ? "#1e293b" : "#0f172a",
        border: `2px solid ${hasAny ? "#475569" : "#1e293b"}`,
        outline: "none",
      }}>
        {displayCards.map((c, i) => c ? (
          <div key={i} style={{
            width: 36, height: 48, borderRadius: 7,
            background: SUIT_BG[c.slice(-1)] || "#1e293b",
            border: `1.5px solid ${SUIT_COLOR[c.slice(-1)] || "#475569"}`,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: SUIT_COLOR[c.slice(-1)], lineHeight: 1 }}>{c.slice(0,-1)}</span>
            <span style={{ fontSize: 16, color: SUIT_COLOR[c.slice(-1)], lineHeight: 1 }}>{c.slice(-1)}</span>
          </div>
        ) : (
          <div key={i} style={{
            width: 36, height: 48, borderRadius: 7,
            background: "#0f172a", border: "1.5px dashed #1e293b",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 16, color: "#334155" }}>+</span>
          </div>
        ))}
      </button>
      {hasAny && (
        <button onClick={e => { e.stopPropagation(); clearAll(); }} style={{
          position: "absolute", top: -6, right: -6,
          width: 16, height: 16, borderRadius: "50%",
          background: "#334155", border: "none", cursor: "pointer",
          color: "#94a3b8", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center",
        }}>×</button>
      )}

      {/* Modal */}
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.6)" }} />
          <div style={{
            position: "fixed", zIndex: 9999, top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            background: "#0f172a", border: "1px solid #334155",
            borderRadius: 14, padding: 14, width: 300,
            boxShadow: "0 24px 64px rgba(0,0,0,0.9)",
          }}>
            {/* header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 700, letterSpacing: 1 }}>
                  {label || `カードを${count}枚選択`}
                </span>
                <span style={{ fontSize: 10, color: "#475569" }}>({selected.length}/{count}枚)</span>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 14 }}>✕</button>
            </div>

            {/* selected preview */}
            <div style={{ display: "flex", gap: 6, marginBottom: 10, minHeight: 52 }}>
              {Array(count).fill("").map((_, i) => {
                const c = selected[i];
                return c ? (
                  <div key={i} style={{
                    width: 40, height: 52, borderRadius: 8,
                    background: SUIT_BG[c.slice(-1)] || "#1e293b",
                    border: `1.5px solid ${SUIT_COLOR[c.slice(-1)] || "#475569"}`,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: SUIT_COLOR[c.slice(-1)], lineHeight: 1 }}>{c.slice(0,-1)}</span>
                    <span style={{ fontSize: 18, color: SUIT_COLOR[c.slice(-1)], lineHeight: 1 }}>{c.slice(-1)}</span>
                  </div>
                ) : (
                  <div key={i} style={{
                    width: 40, height: 52, borderRadius: 8,
                    background: "#0a1628", border: "1.5px dashed #1e293b",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span style={{ fontSize: 16, color: "#1e293b" }}>?</span>
                  </div>
                );
              })}
            </div>

            {/* card grid by suit */}
            {SUITS.map(s => (
              <div key={s} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: SUIT_COLOR[s], marginBottom: 4 }}>{s}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                  {RANKS.map(r => {
                    const card = r + s;
                    const isSel = selected.includes(card);
                    const isUsed = !isSel && usedCards.includes(card);
                    return (
                      <button key={r} onClick={() => !isUsed && toggleCard(card)}
                        disabled={isUsed}
                        style={{
                          width: 30, height: 30, borderRadius: 6,
                          border: `1px solid ${isSel ? SUIT_COLOR[s] : "#1e293b"}`,
                          background: isSel ? SUIT_BG[s] : isUsed ? "#0a0f1a" : "#1e293b",
                          color: isSel ? SUIT_COLOR[s] : isUsed ? "#1e293b" : "#94a3b8",
                          fontSize: 10, fontWeight: 700,
                          cursor: isUsed ? "not-allowed" : "pointer",
                          opacity: isUsed ? 0.25 : 1,
                          textDecoration: isUsed ? "line-through" : "none",
                        }}>{r}</button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* actions */}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={confirm} disabled={selected.length !== count}
                style={{
                  flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 700,
                  background: selected.length === count ? "#3b82f6" : "#1e293b",
                  color: selected.length === count ? "#fff" : "#475569",
                  border: "none", cursor: selected.length === count ? "pointer" : "default",
                }}>確定 ({selected.length}/{count})</button>
              <button onClick={() => setSelected([])}
                style={{ padding: "8px 14px", borderRadius: 8, fontSize: 11, background: "#1e293b", color: "#64748b", border: "none", cursor: "pointer" }}>リセット</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   parseBlind — blinds文字列から {sb, bb} を返す
══════════════════════════════════════ */
function parseBlind(blinds) {
  if (!blinds) return { sb: 0, bb: 0 };
  const parts = blinds.split("/").map(s => parseFloat(s.trim()));
  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return { sb: parts[0], bb: parts[1] };
  }
  if (parts.length === 1 && !isNaN(parts[0])) {
    return { sb: parts[0] / 2, bb: parts[0] };
  }
  return { sb: 0, bb: 0 };
}

/* ══════════════════════════════════════
   calcCallAmount — コール額を自動計算
   ロジック:
   - そのストリートで現在の最大ベット額を探す
   - 自分(actor)がすでにそのストリートで投入した額を引く
   - SBは0.5BB投入済み、BBは1BB投入済み として扱う
   - actorId: "hero" or villain.id
   - heroPos / villains: ポジション情報
══════════════════════════════════════ */
function calcCallAmount(street, actionsBeforeThis, actorId, heroPos, villains, blinds) {
  const { sb, bb } = parseBlind(blinds);
  const isPre = street === "プリフロップ";

  // アクター自身のポジションを取得
  const getPos = (id) => {
    if (id === "hero") return heroPos || "";
    const v = (villains || []).find(v => v.id === id);
    return v?.position || "";
  };
  const actorPos = getPos(actorId);

  // プリフロップ時の投入済み額 (ブラインド/アンティ分)
  const preInvested = (id) => {
    if (!isPre) return 0;
    const pos = getPos(id);
    if (pos === "SB") return sb;
    if (pos === "BB") return bb;
    return 0;
  };

  // このストリートのアクション履歴から各プレイヤーの投入合計を計算
  const invested = {}; // id -> 投入額
  for (const a of actionsBeforeThis) {
    if (["コール","ベット","レイズ","3ベット","4ベット","オールイン"].includes(a.action)) {
      const amt = parseFloat(a.amount) || 0;
      invested[a.actor] = (invested[a.actor] || 0) + amt;
    }
  }

  // 現在の最大ベット = ブラインド投入 + アクション投入の最大
  const allActors = ["hero", ...(villains || []).map(v => v.id)];
  let maxBet = isPre ? bb : 0; // BBがデフォルトの最大
  for (const id of allActors) {
    const base = preInvested(id);
    const act = invested[id] || 0;
    maxBet = Math.max(maxBet, base + act);
  }

  const myBase = preInvested(actorId);
  const myAct = invested[actorId] || 0;
  const myTotal = myBase + myAct;
  const callAmt = Math.max(0, maxBet - myTotal);
  return callAmt;
}

/* ══════════════════════════════════════
   calcPots — ストリートごとのポットを自動計算
   ロジック:
   - プリフロップ初期ポット = アンティ×人数 + SB + BB
   - 各ストリートで コール/ベット/レイズ/3ベット/4ベット/オールイン の amount をポットに加算
   - 次のストリートへ引き継ぎ
══════════════════════════════════════ */
function calcPots(streetActions, blinds, ante) {
  const { sb, bb } = parseBlind(blinds);
  const COUNTS_TO_POT = ["コール","ベット","レイズ","3ベット","4ベット","オールイン"];

  // プリフロップ初期ポット
  // アンティ = BB額（BBのみ支払い）+ SB + BB
  const anteTotal = (ante && bb > 0) ? bb : 0; // BB1人分のみ
  let runningPot = anteTotal + sb + bb;

  const pots = {};
  for (const street of STREETS) {
    pots[street] = Math.round(runningPot * 10) / 10;
    const acts = streetActions?.[street] || [];
    for (const act of acts) {
      if (COUNTS_TO_POT.includes(act.action)) {
        const amt = parseFloat(act.amount);
        if (!isNaN(amt) && amt > 0) runningPot += amt;
      }
    }
  }
  pots["__final__"] = Math.round(runningPot * 10) / 10;
  return pots;
}

/* ══════════════════════════════════════
   calcHeroPL — Heroの損益と結果を自動計算
   ロジック:
   - heroInvested: 全ストリートでHeroが投入した合計
     (コール/ベット/レイズ/3ベット/4ベット/オールイン の amount合計)
     + プリフロップのブラインド投入分(SB or BB) + アンティ(BB位なら)
   - Heroがフォールドした場合: 損益 = -heroInvested
   - ウィン: 損益 = finalPot - heroInvested
   - チョップ(2人想定): 損益 = finalPot/2 - heroInvested
   - ルーズ: 損益 = -heroInvested
   戻り値: { profitLoss: number, result: "ウィン"|"ルーズ"|"チョップ"|null }
══════════════════════════════════════ */
function calcHeroPL(streetActions, blinds, ante, heroPos) {
  const { sb, bb } = parseBlind(blinds);
  const INVEST_ACTIONS = ["コール","ベット","レイズ","3ベット","4ベット","オールイン"];

  // Heroの投入額合計 (アクション分)
  let heroInvested = 0;
  // フォールドしたか
  let heroFolded = false;

  for (const street of STREETS) {
    const acts = streetActions?.[street] || [];
    for (const act of acts) {
      if (act.actor !== "hero") continue;
      if (act.action === "フォールド") { heroFolded = true; break; }
      if (INVEST_ACTIONS.includes(act.action)) {
        const amt = parseFloat(act.amount);
        if (!isNaN(amt) && amt > 0) heroInvested += amt;
      }
    }
    if (heroFolded) break;
  }

  // ブラインド投入分を加算
  if (heroPos === "SB" && sb > 0) heroInvested += sb;
  if (heroPos === "BB" && bb > 0) heroInvested += bb;
  // アンティ (BBポジションのみ)
  if (ante && heroPos === "BB" && bb > 0) heroInvested += bb;

  // 最終ポット
  const pots = calcPots(streetActions, blinds, ante);
  const finalPot = pots["__final__"] || 0;

  // フォールドは常にルーズ
  if (heroFolded) {
    return { profitLoss: Math.round(-heroInvested * 10) / 10, result: "ルーズ" };
  }

  // ハンドがまだ進行中(アクションが少ない)場合はnullを返す
  if (heroInvested === 0 && finalPot <= (bb * 1.5 + (ante ? bb : 0))) {
    return { profitLoss: null, result: null };
  }

  // ウィン/ルーズ/チョップは result から判断するが、
  // ここでは投入額ベースで profitLoss の候補を返す
  return {
    ifWin:   Math.round((finalPot - heroInvested) * 10) / 10,
    ifLose:  Math.round(-heroInvested * 10) / 10,
    ifChop:  Math.round((finalPot / 2 - heroInvested) * 10) / 10,
    heroInvested,
    finalPot,
  };
}

/* ══════════════════════════════════════
   AmountHelper  — BB multiplier (preflop) / pot% (postflop) / call auto
══════════════════════════════════════ */
function AmountHelper({ street, blinds, potBefore, actionsBeforeThis, actorId, heroPos, villains, actionType, onApply }) {
  const isPre = street === "プリフロップ";
  const { bb } = parseBlind(blinds);

  // ポット = ストリート開始ポット + このアクション直前までの追加分
  const COUNTS_TO_POT = ["コール","ベット","レイズ","3ベット","4ベット","オールイン"];
  const addedSoFar = (actionsBeforeThis || []).reduce((sum, a) => {
    if (COUNTS_TO_POT.includes(a.action)) {
      const v = parseFloat(a.amount);
      return sum + (isNaN(v) ? 0 : v);
    }
    return sum;
  }, 0);
  const currentPot = (potBefore || 0) + addedSoFar;

  // コール自動計算
  if (actionType === "コール") {
    const callAmt = calcCallAmount(street, actionsBeforeThis || [], actorId, heroPos, villains, blinds);
    if (callAmt <= 0) {
      return (
        <div style={{ padding: "4px 0 2px" }}>
          <span style={{ fontSize: 9, color: "#475569" }}>コール不要（チェック相当）</span>
        </div>
      );
    }
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0 2px" }}>
        <span style={{ fontSize: 9, color: "#475569" }}>コール額</span>
        <button onClick={() => onApply(String(callAmt))} style={{
          padding: "2px 10px", borderRadius: 5, fontSize: 11, fontWeight: 700,
          background: "rgba(96,165,250,0.15)", color: "#60a5fa",
          border: "1px solid rgba(96,165,250,0.3)", cursor: "pointer",
        }}>{callAmt}</button>
      </div>
    );
  }

  if (isPre) {
    const multipliers = [2, 2.5, 3, 3.5, 4, 5];
    if (!bb) return null;
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "5px 0 2px" }}>
        <span style={{ fontSize: 9, color: "#475569", width: "100%", marginBottom: 2 }}>
          BB倍率　<span style={{ color: "#334155" }}>BB={bb}</span>
        </span>
        {multipliers.map(x => {
          const amt = Math.round(bb * x);
          return (
            <button key={x} onClick={() => onApply(String(amt))} style={{
              padding: "2px 8px", borderRadius: 5, fontSize: 10,
              background: "#1e293b", color: "#94a3b8",
              border: "1px solid #334155", cursor: "pointer",
            }}>{x}x <span style={{ color: "#60a5fa", fontWeight: 700 }}>{amt}</span></button>
          );
        })}
      </div>
    );
  } else {
    const pcts = [25, 33, 50, 67, 75, 100];

    // 直前の相手ベット額を探す（レイズ系の場合）
    const isRaise = ["レイズ","3ベット","4ベット"].includes(actionType);
    const INVEST = ["ベット","レイズ","3ベット","4ベット","オールイン"];
    const prevBets = (actionsBeforeThis || []).filter(a => INVEST.includes(a.action));
    const lastBet = prevBets.length > 0 ? parseFloat(prevBets[prevBets.length - 1].amount) : 0;
    const raiseMultipliers = [2, 2.5, 3, 4];

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "5px 0 2px" }}>
        {/* ポット% ボタン */}
        {currentPot > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            <span style={{ fontSize: 9, color: "#475569", width: "100%", marginBottom: 2 }}>
              ポット%　<span style={{ color: "#334155" }}>pot≈{currentPot.toFixed(1)}</span>
            </span>
            {pcts.map(p => {
              const amt = Math.round(currentPot * p / 100);
              return (
                <button key={p} onClick={() => onApply(String(amt))} style={{
                  padding: "2px 8px", borderRadius: 5, fontSize: 10,
                  background: "#1e293b", color: "#94a3b8",
                  border: "1px solid #334155", cursor: "pointer",
                }}>{p}% <span style={{ color: "#a78bfa", fontWeight: 700 }}>{amt}</span></button>
              );
            })}
          </div>
        )}
        {/* ベット倍率ボタン（レイズ系 + 直前ベットがある場合） */}
        {isRaise && lastBet > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            <span style={{ fontSize: 9, color: "#475569", width: "100%", marginBottom: 2 }}>
              ベット倍率　<span style={{ color: "#334155" }}>直前={lastBet.toLocaleString()}</span>
            </span>
            {raiseMultipliers.map(x => {
              const amt = Math.round(lastBet * x);
              return (
                <button key={x} onClick={() => onApply(String(amt))} style={{
                  padding: "2px 8px", borderRadius: 5, fontSize: 10,
                  background: "#1e293b", color: "#94a3b8",
                  border: "1px solid #334155", cursor: "pointer",
                }}>{x}x <span style={{ color: "#34d399", fontWeight: 700 }}>{amt}</span></button>
              );
            })}
          </div>
        )}
      </div>
    );
  }
}

/* ══════════════════════════════════════
   ActionRow
══════════════════════════════════════ */
function ActionRow({ act, villains, street, blinds, potBefore, actionsBeforeThis, heroPos, onChange, onDelete }) {
  const actors = [
    { id: "hero", label: "Hero", color: "#60a5fa", bg: "rgba(96,165,250,0.15)", border: "rgba(96,165,250,0.3)" },
    ...villains.map((v, i) => ({
      id: v.id,
      label: v.name || `V${i + 1}`,
      color: ["#f97316","#a78bfa","#34d399","#f472b6","#facc15"][i % 5],
      bg: ["rgba(249,115,22,0.15)","rgba(167,139,250,0.15)","rgba(52,211,153,0.15)","rgba(244,114,182,0.15)","rgba(250,204,21,0.15)"][i % 5],
      border: ["rgba(249,115,22,0.3)","rgba(167,139,250,0.3)","rgba(52,211,153,0.3)","rgba(244,114,182,0.3)","rgba(250,204,21,0.3)"][i % 5],
    })),
  ];
  const current = actors.find(a => a.id === act.actor) || actors[0];
  const needsHelper = ["ベット","レイズ","3ベット","4ベット","コール","オールイン"].includes(act.action);

  const cycleActor = () => {
    const idx = actors.findIndex(a => a.id === act.actor);
    const next = actors[(idx + 1) % actors.length];
    onChange({ ...act, actor: next.id });
  };

  // コール選択時に自動で金額をセット
  const handleActionChange = (newAction) => {
    if (newAction === "コール") {
      const callAmt = calcCallAmount(street, actionsBeforeThis || [], act.actor, heroPos, villains, blinds);
      onChange({ ...act, action: newAction, amount: callAmt > 0 ? String(callAmt) : "" });
    } else {
      onChange({ ...act, action: newAction });
    }
  };

  const isCall = act.action === "コール";

  return (
    <div style={{ padding: "6px 0", borderBottom: "1px solid #1e293b" }} className="last-no-border">
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={cycleActor} style={{
          padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
          background: current.bg, color: current.color, border: `1px solid ${current.border}`,
          minWidth: 58, cursor: "pointer", whiteSpace: "nowrap",
        }}>{current.label}</button>

        <select value={act.action} onChange={e => handleActionChange(e.target.value)}
          style={{ flex: 1, background: "#1e293b", color: "#e2e8f0", border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 12, outline: "none" }}>
          <option value="">アクション</option>
          {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <input type="number" placeholder="金額" value={act.amount}
          onChange={e => onChange({ ...act, amount: e.target.value })}
          readOnly={isCall}
          style={{ width: 64, background: isCall ? "#0f172a" : "#1e293b", color: isCall ? "#60a5fa" : "#e2e8f0", border: isCall ? "1px solid rgba(96,165,250,0.3)" : "none", borderRadius: 6, padding: "4px 6px", fontSize: 11, outline: "none", textAlign: "right" }} />

        <button onClick={onDelete} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 14, width: 20, textAlign: "center" }}>×</button>
      </div>
      {needsHelper && !isCall && (
        <div style={{ paddingLeft: 66 }}>
          <AmountHelper street={street} blinds={blinds}
            potBefore={potBefore} actionsBeforeThis={actionsBeforeThis}
            actorId={act.actor} heroPos={heroPos} villains={villains}
            actionType={act.action}
            onApply={val => onChange({ ...act, amount: val })} />
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   StreetBlock
══════════════════════════════════════ */
function StreetBlock({ street, actions, villains, blinds, potBefore, heroPos, onChange }) {
  const addAction = (actor) => onChange([...actions, newAction(actor)]);

  const actorColors = [
    { id: "hero", color: "#60a5fa", bg: "rgba(96,165,250,0.12)", border: "rgba(96,165,250,0.25)" },
    ...villains.map((v, i) => ({
      id: v.id,
      color: ["#f97316","#a78bfa","#34d399","#f472b6","#facc15"][i % 5],
      bg: ["rgba(249,115,22,0.1)","rgba(167,139,250,0.1)","rgba(52,211,153,0.1)","rgba(244,114,182,0.1)","rgba(250,204,21,0.1)"][i % 5],
      border: ["rgba(249,115,22,0.2)","rgba(167,139,250,0.2)","rgba(52,211,153,0.2)","rgba(244,114,182,0.2)","rgba(250,204,21,0.2)"][i % 5],
      label: v.name || `V${i + 1}`,
    })),
  ];

  // ストリート内の累積ポット表示
  const COUNTS_TO_POT = ["コール","ベット","レイズ","3ベット","4ベット","オールイン"];
  const streetAdded = actions.reduce((sum, a) => {
    if (COUNTS_TO_POT.includes(a.action)) {
      const v = parseFloat(a.amount); return sum + (isNaN(v) ? 0 : v);
    }
    return sum;
  }, 0);
  const potAfter = (potBefore || 0) + streetAdded;
  const isPre = street === "プリフロップ";

  return (
    <div style={{ borderRadius: 10, border: "1px solid #1e293b", overflow: "hidden", background: "#0a1628" }}>
      {/* header */}
      <div style={{ padding: "8px 12px", background: "#0f172a", borderBottom: actions.length ? "1px solid #1e293b" : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: 2, textTransform: "uppercase" }}>{street}</span>
          {/* ポット表示 */}
          {potBefore > 0 && (
            <span style={{ fontSize: 9, color: "#334155" }}>
              pot <span style={{ color: "#64748b" }}>{potBefore.toFixed(1)}</span>
              {streetAdded > 0 && <span style={{ color: "#475569" }}> → {potAfter.toFixed(1)}</span>}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {actorColors.map(a => (
            <button key={a.id} onClick={() => addAction(a.id)} style={{
              padding: "2px 8px", borderRadius: 5, fontSize: 10,
              background: a.bg, color: a.color, border: `1px solid ${a.border}`, cursor: "pointer",
            }}>+ {a.id === "hero" ? "Hero" : (a.label)}</button>
          ))}
        </div>
      </div>
      {/* actions */}
      <div style={{ padding: actions.length ? "0 12px" : "8px 12px" }}>
        {actions.length > 0
          ? actions.map((act, idx) => (
              <ActionRow key={act.id} act={act} villains={villains}
                street={street} blinds={blinds}
                potBefore={potBefore}
                actionsBeforeThis={actions.slice(0, idx)}
                heroPos={heroPos}
                onChange={u => onChange(actions.map(a => a.id === act.id ? u : a))}
                onDelete={() => onChange(actions.filter(a => a.id !== act.id))} />
            ))
          : <span style={{ fontSize: 11, color: "#334155" }}>アクションなし</span>
        }
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   VillainSection
══════════════════════════════════════ */
function VillainSection({ villains, onChange, allUsedCards = [] }) {
  const colors = ["#f97316","#a78bfa","#34d399","#f472b6","#facc15"];
  const add = () => onChange([...villains, newVillain()]);
  const remove = (id) => onChange(villains.filter(v => v.id !== id));
  const update = (id, patch) => onChange(villains.map(v => v.id === id ? { ...v, ...patch } : v));
  const updateCard = (id, idx, val) => {
    const v = villains.find(v => v.id === id);
    const cards = [...v.cards]; cards[idx] = val;
    update(id, { cards });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <label style={{ fontSize: 11, color: "#64748b" }}>相手 (Villain)</label>
        <button onClick={add} style={{
          padding: "3px 10px", borderRadius: 6, fontSize: 11,
          background: "rgba(249,115,22,0.12)", color: "#f97316",
          border: "1px solid rgba(249,115,22,0.25)", cursor: "pointer"
        }}>+ 相手を追加</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {villains.map((v, i) => (
          <div key={v.id} style={{ borderRadius: 10, border: `1px solid rgba(${i===0?"249,115,22":i===1?"167,139,250":i===2?"52,211,153":i===3?"244,114,182":"250,204,21"},0.2)`, padding: 10, background: "#0f172a" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: colors[i % 5] }} />
                <input placeholder={`Villain ${i + 1} (名前任意)`} value={v.name}
                  onChange={e => update(v.id, { name: e.target.value })}
                  style={{ background: "transparent", border: "none", color: "#e2e8f0", fontSize: 12, outline: "none", width: 140 }} />
              </div>
              {villains.length > 1 && (
                <button onClick={() => remove(v.id)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 12 }}>削除</button>
              )}
            </div>
            {/* Position */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
              {POSITIONS.map(p => (
                <button key={p} onClick={() => update(v.id, { position: v.position === p ? "" : p })} style={{
                  padding: "2px 8px", borderRadius: 6, fontSize: 10, fontFamily: "monospace",
                  background: v.position === p ? colors[i % 5] + "33" : "#1e293b",
                  color: v.position === p ? colors[i % 5] : "#64748b",
                  border: `1px solid ${v.position === p ? colors[i % 5] + "66" : "#1e293b"}`,
                  cursor: "pointer",
                }}>{p}</button>
              ))}
            </div>
            {/* Cards */}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 10, color: "#64748b", minWidth: 40 }}>ホールカード</span>
              <MultiCardPicker
                count={2} label="Villain ホールカード 2枚"
                values={v.cards}
                usedCards={allUsedCards.filter(c => !(v.cards || []).includes(c))}
                onChange={cards => update(v.id, { cards: [cards[0]||"", cards[1]||""] })}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   TournamentInput — 既存トーナメントをサジェスト
══════════════════════════════════════ */
function TournamentInput({ value, onChange, existingTournaments, style }) {
  const [focused, setFocused] = useState(false);
  const all = existingTournaments.filter(Boolean);
  const suggestions = value
    ? all.filter(t => t !== value && t.toLowerCase().includes(value.toLowerCase()))
    : all;
  const showList = focused && suggestions.length > 0;

  return (
    <div style={{ position: "relative" }}>
      <input
        placeholder="Sunday Million"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        style={style}
      />
      {showList && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 200,
          background: "#1e293b", border: "1px solid #334155", borderRadius: 8,
          boxShadow: "0 8px 24px rgba(0,0,0,0.6)", overflow: "hidden",
        }}>
          {suggestions.slice(0, 6).map(t => (
            <button key={t} onMouseDown={() => onChange(t)}
              style={{
                width: "100%", padding: "9px 12px", textAlign: "left", fontSize: 12,
                background: "none", border: "none", color: "#e2e8f0", cursor: "pointer",
                borderBottom: "1px solid #0f172a", display: "block",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#334155"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
            >🏆 {t}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   HandForm
══════════════════════════════════════ */
function HandForm({ hand, onChange, onSave, onCancel, existingTournaments = [] }) {
  const update = (key, val) => onChange({ ...hand, [key]: val });
  const updateBoard = (idx, val) => {
    const arr = [...hand.boardCards]; arr[idx] = val; onChange({ ...hand, boardCards: arr });
  };
  const updateHero = (idx, val) => {
    const arr = [...hand.heroCards]; arr[idx] = val; onChange({ ...hand, heroCards: arr });
  };
  const updateStreet = (street, acts) => onChange({ ...hand, streetActions: { ...hand.streetActions, [street]: acts } });

  const inp = { background: "#0f172a", border: "1px solid #1e293b", color: "#e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none", width: "100%" };
  const lbl = { fontSize: 11, color: "#64748b", display: "block", marginBottom: 4 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* 基本情報 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>

        {/* 1. 日付 + トーナメント名 */}
        <div><label style={lbl}>日付</label><input type="date" value={hand.date} onChange={e => update("date", e.target.value)} style={inp} /></div>
        <div style={{ gridColumn: "2" }}>
          <label style={lbl}>　</label>{/* spacer */}
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          <label style={lbl}>トーナメント名</label>
          <TournamentInput value={hand.tournament} onChange={v => update("tournament", v)} existingTournaments={existingTournaments} style={inp} />
        </div>

        {/* 2. ハンド前スタック */}
        <div style={{ gridColumn: "1/-1" }}>
          <label style={lbl}>ハンド前スタック（任意）</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <input type="number" placeholder="例: 12500" value={hand.stackBefore}
              onChange={e => update("stackBefore", e.target.value)} style={inp} />
            {(() => {
              const sb = parseFloat(hand.stackBefore);
              const pl = parseFloat(hand.profitLoss);
              if (!isNaN(sb) && !isNaN(pl)) {
                const after = sb + pl;
                return (
                  <div style={{ fontSize: 11, color: "#64748b", display: "flex", gap: 8 }}>
                    <span>{sb.toLocaleString()}</span>
                    <span style={{ color: pl >= 0 ? "#4ade80" : "#f87171" }}>{pl > 0 ? "+" : ""}{pl.toLocaleString()}</span>
                    <span style={{ color: "#475569" }}>→</span>
                    <span style={{ fontWeight: 700, color: after >= sb ? "#4ade80" : "#f87171" }}>{after.toLocaleString()}</span>
                  </div>
                );
              }
              return <span style={{ fontSize: 10, color: "#334155" }}>損益と合算してグラフに反映されます</span>;
            })()}
          </div>
        </div>

        {/* 3. SB / BB */}
        <div>
          <label style={lbl}>SB額</label>
          <input type="number" placeholder="100" value={hand.sb}
            onChange={e => update("sb", e.target.value)} style={inp} />
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          <label style={lbl}>BB = SB ×</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {[1.5, 2].map(m => {
              const sbVal = parseFloat(hand.sb);
              const bbVal = isNaN(sbVal) ? "?" : Math.round(sbVal * m * 10) / 10;
              return (
                <button key={m} onClick={() => update("bbMultiplier", m)} style={{
                  flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 700,
                  cursor: "pointer", border: "none",
                  background: hand.bbMultiplier === m ? "#1d4ed8" : "#1e293b",
                  color: hand.bbMultiplier === m ? "#fff" : "#64748b",
                  outline: hand.bbMultiplier === m ? "2px solid #3b82f6" : "none",
                }}>
                  {m}x → BB <span style={{ color: hand.bbMultiplier === m ? "#93c5fd" : "#475569" }}>{bbVal}</span>
                </button>
              );
            })}
            {hand.sb && (
              <span style={{ fontSize: 11, color: "#475569", whiteSpace: "nowrap" }}>
                {parseFloat(hand.sb)}/{Math.round(parseFloat(hand.sb) * (hand.bbMultiplier||2) * 10)/10}
              </span>
            )}
          </div>
        </div>

        {/* 4. アンティ */}
        <div style={{ gridColumn: "1/-1", display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => update("ante", !hand.ante)} style={{
            padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", border: "none",
            background: hand.ante ? "rgba(250,204,21,0.15)" : "#1e293b",
            color: hand.ante ? "#facc15" : "#64748b",
            outline: hand.ante ? "1px solid rgba(250,204,21,0.3)" : "none",
            whiteSpace: "nowrap",
          }}>
            {hand.ante ? "✓ アンティあり" : "アンティなし"}
          </button>
          {hand.ante && (() => {
            const sbv = parseFloat(hand.sb);
            const bbv = isNaN(sbv) ? 0 : Math.round(sbv * (hand.bbMultiplier||2) * 10)/10;
            return (
              <span style={{ fontSize: 11, color: "#64748b", whiteSpace: "nowrap" }}>
                BB ({bbv > 0 ? bbv : "?"}) BBのみ支払い
              </span>
            );
          })()}
        </div>

      </div>

      {/* ポジション */}
      <div>
        <label style={lbl}>ポジション</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {POSITIONS.map(p => (
            <button key={p} onClick={() => update("position", p)} style={{
              padding: "4px 12px", borderRadius: 8, fontSize: 11, fontFamily: "monospace",
              background: hand.position === p ? "#3b82f6" : "#1e293b",
              color: hand.position === p ? "#fff" : "#94a3b8",
              border: "none", cursor: "pointer",
            }}>{p}</button>
          ))}
        </div>
      </div>

      {/* Hero ホールカード */}
      {(() => {
        // 全カードを収集して使用済みセットを作る
        const allUsed = [
          ...hand.heroCards,
          ...hand.boardCards,
          ...(hand.villains || []).flatMap(v => v.cards || []),
        ].filter(Boolean);

        const usedExcept = (own) => allUsed.filter(c => !own.includes(c));

        return (
          <>
            <div>
              <label style={lbl}>ホールカード (Hero)</label>
              <MultiCardPicker
                count={2} label="ホールカード 2枚選択"
                values={hand.heroCards}
                usedCards={usedExcept(hand.heroCards)}
                onChange={cards => onChange({ ...hand, heroCards: [cards[0]||"", cards[1]||""] })}
              />
            </div>

            <div>
              <label style={lbl}>ボードカード</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, color: "#475569", minWidth: 40 }}>Flop</span>
                  <MultiCardPicker
                    count={3} label="フロップ 3枚選択"
                    values={hand.boardCards.slice(0,3)}
                    usedCards={usedExcept(hand.boardCards.slice(0,3))}
                    onChange={cards => {
                      const b = [...hand.boardCards];
                      b[0] = cards[0]||""; b[1] = cards[1]||""; b[2] = cards[2]||"";
                      onChange({ ...hand, boardCards: b });
                    }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, color: "#475569", minWidth: 40 }}>Turn</span>
                  <CardPicker value={hand.boardCards[3]} onChange={v => updateBoard(3, v)} small
                    usedCards={usedExcept([hand.boardCards[3]].filter(Boolean))} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, color: "#475569", minWidth: 40 }}>River</span>
                  <CardPicker value={hand.boardCards[4]} onChange={v => updateBoard(4, v)} small
                    usedCards={usedExcept([hand.boardCards[4]].filter(Boolean))} />
                </div>
              </div>
            </div>

            <VillainSection
              villains={hand.villains}
              allUsedCards={allUsed}
              onChange={v => update("villains", v)} />
          </>
        );
      })()}

      {/* アクション */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <label style={{ ...lbl, margin: 0 }}>アクション (ストリート別)</label>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(() => {
            const pots = calcPots(hand.streetActions, handToBlinds(hand), hand.ante);
            return STREETS.map(s => (
              <StreetBlock key={s} street={s}
                actions={hand.streetActions?.[s] || []}
                villains={hand.villains}
                blinds={handToBlinds(hand)}
                potBefore={pots[s] || 0}
                heroPos={hand.position}
                onChange={acts => updateStreet(s, acts)} />
            ));
          })()}
        </div>
      </div>

      {/* 結果 */}
      {(() => {
        const plCalc = calcHeroPL(hand.streetActions, handToBlinds(hand), hand.ante, hand.position);
        const resultColor = { ウィン: "#4ade80", ルーズ: "#f87171", チョップ: "#facc15" };

        // 結果ボタンをクリックしたら損益も自動セット
        const selectResult = (r) => {
          let pl = hand.profitLoss;
          if (plCalc && plCalc.ifWin !== undefined) {
            if (r === "ウィン") pl = String(plCalc.ifWin);
            else if (r === "ルーズ") pl = String(plCalc.ifLose);
            else if (r === "チョップ") pl = String(plCalc.ifChop);
          } else if (plCalc && plCalc.result) {
            pl = String(plCalc.profitLoss);
          }
          onChange({ ...hand, result: r, profitLoss: pl });
        };

        // フォールド自動判定
        const autoResult = plCalc?.result;
        const autoApplied = autoResult && !plCalc?.ifWin;

        return (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <label style={lbl}>結果</label>
              {autoApplied && (
                <span style={{ fontSize: 9, color: "#475569", marginBottom: 4 }}>フォールド自動判定</span>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              {RESULTS.map(r => {
                // プレビュー損益
                let preview = null;
                if (plCalc?.ifWin !== undefined) {
                  if (r === "ウィン") preview = plCalc.ifWin;
                  else if (r === "ルーズ") preview = plCalc.ifLose;
                  else if (r === "チョップ") preview = plCalc.ifChop;
                }
                const isActive = hand.result === r;
                return (
                  <button key={r} onClick={() => selectResult(r)} style={{
                    flex: 1, padding: "6px 4px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                    background: isActive ? (r==="ウィン"?"#166534":r==="ルーズ"?"#7f1d1d":"#713f12") : "#1e293b",
                    color: isActive ? resultColor[r] : "#64748b",
                    border: "none", cursor: "pointer",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
                  }}>
                    <span>{r}</span>
                    {preview !== null && (
                      <span style={{ fontSize: 9, color: preview >= 0 ? "#4ade80" : "#f87171", opacity: 0.8 }}>
                        {preview > 0 ? "+" : ""}{preview}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {/* 損益表示 */}
            <div style={{ borderRadius: 10, padding: 12, background: "#0f172a", border: "1px solid #1e293b" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: "#64748b" }}>損益 (chips)</span>
                {plCalc?.finalPot > 0 && (
                  <span style={{ fontSize: 9, color: "#334155" }}>
                    投入: {plCalc.heroInvested?.toFixed(1) ?? plCalc?.ifLose !== undefined ? Math.abs(plCalc.ifLose).toFixed(1) : "?"}
                    　最終ポット: {plCalc.finalPot?.toFixed(1) ?? "?"}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="number" placeholder="自動計算 or 手入力"
                  value={hand.profitLoss}
                  onChange={e => onChange({ ...hand, profitLoss: e.target.value, result: e.target.value === "" ? hand.result : parseFloat(e.target.value) > 0 ? "ウィン" : parseFloat(e.target.value) < 0 ? "ルーズ" : hand.result })}
                  style={{ ...inp, flex: 1 }} />
                {hand.profitLoss && (
                  <span style={{ fontSize: 20, fontWeight: 700, color: parseFloat(hand.profitLoss) >= 0 ? "#4ade80" : "#f87171", whiteSpace: "nowrap" }}>
                    {parseFloat(hand.profitLoss) > 0 ? "+" : ""}{parseFloat(hand.profitLoss).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* メモ */}
      <div>
        <label style={lbl}>メモ</label>
        <textarea rows={3} placeholder="気づき・反省点など..." value={hand.memo} onChange={e => update("memo", e.target.value)}
          style={{ ...inp, resize: "none" }} />
      </div>

      <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
        <button onClick={onSave} style={{ flex: 1, padding: "10px 0", borderRadius: 12, fontSize: 13, fontWeight: 700, background: "#3b82f6", color: "#fff", border: "none", cursor: "pointer" }}>保存する</button>
        <button onClick={onCancel} style={{ padding: "10px 20px", borderRadius: 12, fontSize: 13, background: "#1e293b", color: "#94a3b8", border: "none", cursor: "pointer" }}>キャンセル</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   AIAnalysis — /api/analyze 経由でハンドを分析
══════════════════════════════════════ */
function AIAnalysis({ hand }) {
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [analysis, setAnalysis] = useState("");
  const [mode, setMode] = useState("review");

  const buildPrompt = (m) => {
    const blinds = handToBlinds(hand);
    const heroCards = hand.heroCards.filter(Boolean).join(" ");
    const board = hand.boardCards.filter(Boolean).join(" ");
    const actorLabel = (id) => {
      if (id === "hero") return "Hero";
      const v = (hand.villains || []).find(v => v.id === id);
      return v?.name || "Villain";
    };
    const actions = STREETS.flatMap(s =>
      (hand.streetActions?.[s] || [])
        .filter(a => a.action)
        .map(a => s + " " + actorLabel(a.actor) + " " + a.action + (a.amount ? " " + a.amount : ""))
    ).join(", ");

    const parts = [
      "テキサスホールデム トーナメント",
      "ブラインド: " + (blinds || "不明"),
      "Heroポジション: " + (hand.position || "不明"),
      "Heroホールカード: " + (heroCards || "不明"),
      board ? "ボード: " + board : "",
      actions ? "アクション: " + actions : "",
      hand.result ? "結果: " + hand.result + " 損益: " + (hand.profitLoss || "不明") : "",
      hand.memo ? "メモ: " + hand.memo : "",
    ].filter(Boolean).join(" / ");

    if (m === "review") {
      return "次のポーカーハンドを日本語でレビューしてください。アクションの良し悪しと改善点を300字程度で教えてください。" + parts;
    } else {
      return "次のポーカーハンドで最善のアクションを日本語で提案してください。ミスがあれば指摘し次回どうすべきか300字程度で教えてください。" + parts;
    }
  };

  const analyze = async (m) => {
    setMode(m);
    setStatus("loading");
    setAnalysis("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: buildPrompt(m) }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "API error");
      setAnalysis(data.text);
      setStatus("done");
    } catch (e) {
      setAnalysis(String(e.message));
      setStatus("error");
    }
  };

  return (
    <div style={{ borderRadius: 12, border: "1px solid #1e3a5f", background: "#040f1f", marginBottom: 12, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 14 }}>✨</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#60a5fa", letterSpacing: 1 }}>AI ハンド分析</span>
        <span style={{ fontSize: 9, color: "#334155", marginLeft: "auto" }}>Powered by Claude</span>
      </div>
      <div style={{ padding: 16 }}>
        {status === "idle" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={() => analyze("review")} style={{
              width: "100%", padding: "12px 0", borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: "rgba(96,165,250,0.12)", color: "#60a5fa",
              border: "1px solid rgba(96,165,250,0.25)", cursor: "pointer",
            }}>🔍 このハンドをレビューする</button>
            <button onClick={() => analyze("suggest")} style={{
              width: "100%", padding: "12px 0", borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: "rgba(167,139,250,0.12)", color: "#a78bfa",
              border: "1px solid rgba(167,139,250,0.25)", cursor: "pointer",
            }}>💡 最善のアクションを提案してもらう</button>
          </div>
        )}
        {status === "loading" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 11, color: "#475569", marginBottom: 8 }}>分析中...</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 4 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: "50%", background: "#3b82f6",
                  animation: `pulse 1.2s ease-in-out ${i*0.2}s infinite`,
                }} />
              ))}
            </div>
            <style>{`@keyframes pulse{0%,80%,100%{opacity:.2}40%{opacity:1}}`}</style>
          </div>
        )}
        {status === "done" && (
          <div>
            <div style={{ fontSize: 10, color: mode === "review" ? "#60a5fa" : "#a78bfa", marginBottom: 10, fontWeight: 700, letterSpacing: 1 }}>
              {mode === "review" ? "🔍 レビュー" : "💡 アドバイス"}
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.8, color: "#cbd5e1", margin: 0, whiteSpace: "pre-wrap" }}>{analysis}</p>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button onClick={() => analyze(mode === "review" ? "suggest" : "review")} style={{
                flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 11, fontWeight: 700,
                background: "#1e293b", color: "#94a3b8", border: "none", cursor: "pointer",
              }}>{mode === "review" ? "💡 アドバイスも見る" : "🔍 レビューも見る"}</button>
              <button onClick={() => { setStatus("idle"); setAnalysis(""); }} style={{
                padding: "9px 14px", borderRadius: 8, fontSize: 11,
                background: "#1e293b", color: "#475569", border: "none", cursor: "pointer",
              }}>戻る</button>
            </div>
          </div>
        )}
        {status === "error" && (
          <div style={{ padding: "8px 0" }}>
            <div style={{ fontSize: 12, color: "#f87171", marginBottom: 6 }}>分析に失敗しました</div>
            {analysis && <div style={{ fontSize: 10, color: "#475569", marginBottom: 10, wordBreak: "break-all", background: "#0f172a", borderRadius: 6, padding: "6px 8px", fontFamily: "monospace" }}>{analysis}</div>}
            <button onClick={() => { setStatus("idle"); setAnalysis(""); }} style={{
              padding: "8px 20px", borderRadius: 8, fontSize: 12,
              background: "#1e293b", color: "#94a3b8", border: "none", cursor: "pointer",
            }}>やり直す</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   DetailView
══════════════════════════════════════ */
function DetailView({ hand }) {
  const resultColor = { ウィン: "#4ade80", ルーズ: "#f87171", チョップ: "#facc15" };
  const pl = parseFloat(hand.profitLoss);
  const villainColors = ["#f97316","#a78bfa","#34d399","#f472b6","#facc15"];

  const Section = ({ title, children }) => (
    <div style={{ borderRadius: 12, padding: 16, border: "1px solid #1e293b", marginBottom: 12, background: "#0f172a" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );

  const CardFace = ({ val }) => {
    if (!val) return null;
    const suit = val.slice(-1), rank = val.slice(0, -1);
    return (
      <div style={{ width: 40, height: 56, borderRadius: 8, background: SUIT_BG[suit] || "#1e293b", border: `1px solid ${SUIT_COLOR[suit] || "#334155"}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: SUIT_COLOR[suit], lineHeight: 1 }}>{rank}</span>
        <span style={{ fontSize: 18, color: SUIT_COLOR[suit], lineHeight: 1 }}>{suit}</span>
      </div>
    );
  };

  const hasActions = STREETS.some(s => (hand.streetActions?.[s]?.length || 0) > 0);
  const villains = hand.villains || [];

  const actorLabel = (id) => {
    if (id === "hero") return { label: "Hero", color: "#60a5fa" };
    const idx = villains.findIndex(v => v.id === id);
    if (idx >= 0) return { label: villains[idx].name || `V${idx+1}`, color: villainColors[idx % 5] };
    return { label: "?", color: "#94a3b8" };
  };

  return (
    <div>
      <Section title="基本情報">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
          {[["日付", hand.date],["ポジション", hand.position || "―"],["ブラインド", handToBlinds(hand) || "―"]].map(([l,v]) => (
            <div key={l}>
              <div style={{ fontSize: 10, color: "#64748b" }}>{l}</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2, color: l==="ポジション"?"#60a5fa":"#e2e8f0" }}>{v}</div>
            </div>
          ))}
        </div>
        {hand.tournament && <div style={{ marginTop: 10, fontSize: 11, textAlign: "center", color: "#64748b" }}>{hand.tournament}</div>}
      </Section>

      <Section title="カード">
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: "#64748b", marginBottom: 6 }}>Hero</div>
          <div style={{ display: "flex", gap: 6 }}>{hand.heroCards.map((c,i) => <CardFace key={i} val={c} />)}</div>
        </div>
        {hand.boardCards?.filter(Boolean).length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 6 }}>ボード</div>
            <div style={{ display: "flex", gap: 6 }}>{hand.boardCards.map((c,i) => <CardFace key={i} val={c} />)}</div>
          </div>
        )}
        {villains.map((v, i) => (v.cards?.filter(Boolean).length > 0 || v.position) && (
          <div key={v.id} style={{ marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: villainColors[i % 5] }}>{v.name || `Villain ${i+1}`}</span>
              {v.position && (
                <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: villainColors[i%5] + "22", color: villainColors[i%5], fontFamily: "monospace" }}>{v.position}</span>
              )}
            </div>
            {v.cards?.filter(Boolean).length > 0 && (
              <div style={{ display: "flex", gap: 6 }}>{v.cards.map((c,j) => <CardFace key={j} val={c} />)}</div>
            )}
          </div>
        ))}
      </Section>

      <Section title="アクション">
        {hasActions ? (() => {
          const pots = calcPots(hand.streetActions, handToBlinds(hand), hand.ante);
          return STREETS.map(street => {
            const acts = (hand.streetActions?.[street] || []).filter(a => a.action);
            if (!acts.length) return null;
            const potStart = pots[street] || 0;
            return (
              <div key={street} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#334155", letterSpacing: 1, textTransform: "uppercase" }}>{street}</div>
                  {potStart > 0 && (
                    <div style={{ fontSize: 9, color: "#475569" }}>
                      pot <span style={{ color: "#64748b", fontFamily: "monospace" }}>{potStart.toFixed(1)}</span>
                    </div>
                  )}
                </div>
                <div style={{ borderLeft: "2px solid #1e293b", paddingLeft: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                  {acts.map((act, i) => {
                    const { label, color } = actorLabel(act.actor);
                    const amt = parseFloat(act.amount);
                    const pct = (!isNaN(amt) && potStart > 0 && street !== "プリフロップ")
                      ? Math.round(amt / potStart * 100) : null;
                    return (
                      <div key={act.id || i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, border: "2px solid #020817", marginLeft: -17, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 52 }}>{label}</span>
                        <span style={{ fontSize: 12, color: "#e2e8f0" }}>{act.action}</span>
                        {act.amount && (
                          <span style={{ fontSize: 11, color: "#64748b", marginLeft: "auto", fontFamily: "monospace" }}>
                            {Number(act.amount).toLocaleString()}
                            {pct !== null && <span style={{ color: "#475569", marginLeft: 4 }}>({pct}%)</span>}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          });
        })() : <div style={{ fontSize: 12, color: "#334155" }}>アクション記録なし</div>}
      </Section>

      {(hand.result || hand.profitLoss) && (
        <Section title="結果">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
            {hand.result && <div><div style={{ fontSize: 10, color: "#64748b" }}>結果</div><div style={{ fontSize: 14, fontWeight: 700, marginTop: 2, color: resultColor[hand.result] }}>{hand.result}</div></div>}
            {hand.profitLoss && <div><div style={{ fontSize: 10, color: "#64748b" }}>損益</div><div style={{ fontSize: 14, fontWeight: 700, marginTop: 2, color: pl >= 0 ? "#4ade80" : "#f87171" }}>{pl > 0 ? "+" : ""}{pl.toLocaleString()}</div></div>}
            {(() => { const fp = calcPots(hand.streetActions, handToBlinds(hand), hand.ante); const finalPot = fp["__final__"]; return finalPot > 0 ? <div><div style={{ fontSize: 10, color: "#64748b" }}>最終ポット</div><div style={{ fontSize: 14, marginTop: 2, fontFamily: "monospace" }}>{finalPot.toFixed(1)}</div></div> : null; })()}
          </div>
        </Section>
      )}

      {hand.memo && (
        <Section title="メモ">
          <p style={{ fontSize: 13, lineHeight: 1.6, color: "#94a3b8", margin: 0 }}>{hand.memo}</p>
        </Section>
      )}

      <AIAnalysis hand={hand} />
    </div>
  );
}

/* ══════════════════════════════════════
   HandCard (list)
══════════════════════════════════════ */
function HandCard({ hand, onClick }) {
  const resultColor = { ウィン: "#4ade80", ルーズ: "#f87171", チョップ: "#facc15" };
  const pl = parseFloat(hand.profitLoss);
  const allActions = Object.values(hand.streetActions || {}).flat().filter(a => a.action);

  return (
    <div onClick={onClick} style={{
      borderRadius: 12, padding: 14, cursor: "pointer",
      border: "1px solid #1e293b", background: "#0f172a",
      transition: "border-color 0.15s",
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = "#334155"}
    onMouseLeave={e => e.currentTarget.style.borderColor = "#1e293b"}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {hand.position && (
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "#1e293b", color: "#60a5fa", fontFamily: "monospace" }}>{hand.position}</span>
          )}
          {hand.heroCards.filter(Boolean).length === 2 && (
            <span style={{ fontWeight: 700, color: "#e2e8f0", letterSpacing: 1 }}>{hand.heroCards[0]}{hand.heroCards[1]}</span>
          )}
          {(hand.villains?.length || 0) > 1 && (
            <span style={{ fontSize: 10, color: "#475569" }}>{hand.villains.length}人対戦</span>
          )}
        </div>
        {hand.result && (
          <span style={{ fontSize: 13, fontWeight: 700, flexShrink: 0, color: resultColor[hand.result] }}>
            {hand.result}{hand.profitLoss ? ` ${pl > 0 ? "+" : ""}${pl.toLocaleString()}` : ""}
          </span>
        )}
      </div>
      {allActions.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
          {allActions.slice(0, 8).map((a, i) => {
            const vIdx = (hand.villains || []).findIndex(v => v.id === a.actor);
            const colors = ["#f97316","#a78bfa","#34d399","#f472b6","#facc15"];
            const col = a.actor === "hero" ? "#60a5fa" : (vIdx >= 0 ? colors[vIdx % 5] : "#94a3b8");
            const bg  = a.actor === "hero" ? "rgba(96,165,250,0.1)" : `rgba(${vIdx===0?"249,115,22":vIdx===1?"167,139,250":vIdx===2?"52,211,153":vIdx===3?"244,114,182":"250,204,21"},0.1)`;
            return (
              <span key={i} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: bg, color: col }}>
                {a.action}
              </span>
            );
          })}
          {allActions.length > 8 && <span style={{ fontSize: 10, color: "#334155" }}>+{allActions.length - 8}</span>}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "#64748b" }}>{hand.date}{hand.tournament ? ` · ${hand.tournament}` : ""}</span>
        {hand.boardCards?.filter(Boolean).length > 0 && (
          <span style={{ fontSize: 11, color: "#475569", fontFamily: "monospace" }}>{hand.boardCards.filter(Boolean).join(" ")}</span>
        )}
      </div>
      {hand.memo && <p style={{ fontSize: 11, marginTop: 4, color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{hand.memo}</p>}
    </div>
  );
}

/* ══════════════════════════════════════
   ChipChart — トーナメント内スタック推移グラフ
   stackAfter がある → 実スタック値をプロット
   stackAfter がない → 累積損益で補完
══════════════════════════════════════ */
function ChipChart({ hands, color }) {
  if (!hands.length) return null;

  // ポイントを構築
  // stackBefore がある → ハンド前スタック + 損益 = ハンド後スタックをプロット
  // stackBefore がない → 前のポイントに profitLoss を加算して補完
  // ハンドは新しい順で保存されているため、古い順（昇順）にソート
  const sorted = [...hands].sort((a, b) => a.id - b.id);

  const pts = []; // { x, y, real, label }
  // real=true: stackBefore入力あり（実測点）  real=false: 損益から補完

  // ── 共通ロジック ──
  // 1. 最初に損益または stackBefore がある最初のハンドを起点として確定
  // 2. 以降は:
  //    - stackBefore あり → 現在のスタックを強制更新（アンカー）し、損益を加算
  //    - stackBefore なし → 前のスタックから損益を加算
  // 3. 損益も stackBefore もないハンドはスキップ

  // ── ステップ1: 各ハンドに beforeStack / afterStack を付与 ──
  // まず全ハンドを走査して「最初のstackBefore」を見つけ、
  // そこより前のハンドは逆算して beforeStack を埋める

  // 全ハンドに仮の情報を付与
  const raw = sorted.map((h, i) => {
    const sb = parseFloat(h.stackBefore);
    const pl = parseFloat(h.profitLoss);
    return {
      handIdx: i,
      hasSB: h.stackBefore !== "" && !isNaN(sb),
      hasPL: h.profitLoss !== "" && !isNaN(pl),
      sb: h.stackBefore !== "" && !isNaN(sb) ? sb : null,
      pl: h.profitLoss !== "" && !isNaN(pl) ? pl : null,
    };
  }).filter(h => h.hasSB || h.hasPL);

  if (raw.length === 0) return (
    <div style={{ fontSize: 10, color: "#334155", padding: "8px 0" }}>
      損益を2ハンド以上記録するとグラフが表示されます
    </div>
  );

  // 最初のstackBeforeが何番目にあるか探す
  const firstAnchorIdx = raw.findIndex(h => h.hasSB);

  // beforeStack を前から埋める
  const enriched = raw.map((h, ri) => ({ ...h, beforeStack: null, afterStack: null }));

  if (firstAnchorIdx >= 0) {
    // アンカーより前のハンドは逆算（アンカーのstackBefore - それ以前の損益合計）
    let stack = raw[firstAnchorIdx].sb;
    enriched[firstAnchorIdx].beforeStack = stack;
    enriched[firstAnchorIdx].afterStack = stack + (raw[firstAnchorIdx].pl || 0);

    // アンカーより後ろは順方向に計算
    let runFwd = enriched[firstAnchorIdx].afterStack;
    for (let ri = firstAnchorIdx + 1; ri < enriched.length; ri++) {
      const h = enriched[ri];
      if (h.hasSB) {
        // 新しいアンカー
        h.beforeStack = h.sb;
        h.afterStack = h.sb + (h.pl || 0);
        runFwd = h.afterStack;
      } else {
        h.beforeStack = runFwd;
        h.afterStack = runFwd + (h.pl || 0);
        runFwd = h.afterStack;
      }
    }

    // アンカーより前は逆方向に計算（損益を引いて遡る）
    let runBwd = enriched[firstAnchorIdx].beforeStack;
    for (let ri = firstAnchorIdx - 1; ri >= 0; ri--) {
      const h = enriched[ri];
      const plAfter = h.pl || 0;
      h.afterStack = runBwd;
      h.beforeStack = runBwd - plAfter;
      runBwd = h.beforeStack;
    }
  } else {
    // stackBefore が一つもない → 0起点で累積
    let runStack = 0;
    enriched.forEach(h => {
      h.beforeStack = runStack;
      h.afterStack = runStack + (h.pl || 0);
      runStack = h.afterStack;
    });
  }

  // ── ステップ2: enriched からプロット点を生成 ──
  const enrichedValid = enriched.filter(e => e.beforeStack !== null);
  if (enrichedValid.length >= 1) {
    pts.push({
      x: 0,
      y: enrichedValid[0].beforeStack,
      real: enrichedValid[0].hasSB,
      label: `H${enrichedValid[0].handIdx + 1}前`
    });

    enrichedValid.forEach((e, ei) => {
      if (ei > 0) {
        const prev = enrichedValid[ei - 1];
        if (Math.abs(e.beforeStack - prev.afterStack) > 0.01) {
          pts.push({ x: pts.length, y: e.beforeStack, real: false, label: "" });
        }
      }
      pts.push({
        x: pts.length,
        y: e.afterStack,
        real: e.hasSB,
        label: `H${e.handIdx + 1}`
      });
    });
  }

  if (pts.length < 2) return null;

  const W = 320, H = 130, PAD = { t: 16, r: 40, b: 28, l: 52 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  const xVals = pts.map(p => p.x);
  const yVals = pts.map(p => p.y);
  const minX = Math.min(...xVals), maxX = Math.max(...xVals);
  const minV = Math.min(...yVals), maxV = Math.max(...yVals);
  const rangeX = maxX - minX || 1;
  const rangeY = maxV - minV || 1;

  const toX = x => PAD.l + ((x - minX) / rangeX) * innerW;
  const toY = v => PAD.t + innerH - ((v - minV) / rangeY) * innerH;

  const finalVal = pts[pts.length - 1].y;
  const lineColor = finalVal >= (pts[0]?.y || 0) ? "#4ade80" : "#f87171";

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${toX(p.x).toFixed(1)},${toY(p.y).toFixed(1)}`).join(" ");
  const fillPath = linePath + ` L${toX(pts[pts.length-1].x).toFixed(1)},${(PAD.t+innerH).toFixed(1)} L${toX(pts[0].x).toFixed(1)},${(PAD.t+innerH).toFixed(1)} Z`;

  // Y軸ラベル
  const ySteps = [minV, (minV + maxV) / 2, maxV];
  const gradId = "chip-grad-" + color.replace("#","");
  const isStackMode = enriched.some(e => e.hasSB);

  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 9, color: "#475569", letterSpacing: 1, textTransform: "uppercase" }}>
          {isStackMode ? "スタック推移" : "チップ変化"}
        </span>
        {!isStackMode && (
          <span style={{ fontSize: 9, color: "#334155" }}>ハンド前スタックを入力するとより正確になります</span>
        )}
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.2" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* グリッド */}
        {ySteps.map((v, i) => (
          <line key={i} x1={PAD.l} y1={toY(v).toFixed(1)} x2={W-PAD.r} y2={toY(v).toFixed(1)}
            stroke="#1e293b" strokeWidth="1" strokeDasharray="3,3" />
        ))}
        {/* 塗りつぶし */}
        <path d={fillPath} fill={`url(#${gradId})`} />
        {/* 補完区間は破線 */}
        {pts.map((p, i) => {
          if (i === 0) return null;
          const prev = pts[i - 1];
          const isDashed = !p.real;
          return (
            <line key={i}
              x1={toX(prev.x).toFixed(1)} y1={toY(prev.y).toFixed(1)}
              x2={toX(p.x).toFixed(1)} y2={toY(p.y).toFixed(1)}
              stroke={lineColor} strokeWidth="2" strokeLinecap="round"
              strokeDasharray={isDashed ? "4,3" : "none"} />
          );
        })}
        {/* ポイント */}
        {pts.map((p, i) => (
          <circle key={i} cx={toX(p.x).toFixed(1)} cy={toY(p.y).toFixed(1)} r={p.real ? "3.5" : "2"}
            fill={p.real ? lineColor : "#334155"} stroke="#020817" strokeWidth="1.5" />
        ))}
        {/* Y軸ラベル */}
        {ySteps.map((v, i) => (
          <text key={i} x={PAD.l - 4} y={toY(v) + 4} textAnchor="end"
            fontSize="8" fill="#475569" fontFamily="monospace">
            {Math.round(v).toLocaleString()}
          </text>
        ))}
        {/* 最終値 */}
        <text x={toX(pts[pts.length-1].x) + 5} y={toY(finalVal) + 4}
          fontSize="9" fontWeight="700" fill={lineColor} fontFamily="monospace">
          {Math.round(finalVal).toLocaleString()}
        </text>
        {/* X軸 手番号 */}
        {pts.filter((_, i) => i === 0 || i === pts.length-1 || pts.length <= 6).map((p, i) => (
          <text key={i} x={toX(p.x)} y={H - 4} textAnchor="middle"
            fontSize="8" fill="#334155" fontFamily="monospace">{p.label}</text>
        ))}
      </svg>
      {/* 凡例 */}
      {isStackMode && (
        <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <svg width="16" height="8"><line x1="0" y1="4" x2="16" y2="4" stroke={lineColor} strokeWidth="2" /></svg>
            <span style={{ fontSize: 8, color: "#475569" }}>実スタック</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <svg width="16" height="8"><line x1="0" y1="4" x2="16" y2="4" stroke={lineColor} strokeWidth="2" strokeDasharray="4,3" /></svg>
            <span style={{ fontSize: 8, color: "#334155" }}>損益から補完</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   StatsBlock — 共通の統計ブロック
══════════════════════════════════════ */
function StatsBlock({ hands, title, accent }) {
  if (!hands.length) return null;
  const wins = hands.filter(h => h.result === "ウィン").length;
  const losses = hands.filter(h => h.result === "ルーズ").length;
  const totalPL = hands.reduce((s, h) => s + (parseFloat(h.profitLoss) || 0), 0);
  const posStats = {};
  POSITIONS.forEach(p => {
    const ph = hands.filter(h => h.position === p);
    if (ph.length) posStats[p] = ph.reduce((s, h) => s + (parseFloat(h.profitLoss) || 0), 0);
  });
  const col = accent || "#60a5fa";
  return (
    <div style={{ borderRadius: 12, padding: 14, border: "1px solid #1e293b", background: "#0f172a" }}>
      {title && <div style={{ fontSize: 10, fontWeight: 700, color: col, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10, opacity: 0.8 }}>{title}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: posStats && Object.keys(posStats).length ? 10 : 0, textAlign: "center" }}>
        {[
          ["ハンド", hands.length, "#e2e8f0"],
          ["勝ち", wins, "#4ade80"],
          ["負け", losses, "#f87171"],
          ["損益", `${totalPL > 0 ? "+" : ""}${totalPL.toLocaleString()}`, totalPL >= 0 ? "#4ade80" : "#f87171"],
        ].map(([l,v,c]) => (
          <div key={l}>
            <div style={{ fontSize: 18, fontWeight: 700, color: c, lineHeight: 1.1 }}>{v}</div>
            <div style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>
      {Object.keys(posStats).length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
          {Object.entries(posStats).map(([pos, pl]) => (
            <span key={pos} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 5, background: "#1e293b", color: pl >= 0 ? "#4ade80" : "#f87171", fontFamily: "monospace" }}>
              {pos} {pl >= 0 ? "+" : ""}{pl.toFixed(0)}
            </span>
          ))}
        </div>
      )}
      {!title && <ChipChart hands={hands} color={col || "default"} />}
    </div>
  );
}

/* ══════════════════════════════════════
   Stats — 全体 + トーナメント別
══════════════════════════════════════ */
function Stats({ hands }) {
  const [openTournament, setOpenTournament] = useState(null);
  if (!hands.length) return null;

  // トーナメント別にグループ化
  const tournamentMap = {};
  hands.forEach(h => {
    const key = h.tournament?.trim() || "（未設定）";
    if (!tournamentMap[key]) tournamentMap[key] = [];
    tournamentMap[key].push(h);
  });
  const tournaments = Object.entries(tournamentMap).sort((a, b) => b[1].length - a[1].length);
  const tColors = ["#60a5fa","#a78bfa","#34d399","#f97316","#f472b6","#facc15"];

  return (
    <div style={{ marginBottom: 14, display: "flex", flexDirection: "column", gap: 8 }}>
      {/* 全体統計 */}
      <StatsBlock hands={hands} title="全体" accent="#475569" />

      {/* トーナメント別 */}
      {tournaments.map(([name, hs], i) => {
        const isOpen = openTournament === name;
        const tPL = hs.reduce((s, h) => s + (parseFloat(h.profitLoss) || 0), 0);
        const col = tColors[i % tColors.length];
        return (
          <div key={name} style={{ borderRadius: 12, border: `1px solid ${isOpen ? col + "44" : "#1e293b"}`, overflow: "hidden", background: "#0a1628" }}>
            {/* トーナメントヘッダー */}
            <button onClick={() => setOpenTournament(isOpen ? null : name)}
              style={{ width: "100%", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: col, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", textAlign: "left" }}>{name}</span>
                <span style={{ fontSize: 10, color: "#475569" }}>{hs.length}ハンド</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: tPL >= 0 ? "#4ade80" : "#f87171" }}>
                  {tPL > 0 ? "+" : ""}{tPL.toLocaleString()}
                </span>
                <span style={{ fontSize: 10, color: "#334155" }}>{isOpen ? "▲" : "▼"}</span>
              </div>
            </button>
            {/* 展開時の詳細 */}
            {isOpen && (
              <div style={{ padding: "0 14px 14px" }}>
                <StatsBlock hands={hs} accent={col} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════
   HomeScreen
══════════════════════════════════════ */
function HomeScreen({ handsCount, onNew, onRecords }) {
  return (
    <div style={{ padding: "40px 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🃏</div>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 3, color: "#e2e8f0" }}>POKER LOG</div>
        <div style={{ fontSize: 11, color: "#334155", marginTop: 4, letterSpacing: 1 }}>HAND HISTORY TRACKER</div>
      </div>
      <button onClick={onNew} style={{
        width: "100%", padding: "20px 0", borderRadius: 16, fontSize: 15, fontWeight: 700,
        background: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
        color: "#fff", border: "none", cursor: "pointer",
        boxShadow: "0 4px 24px rgba(59,130,246,0.3)", letterSpacing: 1,
      }}>
        ＋ 新しいハンドを記録
      </button>
      <button onClick={onRecords} style={{
        width: "100%", padding: "20px 0", borderRadius: 16, fontSize: 15, fontWeight: 700,
        background: "#0f172a", color: "#94a3b8",
        border: "1px solid #1e293b", cursor: "pointer", letterSpacing: 1,
      }}>
        📋 記録を確認する
        {handsCount > 0 && (
          <span style={{ marginLeft: 8, fontSize: 11, color: "#475569", fontWeight: 400 }}>
            {handsCount}ハンド
          </span>
        )}
      </button>
    </div>
  );
}

/* ══════════════════════════════════════
   App
══════════════════════════════════════ */
export default function PokerTracker() {
  const [hands, setHands] = useState(() => {
    try { return JSON.parse(localStorage.getItem("poker_hands_v3") || "[]"); } catch { return []; }
  });
  // view: "home" | "form" | "records" | "detail"
  const [view, setView] = useState("home");
  const [currentHand, setCurrentHand] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    try { localStorage.setItem("poker_hands_v3", JSON.stringify(hands)); } catch {}
  }, [hands]);

  useEffect(() => {
    setHands(hs => hs.map(h => {
      let sb = h.sb, bbMul = h.bbMultiplier || 2;
      if (!sb && h.blinds) {
        const parts = h.blinds.split("/").map(parseFloat);
        if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          sb = String(parts[0]);
          bbMul = Math.abs(parts[1] / parts[0] - 1.5) < Math.abs(parts[1] / parts[0] - 2) ? 1.5 : 2;
        }
      }
      return {
        ...h, sb: sb || "", bbMultiplier: bbMul,
        villains: h.villains || [{ id: "v0", name: "", cards: h.villainCards || ["",""] }],
        streetActions: h.streetActions || initialStreetActions(),
        ante: h.ante !== undefined ? h.ante : true,
        stackBefore: h.stackBefore !== undefined ? h.stackBefore : (h.stackAfter !== undefined ? h.stackAfter : ""),
      };
    }));
  }, []);

  const saveHand = () => {
    if (editingId) setHands(hs => hs.map(h => h.id === editingId ? { ...currentHand, id: editingId } : h));
    else setHands(hs => [{ ...currentHand, id: Date.now() }, ...hs]);
    setView("home"); setCurrentHand(null); setEditingId(null);
  };
  const deleteHand = (id) => { setHands(hs => hs.filter(h => h.id !== id)); setView("records"); };
  const goBack = () => {
    if (view === "form" && editingId) { setView("detail"); setEditingId(null); return; }
    if (view === "form") { setView("home"); setCurrentHand(null); return; }
    if (view === "detail") { setView("records"); return; }
    setView("home");
  };

  const filtered = filter
    ? hands.filter(h =>
        h.tournament?.includes(filter) || h.position?.includes(filter) ||
        h.heroCards?.join("").includes(filter) || h.memo?.includes(filter) ||
        Object.values(h.streetActions || {}).flat().some(a => a.action?.includes(filter))
      )
    : hands;

  const headerTitle = {
    home: "♠ POKER LOG",
    form: editingId ? "✏ 編集" : "新規ハンド",
    records: "記録一覧",
    detail: "ハンド詳細",
  }[view];

  return (
    <div style={{ minHeight: "100vh", background: "#020817", color: "#e2e8f0", fontFamily: "'JetBrains Mono','Fira Code',monospace" }}>
      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "rgba(2,8,23,0.97)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid #0f172a",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {view !== "home" && (
            <button onClick={goBack} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 18, paddingRight: 4 }}>←</button>
          )}
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, color: "#e2e8f0" }}>{headerTitle}</span>
        </div>
        {view === "detail" && currentHand && (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setEditingId(currentHand.id); setView("form"); }}
              style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, background: "#1e293b", color: "#94a3b8", border: "none", cursor: "pointer" }}>編集</button>
            <button onClick={() => deleteHand(currentHand.id)}
              style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, background: "#7f1d1d", color: "#f87171", border: "none", cursor: "pointer" }}>削除</button>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 520, margin: "0 auto" }}>

        {/* ── HOME ── */}
        {view === "home" && (
          <HomeScreen
            handsCount={hands.length}
            onNew={() => { setCurrentHand(initialHand()); setEditingId(null); setView("form"); }}
            onRecords={() => setView("records")}
          />
        )}

        {/* ── RECORDS ── */}
        {view === "records" && (
          <div style={{ padding: "16px" }}>
            <Stats hands={hands} />
            {hands.length > 0 && (
              <input placeholder="🔍 検索..." value={filter} onChange={e => setFilter(e.target.value)}
                style={{ width: "100%", borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none", marginBottom: 12, background: "#0f172a", border: "1px solid #1e293b", color: "#e2e8f0" }} />
            )}
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "64px 0", color: "#334155" }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
                <div style={{ fontSize: 13 }}>記録がありません</div>
              </div>
            ) : (() => {
              const tColors = ["#60a5fa","#a78bfa","#34d399","#f97316","#f472b6","#facc15"];
              if (filter) {
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {filtered.map(h => <HandCard key={h.id} hand={h} onClick={() => { setCurrentHand(h); setView("detail"); }} />)}
                  </div>
                );
              }
              const groups = {};
              filtered.forEach(h => {
                const key = h.tournament?.trim() || "（未設定）";
                if (!groups[key]) groups[key] = [];
                groups[key].push(h);
              });
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {Object.entries(groups).map(([name, hs], gi) => {
                    const col = tColors[gi % tColors.length];
                    const tPL = hs.reduce((s, h) => s + (parseFloat(h.profitLoss) || 0), 0);
                    return (
                      <div key={name}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, padding: "0 2px" }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: col }} />
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8" }}>{name}</span>
                          <span style={{ fontSize: 10, color: "#334155" }}>{hs.length}ハンド</span>
                          <span style={{ fontSize: 11, fontWeight: 700, marginLeft: "auto", color: tPL >= 0 ? "#4ade80" : "#f87171" }}>
                            {tPL > 0 ? "+" : ""}{tPL.toLocaleString()}
                          </span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {hs.map(h => <HandCard key={h.id} hand={h} onClick={() => { setCurrentHand(h); setView("detail"); }} />)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {view === "form" && currentHand && (
          <div style={{ padding: "16px" }}>
            <HandForm hand={currentHand} onChange={setCurrentHand} onSave={saveHand} onCancel={goBack}
              existingTournaments={[...new Set(hands.map(h => h.tournament?.trim()).filter(Boolean))]} />
          </div>
        )}
        {view === "detail" && currentHand && (
          <div style={{ padding: "16px" }}>
            <DetailView hand={currentHand} />
          </div>
        )}
      </div>
    </div>
  );
}
