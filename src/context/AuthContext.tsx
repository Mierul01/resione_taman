import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updatePassword as firebaseUpdatePassword,
  deleteUser,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db, getSecondaryAuth, rememberMePersistence, sessionOnlyPersistence } from '../firebase/config';

export type FamilyMember = {
  id: string;
  name: string;
  relationship: string;
  age?: string;
  linkedEmail?: string;
};

export type Role = 'resident' | 'ajk' | 'treasurer' | 'chairman' | 'admin';

export type Park = {
  id: string;
  name: string;
  state?: string;
  district?: string;
  city?: string;
};

export type Household = {
  id: string;
  parkId: string;
  parkName: string;
  houseNo: string;
  ownerEmail: string;
  ownerName: string;
};

export type User = {
  name: string;
  email: string;
  phone: string;
  address: string;
  postcode: string;
  city: string;
  district: string;
  state: string;
  parkId: string;
  parkName: string;
  houseNo: string;
  isHouseholdOwner?: boolean;
  familyMembers: FamilyMember[];
  role: Role;
  dependentOf?: string;
  avatarUri?: string;
};

export type ProfileUpdate = Pick<User, 'name' | 'phone' | 'address' | 'postcode' | 'city' | 'district' | 'state'>;

export type RegisterData = Omit<
  User,
  'familyMembers' | 'role' | 'parkId' | 'parkName' | 'houseNo' | 'isHouseholdOwner'
> & {
  password: string;
  houseNo: string;
  // Either an existing park the visitor searched for and picked, or the
  // details of a brand-new one to create (created at submit time, once an
  // auth account exists to own the write).
  park: { id: string; name: string } | { newName: string };
};

export type RegisterResult = { success: boolean; messageKey?: string; ownerName?: string };

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (
    email: string,
    password: string,
    rememberMe?: boolean
  ) => Promise<{ success: boolean; messageKey?: string }>;
  register: (data: RegisterData) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateProfile: (updates: ProfileUpdate) => Promise<void>;
  updateAvatar: (avatarUri: string | undefined) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  addFamilyMember: (member: Omit<FamilyMember, 'linkedEmail'>) => Promise<void>;
  removeFamilyMember: (id: string) => Promise<void>;
  addFamilyMemberWithLogin: (
    member: Omit<FamilyMember, 'linkedEmail'>,
    login: { email: string; password: string }
  ) => Promise<{ success: boolean; messageKey?: string }>;
  getParkUsers: (parkName: string) => Promise<User[]>;
  setUserRole: (email: string, role: Role) => Promise<{ success: boolean; messageKey?: string }>;
  searchParks: (queryText: string) => Promise<Park[]>;
  checkHousehold: (parkId: string, houseNo: string) => Promise<Household | null>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const usersCol = collection(db, 'users');
const parksCol = collection(db, 'parks');
const householdsCol = collection(db, 'households');

const SUPER_ADMIN_EMAILS = ['mamirulaimanz01@gmail.com'];

function normalize(u: any): User {
  const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(String(u.email).toLowerCase());
  return {
    ...u,
    familyMembers: u.familyMembers ?? [],
    role: isSuperAdmin ? 'admin' : u.role ?? 'resident',
    parkId: u.parkId ?? '',
    parkName: u.parkName ?? '',
    houseNo: u.houseNo ?? '',
    district: u.district ?? '',
    state: u.state ?? '',
  };
}

// House numbers are free-typed, so "a-12-03", "A-12-03 " and "A - 12 - 03"
// should all collide with the same household rather than silently creating
// duplicates.
function normalizeHouseNo(houseNo: string): string {
  return houseNo.trim().toUpperCase().replace(/\s*-\s*/g, '-').replace(/\s+/g, ' ');
}

function householdDocId(parkId: string, houseNo: string): string {
  return `${parkId}_${encodeURIComponent(normalizeHouseNo(houseNo))}`;
}

// Thrown from inside the registration transaction when the house was
// claimed by someone else between the pre-check and the write — lets
// register() tell the two failure paths apart without string-matching.
class HouseTakenError extends Error {
  ownerName: string;
  constructor(ownerName: string) {
    super('house-taken');
    this.ownerName = ownerName;
  }
}

async function findOrCreatePark(input: { name: string; state?: string; district?: string; city?: string }): Promise<Park> {
  const trimmed = input.name.trim();
  const id = encodeURIComponent(trimmed);
  const ref = doc(db, 'parks', id);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    return { id, name: data.name, state: data.state, district: data.district, city: data.city };
  }
  const park = {
    name: trimmed,
    nameLower: trimmed.toLowerCase(),
    state: input.state ?? '',
    district: input.district ?? '',
    city: input.city ?? '',
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, park);
  return { id, ...park };
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
        setUser(snap.exists() ? normalize(snap.data()) : null);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const login = async (email: string, password: string, rememberMe = true) => {
    try {
      await setPersistence(auth, rememberMe ? rememberMePersistence : sessionOnlyPersistence);
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const snap = await getDoc(doc(db, 'users', cred.user.uid));
      if (!snap.exists()) {
        return { success: false, messageKey: 'common.loginFailed' };
      }
      setUser(normalize(snap.data()));
      return { success: true };
    } catch (err: any) {
      console.error('login failed:', err?.code ?? err);
      return { success: false, messageKey: 'common.loginFailed' };
    }
  };

  const register = async (data: RegisterData): Promise<RegisterResult> => {
    // A house in an existing park can already be claimed by someone else —
    // check before creating any auth account so a doomed registration never
    // leaves an orphaned login. A brand-new park obviously has no households
    // yet, so this only applies when joining one that already exists.
    if ('id' in data.park) {
      const existing = await getDoc(doc(db, 'households', householdDocId(data.park.id, data.houseNo)));
      if (existing.exists()) {
        return { success: false, messageKey: 'register.houseTaken', ownerName: existing.data().ownerName };
      }
    }

    let cred: any;
    try {
      // A previous login with "remember me" unchecked leaves the auth
      // instance in session-only mode; new accounts should always persist.
      await setPersistence(auth, rememberMePersistence);
      const emailTrimmed = data.email.trim();
      cred = await createUserWithEmailAndPassword(auth, emailTrimmed, data.password);

      const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(emailTrimmed.toLowerCase());
      let park: Park;
      let isNewPark = false;
      if ('id' in data.park) {
        park = data.park;
      } else {
        // Only authenticated writes may create a park doc, so this happens
        // now rather than while the visitor was still picking one.
        park = await findOrCreatePark({
          name: (data.park as { newName: string }).newName,
          state: data.state,
          district: data.district,
          city: data.city,
        });
        isNewPark = true;
      }

      let isFirstInPark = isNewPark;
      if (!isFirstInPark) {
        const parkSnap = await getDocs(query(usersCol, where('parkId', '==', park.id), limit(1)));
        isFirstInPark = parkSnap.empty;
      }

      const houseNo = normalizeHouseNo(data.houseNo);
      const newUser: User = {
        name: data.name,
        email: emailTrimmed,
        phone: data.phone,
        address: data.address,
        postcode: data.postcode,
        city: data.city,
        district: data.district,
        state: data.state,
        parkId: park.id,
        parkName: park.name,
        houseNo,
        isHouseholdOwner: true,
        familyMembers: [],
        role: isFirstInPark || isSuperAdmin ? 'admin' : 'resident',
      };

      const houseRef = doc(db, 'households', householdDocId(park.id, houseNo));
      const userRef = doc(db, 'users', cred.user.uid);
      await runTransaction(db, async (tx) => {
        const houseSnap = await tx.get(houseRef);
        if (houseSnap.exists()) {
          throw new HouseTakenError(houseSnap.data().ownerName);
        }
        tx.set(houseRef, {
          parkId: park.id,
          parkName: park.name,
          houseNo,
          ownerEmail: emailTrimmed,
          ownerName: data.name,
          createdAt: serverTimestamp(),
        });
        tx.set(userRef, newUser);
      });

      setUser(normalize(newUser));
      return { success: true };
    } catch (err: any) {
      console.error('register failed:', err?.code ?? err);
      // Don't leave a login with no profile behind — either the house was
      // claimed by someone else mid-flow, or some other step failed.
      if (cred) await deleteUser(cred.user).catch(() => {});
      if (err instanceof HouseTakenError) {
        return { success: false, messageKey: 'register.houseTaken', ownerName: err.ownerName };
      }
      if (err?.code === 'auth/email-already-in-use') {
        return { success: false, messageKey: 'common.emailTaken' };
      }
      return { success: false, messageKey: 'register.failed' };
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const deleteAccount = async () => {
    if (!auth.currentUser) return;
    await deleteDoc(doc(db, 'users', auth.currentUser.uid));
    await deleteUser(auth.currentUser);
    setUser(null);
  };

  const persistUser = async (updated: User) => {
    if (!auth.currentUser) return;
    setUser(updated);
    await updateDoc(doc(db, 'users', auth.currentUser.uid), { ...updated });
  };

  const updateProfile = async (updates: ProfileUpdate) => {
    if (!user) return;
    await persistUser({ ...user, ...updates });
  };

  const updateAvatar = async (avatarUri: string | undefined) => {
    if (!user) return;
    await persistUser({ ...user, avatarUri });
  };

  const changePassword = async (newPassword: string) => {
    if (!auth.currentUser) return;
    await firebaseUpdatePassword(auth.currentUser, newPassword);
  };

  const addFamilyMember = async (member: Omit<FamilyMember, 'linkedEmail'>) => {
    if (!user) return;
    await persistUser({ ...user, familyMembers: [...user.familyMembers, { ...member }] });
  };

  const removeFamilyMember = async (id: string) => {
    if (!user) return;
    await persistUser({
      ...user,
      familyMembers: user.familyMembers.filter((m) => m.id !== id),
    });
  };

  const addFamilyMemberWithLogin = async (
    member: Omit<FamilyMember, 'linkedEmail'>,
    login: { email: string; password: string }
  ) => {
    if (!user) return { success: false, messageKey: 'common.loginFailed' };
    try {
      const secondaryAuth = getSecondaryAuth();
      const emailTrimmed = login.email.trim();
      const cred = await createUserWithEmailAndPassword(secondaryAuth, emailTrimmed, login.password);

      const dependentProfile: User = {
        name: member.name,
        email: emailTrimmed,
        phone: user.phone,
        address: user.address,
        postcode: user.postcode,
        city: user.city,
        district: user.district,
        state: user.state,
        parkId: user.parkId,
        parkName: user.parkName,
        houseNo: user.houseNo,
        isHouseholdOwner: false,
        familyMembers: [],
        role: 'resident',
        dependentOf: user.email,
      };
      await setDoc(doc(db, 'users', cred.user.uid), dependentProfile);
      await signOut(secondaryAuth);

      const newMember: FamilyMember = { ...member, linkedEmail: dependentProfile.email };
      await persistUser({ ...user, familyMembers: [...user.familyMembers, newMember] });
      return { success: true };
    } catch (err: any) {
      console.error('addFamilyMemberWithLogin failed:', err?.code ?? err);
      if (err?.code === 'auth/email-already-in-use') {
        return { success: false, messageKey: 'common.emailTaken' };
      }
      return { success: false, messageKey: 'profile.memberCreateFailed' };
    }
  };

  const getParkUsers = async (parkName: string): Promise<User[]> => {
    const snap = await getDocs(query(usersCol, where('parkName', '==', parkName)));
    return snap.docs.map((d) => normalize(d.data()));
  };

  const setUserRole = async (email: string, role: Role) => {
    const snap = await getDocs(query(usersCol, where('email', '==', email), limit(1)));
    if (snap.empty) return { success: false };
    const target = normalize(snap.docs[0].data());

    if (target.role === 'admin' && role !== 'admin') {
      const parkAdmins = await getDocs(
        query(usersCol, where('parkId', '==', target.parkId), where('role', '==', 'admin'))
      );
      if (parkAdmins.size <= 1) {
        return { success: false, messageKey: 'adminPanel.lastAdminError' };
      }
    }

    try {
      await updateDoc(snap.docs[0].ref, { role });
    } catch (e: any) {
      if (e?.code === 'permission-denied') {
        return { success: false, messageKey: 'adminPanel.permissionDenied' };
      }
      throw e;
    }
    if (user && user.email.toLowerCase() === email.toLowerCase()) {
      setUser({ ...user, role });
    }
    return { success: true };
  };

  const searchParks = async (queryText: string): Promise<Park[]> => {
    const q = queryText.trim().toLowerCase();
    const base = q
      ? query(parksCol, orderBy('nameLower'), where('nameLower', '>=', q), where('nameLower', '<=', q + ''), limit(25))
      : query(parksCol, orderBy('nameLower'), limit(25));
    const snap = await getDocs(base);
    return snap.docs.map((d) => {
      const data = d.data();
      return { id: d.id, name: data.name, state: data.state, district: data.district, city: data.city };
    });
  };

  const checkHousehold = async (parkId: string, houseNo: string): Promise<Household | null> => {
    if (!houseNo.trim()) return null;
    const snap = await getDoc(doc(db, 'households', householdDocId(parkId, houseNo)));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<Household, 'id'>) };
  };

  const value = useMemo(
    () => ({
      user,
      isLoading,
      login,
      register,
      logout,
      deleteAccount,
      updateProfile,
      updateAvatar,
      changePassword,
      addFamilyMember,
      removeFamilyMember,
      addFamilyMemberWithLogin,
      getParkUsers,
      setUserRole,
      searchParks,
      checkHousehold,
    }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
