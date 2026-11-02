import type { NavigatorScreenParams } from '@react-navigation/native';
import type { Program } from '../data/mockData';

export type RootStackParamList = {
  Login: undefined;
  // google: set when coming from "Continue with Google" for a new account.
  Register: { google?: { name: string; email: string } } | undefined;
  PdpaNotice: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  ProgramDetail: { programId: string };
  AddProgram: undefined;
  ProfileEdit: undefined;
  Notifications: undefined;
  Settings: undefined;
  AdminPanel: undefined;
  BankAccountSettings: { feeType: 'yuran' | 'khairat' };
  ManageFeeItems: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Programs: { category?: Program['category'] } | undefined;
  Payments: undefined;
  Charity: undefined;
  Committee: undefined;
  Collections: undefined;
  Profile: undefined;
};
