'use client';
import { createContext, useContext } from 'react';
import { defaultSettings, type Settings } from '@/lib/settings';
const SettingsContext=createContext<Settings>(defaultSettings);
/** Makes the owner's general settings available to every private screen (demo pages use the defaults). */
export function SettingsProvider({settings,children}:{settings:Settings;children:React.ReactNode}){return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;}
export const useSettings=()=>useContext(SettingsContext);
