"use client";

import {
  EmailAuthProvider,
  GoogleAuthProvider,
  User,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  setPersistence,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { createContext, useContext, useEffect, useState } from "react";
import { firebaseAuth, firestore } from "../lib/firebase";

export type MemberAddress = {
  id?: string;
  label?: string;
  isDefault?: boolean;
  recipient: string;
  phone: string;
  postalCode: string;
  addressLine1: string;
  addressLine2: string;
};

export type MemberProfile = {
  displayName: string;
  email: string;
  phone: string;
  address: MemberAddress;
  addresses: MemberAddress[];
  coupons: MemberCoupon[];
};

export type MemberCoupon = {
  id: string;
  code: string;
  name: string;
  discountType: "percent" | "fixed";
  value: number;
  maxDiscount?: number;
  minimumPurchase: number;
  issuedAt: string;
  expiresAt?: string;
  used: boolean;
  usedAt?: string;
};

export type OrderItem = {
  id: string;
  name: string;
  color: string;
  size: string;
  quantity: number;
  price: number;
  image: string;
};

export type MemberOrder = {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  courier: string;
  trackingNumber: string;
  createdAt: Date | null;
  items: OrderItem[];
  itemShipments?: ItemShipment[];
  payment?: PaymentInfo;
  shippingAddress?: MemberAddress;
};

export type PaymentInfo = {
  subtotal: number;
  discount: number;
  shippingFee: number;
  paidAmount: number;
  method: string;
  /** Toss Payments payment identifier returned after server-side approval. */
  paymentKey?: string;
  /** Merchant order ID sent to Toss Payments. */
  orderId?: string;
  /** Toss payment status, for example DONE. */
  status?: string;
  /** ISO timestamp returned by Toss Payments after approval. */
  approvedAt?: string;
  /** Customer-facing Toss receipt URL. */
  receiptUrl?: string;
  /** Easy-pay provider returned by Toss Payments, if applicable. */
  easyPayProvider?: string;
  /** Payment gateway shown in the order history. */
  provider?: string;
  cardCompany?: string;
  cardNumber?: string;
  cardLast4?: string;
  cardType?: string;
  cardOwnerType?: string;
  installmentPlanMonths?: number;
  isInterestFree?: boolean;
  couponName?: string;
  couponCode?: string;
  paidAt?: string;
};

export type ItemShipment = {
  itemIndex: number;
  status: string;
  courier: string;
  trackingNumber: string;
  estimatedDelivery?: string;
};

type NewOrder = Omit<MemberOrder, "id" | "createdAt"> & { shippingAddress: MemberAddress };

type AuthContextValue = {
  user: User | null;
  profile: MemberProfile | null;
  orders: MemberOrder[];
  loading: boolean;
  authError: string;
  signIn: (email: string, password: string, remember?: boolean) => Promise<void>;
  signUp: (name: string, phone: string, email: string, password: string, address: MemberAddress) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  saveProfile: (data: Pick<MemberProfile, "displayName" | "phone">) => Promise<void>;
  saveAddress: (address: MemberAddress) => Promise<void>;
  deleteAddress: (addressId: string) => Promise<void>;
  setDefaultAddress: (addressId: string) => Promise<void>;
  useCoupon: (couponId: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  verifyIdentity: (currentPassword?: string) => Promise<void>;
  createOrder: (order: NewOrder) => Promise<string | null>;
};

const emptyAddress: MemberAddress = { recipient: "", phone: "", postalCode: "", addressLine1: "", addressLine2: "" };
const AuthContext = createContext<AuthContextValue | null>(null);
const googleProvider = new GoogleAuthProvider();

function profileFromUser(user: User): MemberProfile {
  return { displayName: user.displayName ?? "엘란 고객", email: user.email ?? "", phone: "", address: emptyAddress, addresses: [], coupons: [] };
}

function createWelcomeCoupon(): MemberCoupon {
  const issuedAt = new Date();
  return { id: "welcome-10", code: "WELCOME10", name: "가입 기념 10% 할인", discountType: "percent", value: 10, minimumPurchase: 0, issuedAt: issuedAt.toISOString(), used: false };
}

function hasAddress(address?: MemberAddress) {
  return Boolean(address?.postalCode || address?.addressLine1 || address?.addressLine2);
}

function normalizeAddresses(saved: Partial<MemberProfile>) {
  const source = Array.isArray(saved.addresses) && saved.addresses.length
    ? saved.addresses
    : hasAddress(saved.address) ? [{ ...saved.address, label: saved.address?.label ?? "집", isDefault: true }] : [];
  const withIds = source.map((address, index) => ({
    ...emptyAddress,
    ...address,
    id: address.id || `address-${index + 1}`,
    label: address.label || (index === 0 ? "집" : `배송지 ${index + 1}`),
  }));
  const defaultIndex = Math.max(0, withIds.findIndex((address) => address.isDefault));
  return withIds.map((address, index) => ({ ...address, isDefault: index === defaultIndex }));
}

export function firebaseErrorMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  const messages: Record<string, string> = {
    "auth/email-already-in-use": "이미 가입된 이메일입니다.",
    "auth/invalid-credential": "이메일 또는 비밀번호가 올바르지 않습니다.",
    "auth/invalid-email": "이메일 형식을 확인해 주세요.",
    "auth/weak-password": "비밀번호는 6자 이상 입력해 주세요.",
    "auth/popup-closed-by-user": "Google 로그인 창이 닫혔습니다.",
    "auth/popup-blocked": "Google 로그인 창이 차단되었습니다. 브라우저의 팝업을 허용해 주세요.",
    "auth/cancelled-popup-request": "이미 Google 로그인 창이 열려 있습니다.",
    "auth/account-exists-with-different-credential": "같은 이메일로 가입된 계정이 있습니다. 이메일로 로그인한 뒤 계정을 연결해 주세요.",
    "auth/credential-already-in-use": "이미 다른 계정에서 사용 중인 Google 계정입니다.",
    "auth/invalid-oauth-client-id": "Google 로그인 설정을 확인해 주세요.",
    "auth/too-many-requests": "요청이 많습니다. 잠시 후 다시 시도해 주세요.",
    "auth/requires-recent-login": "보안을 위해 로그아웃 후 다시 로그인해 주세요.",
    "auth/wrong-password": "현재 비밀번호가 올바르지 않습니다.",
    "auth/missing-password": "현재 비밀번호를 입력해 주세요.",
    "auth/operation-not-allowed": "현재 로그인 방식이 활성화되지 않았습니다. 관리자에게 문의해 주세요.",
    "auth/network-request-failed": "Google 로그인에 연결하지 못했습니다. 앱 내 브라우저라면 Chrome 또는 Safari에서 열거나 이메일 로그인을 이용해 주세요.",
    "auth/operation-not-supported-in-this-environment": "앱 내 브라우저에서는 Google 로그인이 제한될 수 있습니다. Chrome 또는 Safari에서 열거나 이메일 로그인을 이용해 주세요.",
    "auth/web-storage-unsupported": "브라우저의 쿠키 및 사이트 데이터 사용을 허용해 주세요.",
    "auth/unauthorized-domain": "현재 접속 주소가 Google 로그인에 허용되지 않았습니다.",
  };
  return messages[code] ?? "처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [orders, setOrders] = useState<MemberOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => onAuthStateChanged(firebaseAuth, async (nextUser) => {
    setUser(nextUser);
    setOrders([]);
    if (!nextUser) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const fallback = profileFromUser(nextUser);
    setProfile(fallback);
    setLoading(false);
    try {
      const userRef = doc(firestore, "users", nextUser.uid);
      const snapshot = await getDoc(userRef);
      const newMemberProfile = { ...fallback, coupons: [createWelcomeCoupon()] };
      if (!snapshot.exists()) await setDoc(userRef, { ...newMemberProfile, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      const saved = snapshot.exists() ? snapshot.data() : newMemberProfile;
      const addresses = normalizeAddresses(saved as Partial<MemberProfile>);
      const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0] ?? emptyAddress;
      const coupons = Array.isArray(saved.coupons) ? saved.coupons as MemberCoupon[] : [createWelcomeCoupon()];
      if (snapshot.exists() && !Array.isArray(saved.coupons)) await setDoc(userRef, { coupons, updatedAt: serverTimestamp() }, { merge: true });
      const resolvedProfile = { ...fallback, ...saved, address: defaultAddress, addresses, coupons } as MemberProfile;
      setProfile(resolvedProfile);
    } catch {
      setProfile(fallback);
    }
  }), []);

  useEffect(() => {
    if (!user || !profile?.email) return;
    let syncing = false;
    const syncIssuedCoupons = async () => {
      if (syncing) return;
      syncing = true;
      try {
        type CouponIssue = { issueId: string; email: string; coupon: MemberCoupon; status: "대기" | "지급완료" };
        const issues = JSON.parse(localStorage.getItem("maison-admin-coupon-issues") || "[]") as CouponIssue[];
        const pending = issues.filter((issue) => issue.status === "대기" && issue.email.toLocaleLowerCase() === profile.email.toLocaleLowerCase());
        if (!pending.length) return;
        const issuedIds = new Set(profile.coupons.map((coupon) => coupon.id));
        const newCoupons = pending.map((issue) => issue.coupon).filter((coupon) => !issuedIds.has(coupon.id));
        const coupons = [...newCoupons, ...profile.coupons];
        if (newCoupons.length) {
          await setDoc(doc(firestore, "users", user.uid), { coupons, updatedAt: serverTimestamp() }, { merge: true });
          setProfile({ ...profile, coupons });
        }
        const completedIds = new Set(pending.map((issue) => issue.issueId));
        localStorage.setItem("maison-admin-coupon-issues", JSON.stringify(issues.map((issue) => completedIds.has(issue.issueId) ? { ...issue, status: "지급완료" } : issue)));
      } catch { /* keep pending issues for the next signed-in session */ }
      finally { syncing = false; }
    };
    void syncIssuedCoupons();
    const syncFromAdmin = () => void syncIssuedCoupons();
    window.addEventListener("maison-coupon-issued", syncFromAdmin);
    return () => window.removeEventListener("maison-coupon-issued", syncFromAdmin);
  }, [profile, user]);

  useEffect(() => {
    if (!user) return;
    const ordersQuery = query(collection(firestore, "users", user.uid, "orders"), orderBy("createdAt", "desc"));
    let refreshOrdersFromAdmin = () => {};
    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const syncOrders = () => {
        let adminOrders: Array<{ id: string; status: string; courier?: string; trackingNumber?: string; payment?: PaymentInfo; items?: Array<{ status?: string; courier?: string; trackingNumber?: string; estimatedDelivery?: string }> }> = [];
        try { adminOrders = JSON.parse(localStorage.getItem("maison-admin-orders") || "[]"); } catch { /* Firebase values are used */ }
        setOrders(snapshot.docs.map((orderDoc) => {
        const data = orderDoc.data();
        const managed = adminOrders.find((order) => order.id === data.orderNumber);
        const rawStatus = managed?.status ?? data.status;
        const statusMap: Record<string, string> = { 결제완료: "주문 접수", 출고준비: "상품 준비", 출고완료: "출고 완료", 배송중: "배송 중", 배송완료: "배송 완료", 취소: "취소", 환불완료: "환불 완료" };
        const rawItemShipments = managed?.items?.some((item) => item.status || item.trackingNumber)
          ? managed.items.map((item, itemIndex) => ({ itemIndex, status: item.status, courier: item.courier, trackingNumber: item.trackingNumber, estimatedDelivery: item.estimatedDelivery }))
          : data.itemShipments;
        const itemShipments = Array.isArray(rawItemShipments) ? rawItemShipments.map((shipment: Partial<ItemShipment>, itemIndex: number) => ({
          itemIndex: shipment.itemIndex ?? itemIndex,
          status: statusMap[shipment.status ?? ""] ?? shipment.status ?? statusMap[rawStatus] ?? rawStatus,
          courier: shipment.courier ?? managed?.courier ?? data.courier ?? "배송 준비 중",
          trackingNumber: shipment.trackingNumber ?? managed?.trackingNumber ?? data.trackingNumber ?? "-",
          estimatedDelivery: shipment.estimatedDelivery,
        })) : undefined;
        return {
          id: orderDoc.id,
          orderNumber: data.orderNumber,
          total: data.total,
          status: statusMap[rawStatus] ?? rawStatus,
          courier: managed?.courier ?? data.courier ?? "배송 준비 중",
          trackingNumber: managed?.trackingNumber ?? data.trackingNumber ?? "-",
          createdAt: data.createdAt?.toDate?.() ?? null,
          items: data.items ?? [],
          itemShipments,
          payment: data.payment ?? managed?.payment,
          shippingAddress: data.shippingAddress,
        };
        }));
      };
      refreshOrdersFromAdmin = syncOrders;
      syncOrders();
    });
    const handleStorage = (event: StorageEvent) => { if (event.key === "maison-admin-orders") refreshOrdersFromAdmin(); };
    const handleLocalUpdate = (event: Event) => { if ((event as CustomEvent<{ key: string }>).detail?.key === "maison-admin-orders") refreshOrdersFromAdmin(); };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("maison-storage-updated", handleLocalUpdate);
    return () => {
      unsubscribe();
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("maison-storage-updated", handleLocalUpdate);
    };
  }, [user]);

  const signIn = async (email: string, password: string, remember = true) => {
    setAuthError("");
    await setPersistence(firebaseAuth, remember ? browserLocalPersistence : browserSessionPersistence);
    await signInWithEmailAndPassword(firebaseAuth, email, password);
  };
  const signUp = async (name: string, phone: string, email: string, password: string, address: MemberAddress) => {
    setAuthError("");
    await setPersistence(firebaseAuth, browserLocalPersistence);
    const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    await updateProfile(credential.user, { displayName: name });
    const defaultAddress = { ...emptyAddress, ...address, id: "address-1", label: "집", isDefault: true, recipient: name, phone };
    const nextProfile = { displayName: name, email, phone, address: defaultAddress, addresses: [defaultAddress], coupons: [createWelcomeCoupon()] };
    await setDoc(doc(firestore, "users", credential.user.uid), { ...nextProfile, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    setProfile(nextProfile);
  };
  const signInWithGoogle = async () => {
    setAuthError("");
    await signInWithPopup(firebaseAuth, googleProvider, browserPopupRedirectResolver);
  };
  const resetPassword = async (email: string) => { await sendPasswordResetEmail(firebaseAuth, email); };
  const logout = async () => { await signOut(firebaseAuth); };
  const saveProfile = async (data: Pick<MemberProfile, "displayName" | "phone">) => {
    if (!user) return;
    await updateProfile(user, { displayName: data.displayName });
    await setDoc(doc(firestore, "users", user.uid), { ...data, updatedAt: serverTimestamp() }, { merge: true });
    setProfile((current) => current ? { ...current, ...data } : current);
  };
  const saveAddress = async (address: MemberAddress) => {
    if (!user) return;
    const existing = profile?.addresses ?? [];
    const addressId = address.id || globalThis.crypto?.randomUUID?.() || `address-${Date.now()}`;
    const exists = existing.some((item) => item.id === addressId);
    const shouldBeDefault = address.isDefault || existing.length === 0;
    const normalized = { ...emptyAddress, ...address, id: addressId, label: address.label?.trim() || "기타", isDefault: shouldBeDefault };
    let addresses = exists ? existing.map((item) => item.id === addressId ? normalized : item) : [...existing, normalized];
    if (shouldBeDefault) addresses = addresses.map((item) => ({ ...item, isDefault: item.id === addressId }));
    if (!addresses.some((item) => item.isDefault)) addresses = addresses.map((item, index) => ({ ...item, isDefault: index === 0 }));
    const defaultAddress = addresses.find((item) => item.isDefault) ?? addresses[0] ?? emptyAddress;
    await setDoc(doc(firestore, "users", user.uid), { addresses, address: defaultAddress, updatedAt: serverTimestamp() }, { merge: true });
    const nextProfile = profile ? { ...profile, addresses, address: defaultAddress } : null;
    setProfile(nextProfile);
  };
  const deleteAddress = async (addressId: string) => {
    if (!user || !profile) return;
    let addresses = profile.addresses.filter((address) => address.id !== addressId);
    if (addresses.length && !addresses.some((address) => address.isDefault)) addresses = addresses.map((address, index) => ({ ...address, isDefault: index === 0 }));
    const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0] ?? emptyAddress;
    await setDoc(doc(firestore, "users", user.uid), { addresses, address: defaultAddress, updatedAt: serverTimestamp() }, { merge: true });
    const nextProfile = { ...profile, addresses, address: defaultAddress };
    setProfile(nextProfile);
  };
  const setDefaultAddress = async (addressId: string) => {
    if (!user || !profile) return;
    const addresses = profile.addresses.map((address) => ({ ...address, isDefault: address.id === addressId }));
    const defaultAddress = addresses.find((address) => address.isDefault);
    if (!defaultAddress) return;
    await setDoc(doc(firestore, "users", user.uid), { addresses, address: defaultAddress, updatedAt: serverTimestamp() }, { merge: true });
    const nextProfile = { ...profile, addresses, address: defaultAddress };
    setProfile(nextProfile);
  };
  const useCoupon = async (couponId: string) => {
    if (!user || !profile) return;
    const usedAt = new Date().toISOString();
    const coupons = profile.coupons.map((coupon) => coupon.id === couponId ? { ...coupon, used: true, usedAt } : coupon);
    await setDoc(doc(firestore, "users", user.uid), { coupons, updatedAt: serverTimestamp() }, { merge: true });
    setProfile({ ...profile, coupons });
  };
  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user?.email) return;
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
    await updatePassword(user, newPassword);
  };
  const verifyIdentity = async (currentPassword = "") => {
    if (!user) return;
    const isPasswordUser = user.providerData.some((provider) => provider.providerId === "password");
    if (isPasswordUser) {
      if (!user.email || !currentPassword) throw Object.assign(new Error("비밀번호를 입력해 주세요."), { code: "auth/missing-password" });
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
      return;
    }
    await reauthenticateWithPopup(user, googleProvider, browserPopupRedirectResolver);
  };
  const createOrder = async (order: NewOrder) => {
    if (!user) return null;
    if (!/^[A-Za-z0-9_-]{8,80}$/.test(order.orderNumber)) throw new Error("invalid-order-number");
    const orderRef = doc(collection(firestore, "users", user.uid, "orders"), order.orderNumber);
    await setDoc(orderRef, { ...order, createdAt: serverTimestamp() });
    return orderRef.id;
  };

  const value = { user, profile, orders, loading, authError, signIn, signUp, signInWithGoogle, resetPassword, logout, saveProfile, saveAddress, deleteAddress, setDefaultAddress, useCoupon, changePassword, verifyIdentity, createOrder };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
