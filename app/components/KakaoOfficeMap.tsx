"use client";

import { useEffect, useRef, useState } from "react";

const kakaoJavascriptKey = "43e762453f634419a2292567a27bd0aa";
const kakaoMapScriptId = "kakao-map-sdk";

function loadKakaoMapSdk() {
  return new Promise<KakaoMapsApi>((resolve, reject) => {
    const ready = window.kakao?.maps;
    if (ready) {
      ready.load(() => resolve(ready));
      return;
    }

    const finish = () => {
      const maps = window.kakao?.maps;
      if (!maps) {
        reject(new Error("Kakao Maps SDK unavailable"));
        return;
      }
      maps.load(() => resolve(maps));
    };

    const existing = document.getElementById(kakaoMapScriptId) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener("error", () => reject(new Error("Kakao Maps SDK failed to load")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = kakaoMapScriptId;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoJavascriptKey}&autoload=false`;
    script.async = true;
    script.addEventListener("load", finish, { once: true });
    script.addEventListener("error", () => reject(new Error("Kakao Maps SDK failed to load")), { once: true });
    document.head.appendChild(script);
  });
}

type KakaoOfficeMapProps = {
  latitude: number;
  longitude: number;
  mapUrl: string;
};

export default function KakaoOfficeMap({ latitude, longitude, mapUrl }: KakaoOfficeMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!container.current || initialized.current) return;
    let active = true;

    loadKakaoMapSdk()
      .then((maps) => {
        if (!active || !container.current || initialized.current) return;
        const position = new maps.LatLng(latitude, longitude);
        const map = new maps.Map(container.current, { center: position, level: 3 });
        new maps.Marker({ map, position, title: "MAISON ÉLAN ATELIER" });
        map.addControl(new maps.ZoomControl(), maps.ControlPosition.RIGHT);
        initialized.current = true;
        setState("ready");
      })
      .catch(() => active && setState("error"));

    return () => { active = false; };
  }, [latitude, longitude]);

  return (
    <div className="showroom-map" aria-label="메종 엘란 서울 아틀리에 지도">
      <div ref={container} className="showroom-map-canvas" />
      {state === "loading" && <div className="showroom-map-state" role="status">지도를 불러오는 중입니다.</div>}
      {state === "error" && <div className="showroom-map-state is-error"><p>지도를 불러오지 못했습니다.</p><a href={mapUrl} target="_blank" rel="noreferrer">카카오맵에서 위치 확인</a></div>}
      <span className={`showroom-map-label ${state === "ready" ? "is-ready" : ""}`}>MAISON ÉLAN</span>
    </div>
  );
}
