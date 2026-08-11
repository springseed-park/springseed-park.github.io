"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { MemberAddress } from "./AuthProvider";

type PostcodeResult = {
  zonecode: string;
  userSelectedType: "R" | "J";
  roadAddress: string;
  jibunAddress: string;
  bname: string;
  buildingName: string;
  apartment: "Y" | "N";
};

type PostcodeConstructor = new (options: {
  oncomplete: (data: PostcodeResult) => void;
  onresize?: (size: { height: number }) => void;
  width?: string;
  height?: string;
  maxSuggestItems?: number;
}) => { embed: (element: HTMLElement) => void };

declare global {
  interface Window {
    daum?: { Postcode?: PostcodeConstructor };
    kakao?: { Postcode?: PostcodeConstructor };
  }
}

const postcodeScriptId = "kakao-postcode-service";

function loadPostcodeScript() {
  return new Promise<PostcodeConstructor>((resolve, reject) => {
    const ready = window.kakao?.Postcode ?? window.daum?.Postcode;
    if (ready) {
      resolve(ready);
      return;
    }

    let script = document.getElementById(postcodeScriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = postcodeScriptId;
      script.src = "https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
      script.async = true;
      document.head.appendChild(script);
    }

    const handleLoad = () => {
      const Postcode = window.kakao?.Postcode ?? window.daum?.Postcode;
      if (Postcode) resolve(Postcode);
      else reject(new Error("postcode-api-unavailable"));
    };
    const handleError = () => {
      script?.remove();
      reject(new Error("postcode-script-failed"));
    };
    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });
  });
}

type PostcodeFieldsProps = {
  initial?: Partial<Pick<MemberAddress, "postalCode" | "addressLine1" | "addressLine2">>;
  detailRequired?: boolean;
};

export default function PostcodeFields({ initial, detailRequired = false }: PostcodeFieldsProps) {
  const [postalCode, setPostalCode] = useState(initial?.postalCode ?? "");
  const [addressLine1, setAddressLine1] = useState(initial?.addressLine1 ?? "");
  const [addressLine2, setAddressLine2] = useState(initial?.addressLine2 ?? "");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const embedRoot = useRef<HTMLDivElement>(null);
  const detailInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !embedRoot.current) return;
    let active = true;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setLoading(true);
    setError("");

    loadPostcodeScript()
      .then((Postcode) => {
        if (!active || !embedRoot.current) return;
        embedRoot.current.replaceChildren();
        new Postcode({
          oncomplete: (data) => {
            let address = data.userSelectedType === "R" ? data.roadAddress : data.jibunAddress;
            if (data.userSelectedType === "R") {
              const extra: string[] = [];
              if (data.bname && /[동로가]$/.test(data.bname)) extra.push(data.bname);
              if (data.buildingName && data.apartment === "Y") extra.push(data.buildingName);
              if (extra.length) address += ` (${extra.join(", ")})`;
            }
            setPostalCode(data.zonecode);
            setAddressLine1(address);
            setOpen(false);
            window.setTimeout(() => detailInput.current?.focus(), 0);
          },
          onresize: ({ height }) => {
            if (embedRoot.current) embedRoot.current.style.height = `${Math.min(560, Math.max(420, height))}px`;
          },
          width: "100%",
          height: "100%",
          maxSuggestItems: 5,
        }).embed(embedRoot.current);
      })
      .catch(() => setError("주소 검색 서비스를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."))
      .finally(() => setLoading(false));

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      active = false;
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <>
      <label>
        우편번호
        <span className="input-action postcode-action">
          <input name="postalCode" required value={postalCode} readOnly placeholder="우편번호" />
          <button type="button" onClick={() => setOpen(true)}><Search />주소 검색</button>
        </span>
      </label>
      <label className="full">
        주소
        <input name="addressLine1" required value={addressLine1} readOnly placeholder="주소 검색을 이용해 주세요" />
      </label>
      <label className="full">
        상세 주소
        <input ref={detailInput} name="addressLine2" required={detailRequired} value={addressLine2} onChange={(event) => setAddressLine2(event.target.value)} placeholder="동·호수 등 상세 주소" />
      </label>

      {open && <div className="postcode-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
        <section className="postcode-dialog" role="dialog" aria-modal="true" aria-labelledby="postcode-title">
          <header><div><p>DELIVERY ADDRESS</p><h2 id="postcode-title">우편번호 검색</h2></div><button type="button" onClick={() => setOpen(false)} aria-label="주소 검색 닫기"><X /></button></header>
          <p className="postcode-guide">도로명, 건물명 또는 지번을 입력한 뒤 주소를 선택해 주세요.</p>
          {loading && <div className="postcode-loading">주소 검색을 불러오는 중입니다.</div>}
          {error && <div className="postcode-error"><p>{error}</p><button type="button" onClick={() => { setOpen(false); window.setTimeout(() => setOpen(true), 0); }}>다시 시도</button></div>}
          <div className="postcode-embed" ref={embedRoot} />
        </section>
      </div>}
    </>
  );
}
