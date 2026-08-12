type KakaoPostcodeResult = {
  zonecode: string;
  userSelectedType: "R" | "J";
  address: string;
  roadAddress: string;
  jibunAddress: string;
  autoRoadAddress: string;
  autoJibunAddress: string;
  bname: string;
  buildingName: string;
  apartment: "Y" | "N";
};

type KakaoPostcodeConstructor = new (options: {
  oncomplete: (data: KakaoPostcodeResult) => void;
  onresize?: (size: { height: number }) => void;
  width?: string;
  height?: string;
  maxSuggestItems?: number;
  autoMapping?: boolean;
  shorthand?: boolean;
  hideMapBtn?: boolean;
  hideEngBtn?: boolean;
}) => { embed: (element: HTMLElement) => void };

type KakaoMapsApi = {
  load: (callback: () => void) => void;
  LatLng: new (latitude: number, longitude: number) => unknown;
  Map: new (container: HTMLElement, options: { center: unknown; level: number }) => { addControl: (control: unknown, position: unknown) => void };
  Marker: new (options: { map: unknown; position: unknown; title: string }) => unknown;
  ZoomControl: new () => unknown;
  ControlPosition: { RIGHT: unknown };
};

type KakaoBrowserNamespace = {
  Postcode?: KakaoPostcodeConstructor;
  maps?: KakaoMapsApi;
};

interface Window {
  daum?: { Postcode?: KakaoPostcodeConstructor };
  kakao?: KakaoBrowserNamespace;
}
