export type ProductColor = {
  name: string;
  hex: string;
  image: string;
  details?: string[];
};

export type Product = {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  questionCount: number;
  category: "Outer" | "Dresses" | "Tops" | "Knitwear" | "Bottoms";
  image: string;
  secondaryImage: string;
  label?: string;
  colors: ProductColor[];
  sizes: string[];
  description: string;
  material: string;
  fit: string;
};

export const products: Product[] = [
  {
    id: "sculpted-wool-jacket",
    name: "Sculpted Wool Jacket",
    price: 428000,
    rating: 4.8,
    reviewCount: 18,
    questionCount: 5,
    category: "Outer",
    image: "/products/sculpted-wool-jacket-ink-black.png",
    secondaryImage: "/products/sculpted-wool-jacket-warm-sand.png",
    label: "NEW",
    colors: [
      { name: "Ink Black", hex: "#171514", image: "/products/sculpted-wool-jacket-ink-black.png", details: ["/products/sculpted-wool-jacket-black-lapel-detail.png", "/products/sculpted-wool-jacket-black-cuff-detail.png"] },
      { name: "Warm Sand", hex: "#b8a795", image: "/products/sculpted-wool-jacket-warm-sand.png", details: ["/products/sculpted-wool-jacket-sand-lapel-detail.png", "/products/sculpted-wool-jacket-sand-cuff-detail.png"] },
    ],
    sizes: ["XS", "S", "M", "L"],
    description: "부드럽게 굴곡진 숄더와 정교한 허리선을 담은 울 재킷입니다. 가벼운 구조감이 실루엣을 선명하게 완성합니다.",
    material: "울 82%, 캐시미어 12%, 나일론 6%",
    fit: "레귤러 핏 · 모델 176cm, S 사이즈 착용",
  },
  {
    id: "soft-draped-dress",
    name: "Soft Draped Dress",
    price: 319000,
    originalPrice: 369000,
    rating: 4.9,
    reviewCount: 24,
    questionCount: 7,
    category: "Dresses",
    image: "/products/soft-draped-dress-oat.png",
    secondaryImage: "/products/soft-draped-dress-black.png",
    label: "SALE",
    colors: [
      { name: "Oat", hex: "#d8cbb9", image: "/products/soft-draped-dress-oat.png" },
      { name: "Oxblood", hex: "#541a27", image: "/products/soft-draped-dress-oxblood.png" },
      { name: "Black", hex: "#191817", image: "/products/soft-draped-dress-black.png" },
    ],
    sizes: ["XS", "S", "M"],
    description: "움직임을 따라 유연하게 흐르는 드레이프 드레스입니다. 절제된 네크라인과 비대칭 헴이 우아한 균형을 만듭니다.",
    material: "비스코스 74%, 실크 26%",
    fit: "슬림 핏 · 모델 174cm, S 사이즈 착용",
  },
  {
    id: "sheer-silk-blouse",
    name: "Fluid Silk Blouse",
    price: 276000,
    rating: 4.7,
    reviewCount: 13,
    questionCount: 3,
    category: "Tops",
    image: "/products/fluid-silk-blouse-pearl.png",
    secondaryImage: "/products/fluid-silk-blouse-espresso.png",
    label: "NEW",
    colors: [
      { name: "Pearl", hex: "#eee6d9", image: "/products/fluid-silk-blouse-pearl.png" },
      { name: "Espresso", hex: "#44332d", image: "/products/fluid-silk-blouse-espresso.png" },
    ],
    sizes: ["S", "M", "L"],
    description: "유연한 드레이프와 은은한 광택이 조화를 이루는 실크 블라우스입니다. 단독으로도 레이어드로도 편안하게 이어집니다.",
    material: "실크 100%",
    fit: "릴랙스드 핏 · 모델 175cm, S 사이즈 착용",
  },
  {
    id: "essential-column-skirt",
    name: "Essential Column Skirt",
    price: 248000,
    rating: 4.9,
    reviewCount: 31,
    questionCount: 6,
    category: "Bottoms",
    image: "/products/essential-column-skirt-stone.png",
    secondaryImage: "/products/essential-column-skirt-black.png",
    label: "BEST",
    colors: [
      { name: "Stone", hex: "#aaa095", image: "/products/essential-column-skirt-stone.png" },
      { name: "Black", hex: "#171615", image: "/products/essential-column-skirt-black.png" },
      { name: "Ivory", hex: "#e9e2d5", image: "/products/essential-column-skirt-ivory.png" },
    ],
    sizes: ["XS", "S", "M", "L"],
    description: "간결한 세로선과 깊은 뒷슬릿이 특징인 컬럼 스커트입니다. 밀도 높은 소재가 흐트러짐 없는 실루엣을 유지합니다.",
    material: "울 58%, 레이온 39%, 폴리우레탄 3%",
    fit: "하이웨이스트 슬림 핏 · 모델 176cm, S 사이즈 착용",
  },
  {
    id: "cashmere-wrap-knit",
    name: "Cashmere Wrap Knit",
    price: 298000,
    rating: 4.8,
    reviewCount: 9,
    questionCount: 2,
    category: "Knitwear",
    image: "/products/cashmere-wrap-knit-camel.png",
    secondaryImage: "/products/cashmere-wrap-knit-cream.png",
    colors: [
      { name: "Camel", hex: "#a27d60", image: "/products/cashmere-wrap-knit-camel.png" },
      { name: "Cream", hex: "#ded3c1", image: "/products/cashmere-wrap-knit-cream.png" },
    ],
    sizes: ["S", "M"],
    description: "캐시미어의 가벼운 촉감과 랩 구조가 만난 니트입니다. 끈의 위치에 따라 다양한 실루엣으로 연출됩니다.",
    material: "캐시미어 70%, 메리노 울 30%",
    fit: "레귤러 핏 · 모델 175cm, S 사이즈 착용",
  },
  {
    id: "tailored-wide-trousers",
    name: "Tailored Wide Trousers",
    price: 259000,
    rating: 4.7,
    reviewCount: 16,
    questionCount: 4,
    category: "Bottoms",
    image: "/products/tailored-wide-trousers-taupe.png",
    secondaryImage: "/products/tailored-wide-trousers-midnight.png",
    label: "NEW",
    colors: [
      { name: "Taupe", hex: "#82756a", image: "/products/tailored-wide-trousers-taupe.png" },
      { name: "Midnight", hex: "#22252b", image: "/products/tailored-wide-trousers-midnight.png" },
    ],
    sizes: ["XS", "S", "M", "L"],
    description: "허리에서 발끝까지 길게 떨어지는 와이드 트라우저입니다. 미세한 광택의 울 혼방 소재로 완성했습니다.",
    material: "울 68%, 폴리에스터 29%, 폴리우레탄 3%",
    fit: "하이웨이스트 와이드 핏 · 모델 176cm, S 사이즈 착용",
  },
  {
    id: "asymmetric-satin-top",
    name: "Asymmetric Satin Top",
    price: 189000,
    originalPrice: 229000,
    rating: 4.8,
    reviewCount: 22,
    questionCount: 5,
    category: "Tops",
    image: "/products/asymmetric-satin-top-silver.png",
    secondaryImage: "/products/asymmetric-satin-top-wine.png",
    label: "SALE",
    colors: [
      { name: "Silver", hex: "#b8b7b3", image: "/products/asymmetric-satin-top-silver.png" },
      { name: "Wine", hex: "#672433", image: "/products/asymmetric-satin-top-wine.png" },
    ],
    sizes: ["XS", "S", "M"],
    description: "사선으로 흐르는 네크라인과 새틴의 은은한 빛이 돋보이는 탑입니다. 재킷 안에서도 선명한 포인트가 됩니다.",
    material: "아세테이트 81%, 폴리에스터 19%",
    fit: "슬림 핏 · 모델 174cm, S 사이즈 착용",
  },
  {
    id: "double-faced-coat",
    name: "Double Faced Coat",
    price: 689000,
    rating: 4.9,
    reviewCount: 11,
    questionCount: 3,
    category: "Outer",
    image: "/products/double-faced-coat-charcoal.png",
    secondaryImage: "/products/double-faced-coat-mushroom.png",
    label: "LIMITED",
    colors: [
      { name: "Charcoal", hex: "#41403e", image: "/products/double-faced-coat-charcoal.png" },
      { name: "Mushroom", hex: "#9d8d80", image: "/products/double-faced-coat-mushroom.png" },
    ],
    sizes: ["S", "M", "L"],
    description: "두 겹의 울 캐시미어를 손으로 봉제한 더블 페이스 코트입니다. 가볍지만 따뜻하며 자연스러운 볼륨을 만듭니다.",
    material: "울 85%, 캐시미어 15%",
    fit: "오버사이즈 핏 · 모델 177cm, S 사이즈 착용",
  },
];

export const formatPrice = (price: number) => `₩${price.toLocaleString("ko-KR")}`;

export const getProduct = (id: string) => {
  if (typeof window !== "undefined") {
    try {
      const managed = JSON.parse(localStorage.getItem("maison-admin-products") || "[]") as Product[];
      const runtimeProduct = managed.find((product) => product.id === id);
      if (runtimeProduct) return runtimeProduct;
    } catch { /* use the bundled catalog */ }
  }
  return products.find((product) => product.id === id) ?? products[0];
};
